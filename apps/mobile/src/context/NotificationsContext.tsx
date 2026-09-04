import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { authStorage } from "@/lib/api/client";
import {
  connectNotificationsStream,
  getNotificationFeedApi,
  getPushNotificationLinkTo,
  getUnreadNotificationCountsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  registerNotificationDeviceApi,
} from "@/services/notifications-api";
import type { Notification } from "@/types/domain";
import { to } from "@/utils/routes";

interface NotificationsContextType {
  notifications: Notification[];
  pendingTasks: Notification[];
  unreadCount: number;
  unreadTaskCount: number;
  isLoading: boolean;
  isLive: boolean;
  hasMore: boolean;
  isLoadingOlder: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadOlder: () => Promise<void>;
  refetch: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function upsert(current: Map<string, Notification>, items: Notification[]) {
  const next = new Map(current);
  items.forEach((item) => next.set(item.id, item));
  return next;
}

function getExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    { eas?: { projectId?: string }; expoProjectId?: string } | undefined;
  return Constants.easConfig?.projectId || extra?.eas?.projectId || extra?.expoProjectId;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authUser } = useAppContext();
  const [byId, setById] = useState<Map<string, Notification>>(new Map());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const handledPushResponseIds = useRef(new Set<string>());
  cursorRef.current = nextCursor;

  const feedQuery = useQuery({
    queryKey: ["notifications", "feed", authUser?.id],
    queryFn: () => getNotificationFeedApi(),
    enabled: isAuthenticated,
    refetchOnReconnect: true,
  });
  const countsQuery = useQuery({
    queryKey: ["notifications", "unread-count", authUser?.id],
    queryFn: getUnreadNotificationCountsApi,
    enabled: isAuthenticated,
    refetchOnReconnect: true,
  });
  const refreshFeed = feedQuery.refetch;
  const refreshCounts = countsQuery.refetch;

  useEffect(() => {
    if (!isAuthenticated) {
      setById(new Map());
      setNextCursor(null);
      setIsLive(false);
      return;
    }
    setById(new Map());
    void refreshFeed();
    void refreshCounts();
  }, [authUser?.id, isAuthenticated, refreshCounts, refreshFeed]);

  useEffect(() => {
    if (!feedQuery.data) return;
    setById((current) => upsert(current, feedQuery.data.items));
    setNextCursor(feedQuery.data.nextCursor);
  }, [feedQuery.data]);

  const refetch = useCallback(() => {
    void refreshFeed();
    void refreshCounts();
  }, [refreshCounts, refreshFeed]);

  const loadOlder = useCallback(async () => {
    const cursor = cursorRef.current;
    if (!cursor || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const page = await getNotificationFeedApi(50, cursor);
      setById((current) => upsert(current, page.items));
      setNextCursor(page.nextCursor);
    } catch (error) {
      if ((error as { status?: number }).status === 400) refetch();
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, refetch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") refetch();
    });
    return () => subscription.remove();
  }, [isAuthenticated, refetch]);

  useEffect(() => {
    // Importing expo-notifications eagerly is unsafe in Android Expo Go. Its
    // auto-registration module installs a push-token listener at import time,
    // and remote push notifications are intentionally unavailable there.
    if (!isAuthenticated || Platform.OS === "web" || Constants.appOwnership === "expo") return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;
    const registerDeviceToken = (deviceToken: { data: string }) => {
      if (
        cancelled ||
        typeof deviceToken.data !== "string" ||
        (Platform.OS !== "ios" && Platform.OS !== "android")
      )
        return;
      void registerNotificationDeviceApi(Platform.OS, deviceToken.data).catch(() => undefined);
    };
    void import("expo-notifications")
      .then(async (Notifications) => {
        if (cancelled) return;
        const openNotification = (response: {
          notification: { request: { content: { data?: unknown } } };
        }) => {
          const data = response.notification.request.content.data;
          const notificationId =
            data && typeof data === "object"
              ? (data as Record<string, unknown>).notificationId
              : undefined;
          if (
            typeof notificationId === "string" &&
            handledPushResponseIds.current.has(notificationId)
          )
            return;
          const path = getPushNotificationLinkTo(data);
          if (!path) return;
          if (typeof notificationId === "string") {
            handledPushResponseIds.current.add(notificationId);
          }
          router.push(to(path));
        };
        subscription = Notifications.addPushTokenListener(registerDeviceToken);
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener(openNotification);
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (!cancelled && lastResponse) openNotification(lastResponse);
        const current = await Notifications.getPermissionsAsync();
        const permission = current.granted
          ? current
          : await Notifications.requestPermissionsAsync();
        if (!permission.granted || cancelled) return;
        const projectId = getExpoProjectId();
        const token = projectId
          ? await Notifications.getExpoPushTokenAsync({ projectId })
          : await Notifications.getExpoPushTokenAsync();
        registerDeviceToken(token);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
      responseSubscription?.remove();
    };
  }, [authUser?.id, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    let disconnect: (() => void) | undefined;
    (async () => {
      const token = await authStorage.getToken();
      if (cancelled || !token) return;
      disconnect = connectNotificationsStream({
        token,
        onMessage: (notification) => {
          setById((current) => upsert(current, [notification]));
          setIsLive(true);
          void refreshCounts();
        },
        onOpen: () => {
          setIsLive(true);
          refetch();
        },
        onError: () => setIsLive(false),
      });
    })();
    return () => {
      cancelled = true;
      disconnect?.();
      setIsLive(false);
    };
  }, [authUser?.id, isAuthenticated, refetch, refreshCounts]);

  const markAsRead = useCallback(
    async (id: string) => {
      const previous = byId.get(id);
      if (!previous || previous.readAt) return;
      const optimisticReadAt = new Date().toISOString();
      setById((current) => upsert(current, [{ ...previous, readAt: optimisticReadAt }]));
      try {
        const updated = await markNotificationReadApi(id);
        setById((current) => upsert(current, [updated]));
        void refreshCounts();
      } catch {
        setById((current) => {
          const currentNotification = current.get(id);
          return currentNotification?.readAt === optimisticReadAt
            ? upsert(current, [previous])
            : current;
        });
      }
    },
    [byId, refreshCounts],
  );

  const markAllRead = useCallback(async () => {
    const changedAt = new Date().toISOString();
    const originalReadAt = new Map<string, string | null>();
    setById((current) => {
      const next = new Map(current);
      for (const [id, notification] of next) {
        if (!notification.readAt) {
          originalReadAt.set(id, notification.readAt);
          next.set(id, { ...notification, readAt: changedAt });
        }
      }
      return next;
    });
    try {
      const updated = await markAllNotificationsReadApi();
      setById((current) => upsert(current, updated));
      void refreshCounts();
    } catch {
      setById((current) => {
        const next = new Map(current);
        for (const [id, readAt] of originalReadAt) {
          const notification = next.get(id);
          if (notification?.readAt === changedAt) next.set(id, { ...notification, readAt });
        }
        return next;
      });
    }
  }, [refreshCounts]);

  const notifications = useMemo(
    () =>
      [...byId.values()].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [byId],
  );
  const pendingTasks = useMemo(
    () => notifications.filter((item) => item.isTask && !item.readAt),
    [notifications],
  );
  const value = useMemo(
    () => ({
      notifications,
      pendingTasks,
      unreadCount: countsQuery.data?.unread ?? notifications.filter((item) => !item.readAt).length,
      unreadTaskCount: countsQuery.data?.tasks ?? pendingTasks.length,
      isLoading: feedQuery.isLoading,
      isLive,
      hasMore: Boolean(nextCursor),
      isLoadingOlder,
      markAsRead,
      markAllRead,
      loadOlder,
      refetch,
    }),
    [
      countsQuery.data,
      feedQuery.isLoading,
      isLive,
      isLoadingOlder,
      loadOlder,
      markAllRead,
      markAsRead,
      nextCursor,
      notifications,
      pendingTasks,
      refetch,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context)
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  return context;
}
