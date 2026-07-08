import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { 
  Bell, CheckCircle2, AlertTriangle, XCircle, DollarSign, Package, ShieldAlert, Calendar
} from "lucide-react";
import { 
  getNotificationsApi, 
  getPendingTasksApi, 
  markNotificationReadApi, 
  markAllNotificationsReadApi,
  connectNotificationsStream, 
  type Notification 
} from "../services/notifications.api";
import { authStorage } from "@/lib/api/client";

interface NotificationsContextType {
  notifications: Notification[];
  pendingTasks: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const token = authStorage.getToken();
  const hasValidToken = !!(token && token !== "undefined" && token !== "null");

  // Queries
  const { data: notifications = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => getNotificationsApi(),
    enabled: hasValidToken,
  });

  const { data: pendingTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["pending-tasks"],
    queryFn: () => getPendingTasksApi(),
    enabled: hasValidToken,
  });

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safePendingTasks = Array.isArray(pendingTasks) ? pendingTasks : [];
  const unreadCount = safeNotifications.filter((n) => !n.readAt).length;

  // Mutations
  const { mutate: markRead } = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: (_, id) => {
      // Optimistically update notifications list cache
      queryClient.setQueryData(["notifications-list"], (old: Notification[] | undefined) => {
        if (!old) return [];
        return old.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n);
      });
      // Invalidate tasks query to update Task Center
      queryClient.invalidateQueries({ queryKey: ["pending-tasks"] });
    }
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      queryClient.setQueryData(["notifications-list"], (old: Notification[] | undefined) => {
        if (!old) return [];
        return old.map((n) => ({ ...n, readAt: new Date().toISOString() }));
      });
      queryClient.setQueryData(["pending-tasks"], []);
      toast.success("All notifications marked as read");
    }
  });

  // Custom Toast Trigger
  const triggerToastNotification = (n: Notification) => {
    let IconComponent = Bell;
    let iconColor = "var(--accent)";
    
    const details = (n.detail || n.message|| " ").toLowerCase();
    const title = (n.title || "").toLowerCase();
    
    if (details.includes("confirmed") || title.includes("confirmed") || details.includes("approved")) {
      IconComponent = CheckCircle2;
      iconColor = "var(--color-status-done)";
    } else if (details.includes("cancelled") || details.includes("canceled") || title.includes("canceled") || title.includes("failed")) {
      IconComponent = XCircle;
      iconColor = "var(--destructive)";
    } else if (details.includes("declined") || title.includes("declined") || title.includes("warning")) {
      IconComponent = AlertTriangle;
      iconColor = "var(--color-status-reserved)"; // Orange/Amber
    } else if (n.type === "Payment") {
      IconComponent = DollarSign;
      iconColor = "var(--accent)";
    } else if (n.type === "Inventory") {
      IconComponent = Package;
      iconColor = "var(--color-bom-returned)";
    } else if (n.type === "Damage") {
      IconComponent = ShieldAlert;
      iconColor = "var(--destructive)";
    }

    // Dynamic Navigation Routing Map
    let redirectPath = "/notifications";
    if (n.relatedEntity === "booking") {
      redirectPath = `/bookings/${n.relatedId}`;
    } else if (n.relatedEntity === "assignment") {
      redirectPath = `/bookings/${n.relatedId}`; // go to booking details where crew assignments are
    } else if (n.relatedEntity === "damage_missing_report") {
      redirectPath = `/damage-report`;
    }

    toast.custom((id) => (
      <div 
        onClick={() => {
          navigate({ to: redirectPath as any });
          markRead(n.id);
          toast.dismiss(id);
        }}
        className="flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-lg border p-3.5 shadow-xl transition-all hover:scale-[1.01] duration-200 animate-in slide-in-from-bottom-3"
        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]" style={{ color: iconColor }}>
          <IconComponent className="h-4.5 w-4.5" />
        </div>
        <div className="flex-grow min-w-0">
          <div className="text-[12.5px] font-bold text-foreground">{n.title}</div>
          <div className="text-[11px] mt-0.5 leading-relaxed truncate" style={{ color: "var(--text-2)" }}>{n.detail || n.message}</div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(id);
          }}
          className="text-[10px] opacity-60 hover:opacity-100 px-1"
          style={{ color: "var(--text-3)" }}
        >
          ✕
        </button>
      </div>
    ), { duration: 6000 });
  };

  // Connect SSE Stream Connection
  useEffect(() => {
    if (!hasValidToken) return;

    const disconnect = connectNotificationsStream({
      onMessage: (newNotif) => {
        // 1. Update React Query client cache for notifications list
        queryClient.setQueryData(["notifications-list"], (old: Notification[] | undefined) => {
          const list = old || [];
          if (list.some((item) => item.id === newNotif.id)) return list;
          return [newNotif, ...list];
        });

        // 2. Update React Query client cache for pending tasks
        if (newNotif.isTask) {
          queryClient.setQueryData(["pending-tasks"], (old: Notification[] | undefined) => {
            const list = old || [];
            if (list.some((item) => item.id === newNotif.id)) return list;
            return [newNotif, ...list];
          });
        }

        // 3. Trigger styled float toast
        triggerToastNotification(newNotif);

        const eventType = (newNotif.eventType || "").toLowerCase();
        const relatedEntity = (newNotif.relatedEntity || "").toLowerCase();
        const isBookingRelatedEvent =
          relatedEntity === "booking" ||
          relatedEntity === "assignment" ||
          eventType.startsWith("booking.") ||
          eventType.startsWith("assignment.");

        if (isBookingRelatedEvent) {
          void queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              typeof query.queryKey[0] === "string" &&
              query.queryKey[0].startsWith("booking"),
          });
        }
      },
      onError: (err) => {
        console.warn("SSE stream error", err);
      }
    });

    return () => {
      disconnect();
    };
  }, [hasValidToken, queryClient]);

  return (
    <NotificationsContext.Provider 
      value={{
        notifications: safeNotifications,
        pendingTasks: safePendingTasks,
        unreadCount,
        isLoading: loadingNotifs || loadingTasks,
        markAsRead: markRead,
        markAllRead
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
