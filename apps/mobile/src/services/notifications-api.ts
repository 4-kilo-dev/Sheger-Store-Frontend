import { client } from "@/lib/api/client";
import type { Notification, NotificationPriority, NotificationType } from "@/types/domain";

export type NotificationPriorityValue = "low" | "normal" | "high" | "urgent";
export interface NotificationEventType {
  key: string;
  name: string;
  description: string | null;
  defaultTitle: string | null;
  defaultPriority: NotificationPriorityValue;
  defaultIsTask: boolean;
  isActive: boolean;
}
export interface NotificationRoutingRule {
  id: string;
  eventType: string;
  isActive: boolean;
  roleId: string | null;
  roleName: string | null;
  userId: string | null;
  userName: string | null;
}
export type CreateNotificationRoutingRule =
  { eventType: string; roleId: string } | { eventType: string; userId: string };

export function getNotificationEventTypesApi() {
  return client.get<NotificationEventType[]>("/api/notifications/notification-event-types");
}
export function createNotificationEventTypeApi(payload: {
  key: string;
  name: string;
  description?: string;
  defaultTitle?: string;
  defaultPriority?: NotificationPriorityValue;
  defaultIsTask?: boolean;
}) {
  return client.post<NotificationEventType>("/api/notifications/notification-event-types", payload);
}
export function updateNotificationEventTypeApi(
  key: string,
  payload: Partial<NotificationEventType>,
) {
  return client.patch<NotificationEventType>(
    `/api/notifications/notification-event-types/${encodeURIComponent(key)}`,
    payload,
  );
}
export function getNotificationRoutingRulesApi() {
  return client.get<NotificationRoutingRule[]>("/api/notifications/notification-routing-rules");
}
export function createNotificationRoutingRuleApi(payload: CreateNotificationRoutingRule) {
  return client.post<NotificationRoutingRule>(
    "/api/notifications/notification-routing-rules",
    payload,
  );
}
export function updateNotificationRoutingRuleApi(id: string, isActive: boolean) {
  return client.patch<NotificationRoutingRule>(
    `/api/notifications/notification-routing-rules/${id}`,
    { isActive },
  );
}
export function deleteNotificationRoutingRuleApi(id: string) {
  return client.delete<void>(`/api/notifications/notification-routing-rules/${id}`);
}

type ApiNotification = Omit<Notification, "priority"> & { priority?: string };
export interface NotificationFeedResponse {
  items: Notification[];
  nextCursor: string | null;
}
export interface UnreadNotificationCounts {
  unread: number;
  tasks: number;
}

type NotificationTarget = Pick<Notification, "eventType" | "relatedEntity" | "relatedId">;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getNotificationLinkTo(target: NotificationTarget): string | undefined {
  const relatedId = asString(target.relatedId);
  if (
    (target.relatedEntity === "booking" ||
      target.relatedEntity === "assignment" ||
      target.eventType === "booking.technical_allocated") &&
    relatedId
  ) {
    return `/bookings/${encodeURIComponent(relatedId)}`;
  }
  if (target.relatedEntity === "damage_missing_report") return "/damage-report";
  return undefined;
}

export function getPushNotificationLinkTo(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const target = data as Record<string, unknown>;
  const eventType = asString(target.eventType);
  if (!eventType) return undefined;
  return getNotificationLinkTo({
    eventType,
    relatedEntity: asString(target.relatedEntity),
    relatedId: asString(target.relatedId),
  });
}

function fromApiNotification(notification: ApiNotification): Notification {
  return {
    ...notification,
    message: notification.message || "",
    isTask: Boolean(notification.isTask),
    priority: notification.priority?.toUpperCase() as NotificationPriority | undefined,
  };
}

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
  const title =
    notification.title || fromEvent?.title || notification.eventType.replace(/[._-]+/g, " ");
  // The backend's own type/priority (when present) are authoritative — the
  // static event map is only a fallback for older events that predate them.
  const type = notification.type || fromEvent?.type || ("System" as NotificationType);
  const priority =
    notification.priority || fromEvent?.priority || ("NORMAL" as NotificationPriority);
  const linkTo = getNotificationLinkTo(notification);

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
  const notifications = await client.get<ApiNotification[]>(
    `/notifications?limit=${limit}&offset=${offset}`,
  );
  return notifications.map(fromApiNotification);
}

export async function getNotificationFeedApi(
  limit = 50,
  cursor?: string,
): Promise<NotificationFeedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const response = await client.get<{ items: ApiNotification[]; nextCursor: string | null }>(
    `/notifications/feed?${params}`,
  );
  return { items: response.items.map(fromApiNotification), nextCursor: response.nextCursor };
}

export function getUnreadNotificationCountsApi(): Promise<UnreadNotificationCounts> {
  return client.get<UnreadNotificationCounts>("/notifications/unread-count");
}

export async function getPendingTasksApi(): Promise<Notification[]> {
  return client.get<Notification[]>("/notifications/tasks");
}

export async function markNotificationReadApi(id: string): Promise<Notification> {
  return fromApiNotification(await client.patch<ApiNotification>(`/notifications/${id}/read`, {}));
}

export async function markAllNotificationsReadApi(): Promise<Notification[]> {
  const notifications = await client.post<ApiNotification[]>(`/api/notifications/read-all`, {});
  return notifications.map(fromApiNotification);
}

export function registerNotificationDeviceApi(
  platform: "ios" | "android",
  token: string,
): Promise<unknown> {
  return client.post("/notifications/devices", { platform, token });
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
  let lastEventId: string | null = null;
  let buffer = "";
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const parseChunk = (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const lines = part.split("\n");
      const eventName = lines.find((line) => line.startsWith("event:"))?.replace(/^event:\s?/, "");
      if (eventName && eventName !== "notification") continue;
      const eventId = lines.find((line) => line.startsWith("id:"))?.replace(/^id:\s?/, "");
      if (eventId) lastEventId = eventId;
      const dataLines = lines
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
    if (lastEventId) xhr.setRequestHeader("Last-Event-ID", lastEventId);

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
