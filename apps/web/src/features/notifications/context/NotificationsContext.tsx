import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth-user";
import { authStorage } from "@/lib/api/client";
import {
  connectNotificationsStream,
  getNotificationFeedApi,
  getUnreadNotificationCountsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  resolveNotificationDisplay,
  type Notification,
} from "../services/notifications.api";

interface NotificationsContextType {
  notifications: Notification[];
  pendingTasks: Notification[];
  unreadCount: number;
  unreadTaskCount: number;
  isLoading: boolean;
  isLoadingOlder: boolean;
  hasMore: boolean;
  isLive: boolean;
  isReconnecting: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadOlder: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface NotificationState {
  byId: Map<string, Notification>;
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingOlder: boolean;
  unreadCount: number;
  unreadTaskCount: number;
  isLive: boolean;
  sseFailures: number;
}

const INITIAL_STATE: NotificationState = {
  byId: new Map(),
  nextCursor: null,
  isLoading: false,
  isLoadingOlder: false,
  unreadCount: 0,
  unreadTaskCount: 0,
  isLive: false,
  sseFailures: 0,
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function upsert(byId: Map<string, Notification>, items: Notification[]) {
  const next = new Map(byId);
  for (const item of items) next.set(item.id, item);
  return next;
}

function sortedNotifications(byId: Map<string, Notification>) {
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id),
  );
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const [token, setToken] = useState(() => authStorage.getToken());
  const isAuthenticated = Boolean(
    token && token !== "undefined" && token !== "null" && authUser?.id,
  );
  const [state, setState] = useState<NotificationState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Token changes can happen without a user change (refresh, revocation, or a
  // different tab). The SSE effect below must recreate its EventSource then.
  useEffect(() => {
    const syncToken = () => setToken(authStorage.getToken());
    const onStorage = (event: StorageEvent) => {
      if (event.key === "vortex_auth_token") syncToken();
    };
    window.addEventListener("vortex-auth-change", syncToken);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("vortex-auth-change", syncToken);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const refreshUnreadCounts = useCallback(async () => {
    const counts = await getUnreadNotificationCountsApi();
    setState((current) => ({
      ...current,
      unreadCount: counts.unread,
      unreadTaskCount: counts.tasks,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setState((current) => ({ ...current, isLoading: true }));
    try {
      const [feed, counts] = await Promise.all([
        getNotificationFeedApi(),
        getUnreadNotificationCountsApi(),
      ]);
      setState((current) => ({
        ...current,
        byId: upsert(current.byId, feed.items),
        nextCursor: feed.nextCursor,
        unreadCount: counts.unread,
        unreadTaskCount: counts.tasks,
        isLoading: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, isLoading: false }));
      throw error;
    }
  }, [isAuthenticated]);

  const loadOlder = useCallback(async () => {
    const cursor = stateRef.current.nextCursor;
    if (!isAuthenticated || !cursor || stateRef.current.isLoadingOlder) return;
    setState((current) => ({ ...current, isLoadingOlder: true }));
    try {
      const feed = await getNotificationFeedApi(50, cursor);
      setState((current) => ({
        ...current,
        byId: upsert(current.byId, feed.items),
        nextCursor: feed.nextCursor,
        isLoadingOlder: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, isLoadingOlder: false, nextCursor: null }));
      if ((error as { status?: number }).status === 400) {
        void refresh().catch(() => undefined);
        return;
      }
      toast.error("Unable to load older notifications");
    }
  }, [isAuthenticated, refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      const previous = stateRef.current.byId.get(id);
      if (!previous || previous.readAt) return;
      const optimisticReadAt = new Date().toISOString();
      const optimistic = { ...previous, readAt: optimisticReadAt };
      setState((current) => ({ ...current, byId: upsert(current.byId, [optimistic]) }));
      try {
        const updated = await markNotificationReadApi(id);
        setState((current) => ({ ...current, byId: upsert(current.byId, [updated]) }));
        await refreshUnreadCounts();
      } catch (error) {
        setState((current) => {
          const currentNotification = current.byId.get(id);
          if (currentNotification?.readAt !== optimisticReadAt) return current;
          return { ...current, byId: upsert(current.byId, [previous]) };
        });
        toast.error("Notification could not be marked as read");
      }
    },
    [refreshUnreadCounts],
  );

  const markAllRead = useCallback(async () => {
    const changedAt = new Date().toISOString();
    const originalReadAt = new Map<string, string | null>();
    const optimistic = new Map(stateRef.current.byId);
    for (const [id, notification] of optimistic) {
      if (!notification.readAt) {
        originalReadAt.set(id, notification.readAt);
        optimistic.set(id, { ...notification, readAt: changedAt });
      }
    }
    setState((current) => ({ ...current, byId: optimistic }));
    try {
      const updated = await markAllNotificationsReadApi();
      setState((current) => ({ ...current, byId: upsert(current.byId, updated) }));
      await refreshUnreadCounts();
      toast.success("All notifications marked as read");
    } catch (error) {
      setState((current) => {
        const byId = new Map(current.byId);
        for (const [id, readAt] of originalReadAt) {
          const notification = byId.get(id);
          if (notification?.readAt === changedAt) byId.set(id, { ...notification, readAt });
        }
        return { ...current, byId };
      });
      toast.error("Notifications could not be marked as read");
    }
  }, [refreshUnreadCounts]);

  // A login/user change owns a fresh store. Keeping a previous user's data in
  // memory would expose it briefly before the next feed request completes.
  useEffect(() => {
    if (!isAuthenticated) {
      setState(INITIAL_STATE);
      return;
    }
    setState(INITIAL_STATE);
    void refresh().catch(() => undefined);
  }, [authUser?.id, isAuthenticated, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh().catch(() => undefined);
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const disconnect = connectNotificationsStream({
      onNotification: (notification) => {
        const isNew = !stateRef.current.byId.has(notification.id);
        setState((current) => ({
          ...current,
          byId: upsert(current.byId, [notification]),
          isLive: true,
        }));
        void refreshUnreadCounts().catch(() => undefined);
        if (isNew) {
          const display = resolveNotificationDisplay(notification);
          toast.message(display.title, {
            description: notification.message,
            action: display.linkTo
              ? { label: "View", onClick: () => navigate({ to: display.linkTo as never }) }
              : undefined,
          });
        }
      },
      onOpen: () => {
        setState((current) => ({ ...current, isLive: true, sseFailures: 0 }));
        void refresh().catch(() => undefined);
      },
      onError: () => {
        setState((current) => ({
          ...current,
          isLive: false,
          sseFailures: current.sseFailures + 1,
        }));
      },
    });
    return disconnect;
  }, [isAuthenticated, navigate, refresh, refreshUnreadCounts, token]);

  const notifications = useMemo(() => sortedNotifications(state.byId), [state.byId]);
  const pendingTasks = useMemo(
    () => notifications.filter((notification) => notification.isTask && !notification.readAt),
    [notifications],
  );
  const value = useMemo<NotificationsContextType>(
    () => ({
      notifications,
      pendingTasks,
      unreadCount: state.unreadCount,
      unreadTaskCount: state.unreadTaskCount,
      isLoading: state.isLoading,
      isLoadingOlder: state.isLoadingOlder,
      hasMore: Boolean(state.nextCursor),
      isLive: state.isLive,
      isReconnecting: !state.isLive && state.sseFailures >= 2,
      markAsRead,
      markAllRead,
      loadOlder,
      refresh,
    }),
    [loadOlder, markAllRead, markAsRead, notifications, pendingTasks, refresh, state],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within a NotificationsProvider");
  return context;
}
