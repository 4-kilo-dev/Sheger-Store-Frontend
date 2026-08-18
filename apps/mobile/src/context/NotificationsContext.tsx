import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/context/AppContext";
import { authStorage } from "@/lib/api/client";
import {
  connectNotificationsStream,
  getNotificationsApi,
  getPendingTasksApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  type StreamNotification,
} from "@/services/notifications-api";
import type { Notification } from "@/types/domain";

interface NotificationsContextType {
  notifications: Notification[];
  pendingTasks: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLive: boolean;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  refetch: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

function mergeNotification(
  list: Notification[],
  incoming: StreamNotification | Notification,
): Notification[] {
  const next: Notification = {
    id: incoming.id,
    eventType: incoming.eventType,
    message: incoming.message || (incoming as { detail?: string }).detail || "",
    isTask: incoming.isTask ?? false,
    relatedEntity: incoming.relatedEntity,
    relatedId: incoming.relatedId,
    readAt: incoming.readAt ?? null,
    createdAt: incoming.createdAt,
    type: incoming.type,
    priority: incoming.priority,
  };
  const without = list.filter((n) => n.id !== next.id);
  return [next, ...without];
}

/**
 * Live notifications provider — mirrors web SSE intent with an RN-compatible
 * EventSource polyfill (XHR streaming). Falls back to query polling when the
 * stream is unavailable.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppContext();
  const queryClient = useQueryClient();
  const [liveNotifications, setLiveNotifications] = useState<Notification[]>([]);
  const [isLive, setIsLive] = useState(false);
  const disconnectRef = useRef<(() => void) | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotificationsApi(),
    enabled: isAuthenticated,
    refetchInterval: isLive ? false : 30_000,
  });

  const pendingQuery = useQuery({
    queryKey: ["notifications", "tasks"],
    queryFn: getPendingTasksApi,
    enabled: isAuthenticated,
    refetchInterval: isLive ? false : 30_000,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectRef.current?.();
      disconnectRef.current = null;
      setIsLive(false);
      setLiveNotifications([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const token = await authStorage.getToken();
      if (cancelled || !token) return;

      disconnectRef.current = connectNotificationsStream({
        token,
        onMessage: (notification) => {
          setLiveNotifications((prev) => mergeNotification(prev, notification));
          setIsLive(true);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          const hint = `${notification.relatedEntity ?? ""} ${notification.eventType ?? ""} ${notification.type ?? ""}`.toLowerCase();
          if (hint.includes("booking") || hint.includes("assignment")) {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
          }
        },
        onError: () => {
          setIsLive(false);
        },
        onOpen: () => setIsLive(true),
      });
    })();

    return () => {
      cancelled = true;
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [isAuthenticated, queryClient]);

  const notifications = useMemo(() => {
    const base = notificationsQuery.data ?? [];
    if (liveNotifications.length === 0) return base;
    let merged = [...base];
    for (const live of liveNotifications) {
      merged = mergeNotification(merged, live);
    }
    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notificationsQuery.data, liveNotifications]);

  const pendingTasks = pendingQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markReadMutation = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAsRead = useCallback(
    (id: string) => {
      setLiveNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      markReadMutation.mutate(id);
    },
    [markReadMutation],
  );

  const markAllRead = useCallback(() => {
    setLiveNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
    );
    markAllMutation.mutate();
  }, [markAllMutation]);

  const value = useMemo(
    () => ({
      notifications,
      pendingTasks,
      unreadCount,
      isLoading: notificationsQuery.isLoading,
      isLive,
      markAsRead,
      markAllRead,
      refetch: () => {
        notificationsQuery.refetch();
        pendingQuery.refetch();
      },
    }),
    [
      notifications,
      pendingTasks,
      unreadCount,
      notificationsQuery,
      pendingQuery,
      isLive,
      markAsRead,
      markAllRead,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return context;
}
