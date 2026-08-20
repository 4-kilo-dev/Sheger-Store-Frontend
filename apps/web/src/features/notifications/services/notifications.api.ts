import { client, authStorage } from "@/lib/api/client";

export type NotificationType = "Booking" | "Inventory" | "Payment" | "Damage" | "Schedule" | "System";
export type NotificationPriority = "low" | "normal" | "high" | "urgent";
export type DisplayPriority = Uppercase<NotificationPriority>;

/** Durable, per-user notification returned by the notifications service. */
export interface Notification {
  id: string;
  recipientUserId: string | null;
  recipientRoleKey: string | null;
  eventType: string;
  relatedEntity: string | null;
  relatedId: string | null;
  title: string | null;
  message: string;
  payload: Record<string, unknown>;
  priority: NotificationPriority;
  isTask: boolean;
  readAt: string | null;
  createdAt: string;
  outboxId: string | null;
}

export interface NotificationFeedResponse {
  items: Notification[];
  nextCursor: string | null;
}

export interface UnreadNotificationCounts {
  unread: number;
  tasks: number;
}

export interface NotificationEventType {
  key: string;
  name: string;
  description: string | null;
  defaultTitle: string | null;
  defaultPriority: NotificationPriority;
  defaultIsTask: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationEventType {
  key: string;
  name: string;
  description?: string;
  defaultTitle?: string;
  defaultPriority?: NotificationPriority;
  defaultIsTask?: boolean;
}

export interface NotificationRoutingRule {
  id: string;
  eventType: string;
  isActive: boolean;
  roleId: string | null;
  roleName: string | null;
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export type CreateNotificationRoutingRule =
  | { eventType: string; roleId: string; userId?: never }
  | { eventType: string; userId: string; roleId?: never };

// Keep the legacy endpoints exported for old callers while the inbox uses the
// cursor feed below.
export function getNotificationsApi(limit = 50, offset = 0): Promise<Notification[]> {
  return client.get<Notification[]>(`/api/notifications?limit=${limit}&offset=${offset}`);
}

export function getPendingTasksApi(): Promise<Notification[]> {
  return client.get<Notification[]>("/api/notifications/tasks");
}

export function getNotificationFeedApi(limit = 50, cursor?: string): Promise<NotificationFeedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return client.get<NotificationFeedResponse>(`/api/notifications/feed?${params.toString()}`);
}

export function getUnreadNotificationCountsApi(): Promise<UnreadNotificationCounts> {
  return client.get<UnreadNotificationCounts>("/api/notifications/unread-count");
}

export function markNotificationReadApi(id: string): Promise<Notification> {
  return client.patch<Notification>(`/api/notifications/${id}/read`, {});
}

export function markAllNotificationsReadApi(): Promise<Notification[]> {
  return client.post<Notification[]>("/api/notifications/read-all", {});
}

export function requestPermissionApi(permissionKey: string, reason?: string): Promise<unknown> {
  return client.post("/api/notifications/request-permission", { permissionKey, reason });
}

export function getNotificationEventTypesApi(): Promise<NotificationEventType[]> {
  return client.get<NotificationEventType[]>("/api/notifications/notification-event-types");
}

export function createNotificationEventTypeApi(
  payload: CreateNotificationEventType,
): Promise<NotificationEventType> {
  return client.post<NotificationEventType>("/api/notifications/notification-event-types", payload);
}

export function updateNotificationEventTypeApi(
  key: string,
  payload: Partial<Omit<CreateNotificationEventType, "key">> & { isActive?: boolean },
): Promise<NotificationEventType> {
  return client.patch<NotificationEventType>(
    `/api/notifications/notification-event-types/${encodeURIComponent(key)}`,
    payload,
  );
}

export function getNotificationRoutingRulesApi(eventType?: string): Promise<NotificationRoutingRule[]> {
  const query = eventType ? `?eventType=${encodeURIComponent(eventType)}` : "";
  return client.get<NotificationRoutingRule[]>(`/api/notifications/notification-routing-rules${query}`);
}

export function createNotificationRoutingRuleApi(
  payload: CreateNotificationRoutingRule,
): Promise<NotificationRoutingRule> {
  return client.post<NotificationRoutingRule>("/api/notifications/notification-routing-rules", payload);
}

export function updateNotificationRoutingRuleApi(
  id: string,
  isActive: boolean,
): Promise<NotificationRoutingRule> {
  return client.patch<NotificationRoutingRule>(`/api/notifications/notification-routing-rules/${id}`, {
    isActive,
  });
}

export function deleteNotificationRoutingRuleApi(id: string): Promise<void> {
  return client.delete<void>(`/api/notifications/notification-routing-rules/${id}`);
}

/** Display defaults are intentionally only fallbacks for older/unknown records. */
export const NOTIFICATION_EVENT_DISPLAY: Record<
  string,
  { title: string; type: NotificationType; priority: DisplayPriority }
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

function humanizeEventType(eventType: string): string {
  const words = eventType.replace(/[._-]+/g, " ").trim();
  return words ? words.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Notification";
}

function inferType(notification: Notification): NotificationType {
  const event = notification.eventType.toLowerCase();
  const entity = notification.relatedEntity?.toLowerCase() ?? "";
  if (event.startsWith("booking.") || entity === "booking" || entity === "assignment") return "Booking";
  if (event.startsWith("inventory.") || entity.includes("damage")) return "Inventory";
  if (event.startsWith("payment.")) return "Payment";
  if (event.startsWith("schedule.")) return "Schedule";
  return "System";
}

export function resolveNotificationDisplay(notification: Notification): {
  title: string;
  type: NotificationType;
  priority: DisplayPriority;
  linkTo?: string;
} {
  const fromEvent = NOTIFICATION_EVENT_DISPLAY[notification.eventType];
  const title = notification.title || fromEvent?.title || humanizeEventType(notification.eventType);
  const type = fromEvent?.type || inferType(notification);
  const priority = (notification.priority || fromEvent?.priority || "normal").toUpperCase() as DisplayPriority;
  const linkTo =
    (notification.relatedEntity === "booking" || notification.relatedEntity === "assignment") &&
    notification.relatedId
      ? `/bookings/${notification.relatedId}`
      : notification.relatedEntity === "damage_missing_report"
        ? "/damage-report"
        : undefined;
  return { title, type, priority, linkTo };
}

export interface SseHandlers {
  onNotification: (notification: Notification) => void;
  onOpen?: () => void;
  onError?: (error: Event) => void;
}

/** Connect to the authenticated notification stream. EventSource handles replay/reconnect. */
export function connectNotificationsStream(handlers: SseHandlers): () => void {
  const token = authStorage.getToken();
  if (!token || token === "undefined" || token === "null" || typeof EventSource === "undefined") {
    return () => {};
  }

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const backendBase = import.meta.env.VITE_API_URL || (isLocal ? "http://localhost:3000" : window.location.origin);
  const ssePath = import.meta.env.VITE_API_URL || isLocal ? "/notifications/stream" : "/api/notifications/stream";
  const stream = new EventSource(`${backendBase}${ssePath}?token=${encodeURIComponent(token)}`);

  stream.addEventListener("notification", (event) => {
    try {
      handlers.onNotification(JSON.parse((event as MessageEvent<string>).data) as Notification);
    } catch (error) {
      console.warn("Unable to parse a notification stream event", error);
    }
  });
  stream.addEventListener("heartbeat", () => undefined);
  stream.onopen = () => handlers.onOpen?.();
  stream.onerror = (error) => handlers.onError?.(error);

  return () => stream.close();
}
