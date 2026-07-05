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
  const display = EVENT_DISPLAY[notification.eventType] ?? {
    title: notification.eventType,
    type: "System" as NotificationType,
    priority: "NORMAL" as NotificationPriority,
  };
  const linkTo =
    notification.relatedEntity === "booking" && notification.relatedId
      ? `/bookings/${notification.relatedId}`
      : notification.relatedEntity === "damage_missing_report"
        ? "/inventory"
        : undefined;

  return { ...display, linkTo, unread: !notification.readAt };
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
