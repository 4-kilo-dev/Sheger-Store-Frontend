import { client } from "@/lib/api/client";
import type { Notification, NotificationPriority, NotificationType } from "@/types/domain";

const EVENT_DISPLAY: Record<
  string,
  { title: string; type: NotificationType; priority: NotificationPriority }
> = {
  "booking.created": { title: "New booking created", type: "Booking", priority: "NORMAL" },
  "booking.confirmed": { title: "Booking confirmed", type: "Booking", priority: "NORMAL" },
  "booking.canceled": { title: "Booking canceled", type: "Booking", priority: "NORMAL" },
  "booking.status_changed": {
    title: "Booking status changed",
    type: "Booking",
    priority: "NORMAL",
  },
  "booking.technical_allocated": {
    title: "Technical review ready to quote",
    type: "Booking",
    priority: "NORMAL",
  },
  "assignment.created": { title: "New assignment", type: "Booking", priority: "NORMAL" },
  "assignment.declined": { title: "Assignment declined", type: "Booking", priority: "URGENT" },
  "technician.issue_reported": {
    title: "Technician issue reported",
    type: "Damage",
    priority: "URGENT",
  },
  "inventory.damage_missing_reported": {
    title: "Damage or missing report",
    type: "Damage",
    priority: "URGENT",
  },
  "evaluation.post_event_submitted": {
    title: "Evaluation submitted",
    type: "System",
    priority: "NORMAL",
  },
  "inquiry.received": { title: "New inquiry received", type: "System", priority: "NORMAL" },
  "inventory.out_of_stock": {
    title: "Inventory out of stock",
    type: "Inventory",
    priority: "URGENT",
  },
};

export function getNotificationDisplay(notification: Notification) {
  const fromEvent = EVENT_DISPLAY[notification.eventType];
  const title = fromEvent?.title ?? notification.eventType;
  // The backend's own type/priority (when present) are authoritative — the
  // static event map is only a fallback for older events that predate them.
  const type = notification.type || fromEvent?.type || ("System" as NotificationType);
  const priority =
    notification.priority || fromEvent?.priority || ("NORMAL" as NotificationPriority);
  const linkTo =
    (notification.relatedEntity === "booking" ||
      notification.eventType === "booking.technical_allocated") &&
    notification.relatedId
      ? `/bookings/${notification.relatedId}`
      : notification.relatedEntity === "assignment" && notification.relatedId
        ? `/bookings/${notification.relatedId}`
        : notification.relatedEntity === "damage_missing_report"
          ? "/damage-report"
          : undefined;

  return { title, type, priority, linkTo, unread: !notification.readAt };
}

export function groupByRecency(createdAt: string): "Today" | "Yesterday" | "This Week" {
  const date = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "This Week";
}

export async function getNotificationsApi(limit = 50, offset = 0): Promise<Notification[]> {
  return client.get<Notification[]>(`/notifications?limit=${limit}&offset=${offset}`);
}

export async function getPendingTasksApi(): Promise<Notification[]> {
  return client.get<Notification[]>("/notifications/tasks");
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await client.patch(`/notifications/${id}/read`, {});
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await client.post(`/api/notifications/read-all`, {});
}

export async function requestPermissionApi(
  permissionKey: string,
  reason?: string,
): Promise<unknown> {
  return client.post(`/api/notifications/request-permission`, { permissionKey, reason });
}

export interface StreamNotification extends Notification {
  detail?: string;
}

export interface SseHandlers {
  token: string;
  onMessage: (notification: StreamNotification) => void;
  onError?: (error: unknown) => void;
  onOpen?: () => void;
}

/**
 * RN-compatible Server-Sent Events client (XHR streaming polyfill).
 * Mirrors apps/web connectNotificationsStream — EventSource is not available in RN.
 */
export function connectNotificationsStream(handlers: SseHandlers): () => void {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  const sseUrl = `${baseUrl}/notifications/stream?token=${encodeURIComponent(handlers.token)}`;

  let xhr: XMLHttpRequest | null = null;
  let lastIndex = 0;
  let buffer = "";
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const parseChunk = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const dataLines = part
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""));
      if (dataLines.length === 0) continue;
      try {
        const payload = JSON.parse(dataLines.join("\n")) as StreamNotification;
        handlers.onMessage(payload);
      } catch (e) {
        console.warn("Failed to parse SSE notification payload", e);
      }
    }
  };

  const connect = () => {
    if (closed) return;
    xhr = new XMLHttpRequest();
    xhr.open("GET", sseUrl, true);
    xhr.setRequestHeader("Accept", "text/event-stream");
    xhr.setRequestHeader("Cache-Control", "no-cache");

    xhr.onreadystatechange = () => {
      if (!xhr) return;
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        handlers.onOpen?.();
      }
    };

    xhr.onprogress = () => {
      if (!xhr) return;
      const text = xhr.responseText || "";
      const chunk = text.substring(lastIndex);
      lastIndex = text.length;
      if (chunk) parseChunk(chunk);
    };

    xhr.onerror = (err) => {
      handlers.onError?.(err);
      scheduleReconnect();
    };

    xhr.onloadend = () => {
      if (!closed) {
        handlers.onError?.(new Error("SSE connection ended"));
        scheduleReconnect();
      }
    };

    try {
      xhr.send();
    } catch (e) {
      handlers.onError?.(e);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      lastIndex = 0;
      buffer = "";
      connect();
    }, 3000);
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (xhr) {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    }
    xhr = null;
  };
}

