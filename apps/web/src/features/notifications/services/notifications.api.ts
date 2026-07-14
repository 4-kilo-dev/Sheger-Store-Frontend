import { client, authStorage } from "@/lib/api/client";

export type NotificationType = 'Booking' | 'Inventory' | 'Payment' | 'Damage' | 'Schedule' | 'System';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'URGENT';

export interface Notification {
  id: string;
  title: string;
  detail: string;
  message? : string;
  eventType?: string;
  type: NotificationType;
  priority: NotificationPriority;
  readAt: string | null;
  isTask: boolean;
  relatedEntity?: 'booking' | 'assignment' | 'damage_missing_report' | 'evaluation';
  relatedId?: string;
  createdAt: string;
}

const isBrowser = typeof window !== "undefined";

function getLocalNotifications(): Notification[] {
  if (!isBrowser) return [];
  
  const saved = localStorage.getItem("vortex_notifications");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
}

function saveLocalNotifications(notifs: Notification[]) {
  if (!isBrowser) return;
  localStorage.setItem("vortex_notifications", JSON.stringify(notifs));
}

// ----------------------------------------------------
// REST APIs
// ----------------------------------------------------

export async function getNotificationsApi(limit = 50, offset = 0): Promise<Notification[]> {
  return client.get<Notification[]>(`/api/notifications?limit=${limit}&offset=${offset}`);
}

export async function getPendingTasksApi(): Promise<Notification[]> {
  return client.get<Notification[]>(`/api/notifications/tasks`);
}

export async function markNotificationReadApi(id: string): Promise<void> {
  return client.patch(`/api/notifications/${id}/read`, {});
}

export async function markAllNotificationsReadApi(): Promise<void> {
  return client.post(`/api/notifications/read-all`, {});
}

export async function requestPermissionApi(permissionKey: string, reason?: string): Promise<any> {
  return client.post(`/api/notifications/request-permission`, { permissionKey, reason });
}

/** Display defaults keyed by backend event type (do not rely on status_changed for quote-ready). */
export const NOTIFICATION_EVENT_DISPLAY: Record<
  string,
  { title: string; type: NotificationType; priority: NotificationPriority }
> = {
  "booking.created": { title: "New booking created", type: "Booking", priority: "NORMAL" },
  "booking.confirmed": { title: "Booking confirmed", type: "Booking", priority: "NORMAL" },
  "booking.canceled": { title: "Booking canceled", type: "Booking", priority: "NORMAL" },
  "booking.status_changed": { title: "Booking status changed", type: "Booking", priority: "NORMAL" },
  "booking.technical_allocated": {
    title: "Technical review ready to quote",
    type: "Booking",
    priority: "NORMAL",
  },
  "assignment.created": { title: "New assignment", type: "Booking", priority: "NORMAL" },
  "assignment.declined": { title: "Assignment declined", type: "Booking", priority: "URGENT" },
};

export function resolveNotificationDisplay(n: Notification): {
  title: string;
  type: NotificationType;
  priority: NotificationPriority;
  linkTo?: string;
} {
  const fromEvent = n.eventType ? NOTIFICATION_EVENT_DISPLAY[n.eventType] : undefined;
  const title = n.title || fromEvent?.title || n.eventType || "Notification";
  const type = n.type || fromEvent?.type || "System";
  const priority = n.priority || fromEvent?.priority || "NORMAL";
  const linkTo =
    (n.relatedEntity === "booking" || n.eventType === "booking.technical_allocated") && n.relatedId
      ? `/bookings/${n.relatedId}`
      : n.relatedEntity === "assignment" && n.relatedId
        ? `/bookings/${n.relatedId}`
        : n.relatedEntity === "damage_missing_report"
          ? "/damage-report"
          : undefined;
  return { title, type, priority, linkTo };
}

// ----------------------------------------------------
// Real-Time SSE Stream Handlers
// ----------------------------------------------------

export interface SseHandlers {
  onMessage: (notification: Notification) => void;
  onError?: (error: any) => void;
}

/**
 * Connects to the Server-Sent Events (SSE) notification stream.
 */
export function connectNotificationsStream(handlers: SseHandlers): () => void {
  const token = authStorage.getToken();
  const hasValidToken = token && token !== "undefined" && token !== "null";
  if (!hasValidToken) {
    console.warn("No valid authentication token found. Unable to connect to notifications stream.");
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let isClosed = false;

  const connectRealSse = () => {
    try {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const backendBase = import.meta.env.VITE_API_URL || (isLocal ? "http://localhost:3000" : window.location.origin);
      const ssePath = (import.meta.env.VITE_API_URL || isLocal) ? "/notifications/stream" : "/api/notifications/stream";
      const sseUrl = `${backendBase}${ssePath}?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const newNotif: Notification = JSON.parse(event.data);
          const list = getLocalNotifications();
          saveLocalNotifications([newNotif, ...list]);
          handlers.onMessage(newNotif);
        } catch (e) {
          console.error("Failed to parse incoming SSE message:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("SSE Connection lost. Browser will auto-reconnect...", err);
        if (handlers.onError) {
          handlers.onError(err);
        }
      };
    } catch (e) {
      console.error("Failed to initialize SSE EventSource:", e);
    }
  };

  connectRealSse();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
    }
  };
}
