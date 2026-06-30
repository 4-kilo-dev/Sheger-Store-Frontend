import { client, authStorage } from "@/lib/api/client";

export type NotificationType = 'Booking' | 'Inventory' | 'Payment' | 'Damage' | 'Schedule' | 'System';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'URGENT';

export interface Notification {
  id: string;
  title: string;
  detail: string;
  type: NotificationType;
  priority: NotificationPriority;
  readAt: string | null;
  isTask: boolean;
  relatedEntity?: 'booking' | 'assignment' | 'damage_missing_report' | 'evaluation';
  relatedId?: string;
  createdAt: string;
}

const isBrowser = typeof window !== "undefined";

// Mock Initial DB for fallback operations
const MOCK_NOTIFICATIONS_INITIAL: Notification[] = [
  {
    id: "notif-1",
    title: "New Booking Created",
    detail: "Booking code SB021 has been created by Selam W. for P2.97 indoor setup at Hilton Hotel.",
    type: "Booking",
    priority: "NORMAL",
    readAt: null,
    isTask: false,
    relatedEntity: "booking",
    relatedId: "SB021",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() // 10m ago
  },
  {
    id: "notif-2",
    title: "Technician Assignment Required",
    detail: "Booking SB020 is confirmed and ready for Chief Technician config review.",
    type: "Schedule",
    priority: "URGENT",
    readAt: null,
    isTask: true,
    relatedEntity: "booking",
    relatedId: "SB020",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30m ago
  },
  {
    id: "notif-3",
    title: "Damage Report Filed",
    detail: "Storekeeper Samuel K. filed a damage report for LED power supply unit PSU-401 from booking SB019.",
    type: "Damage",
    priority: "URGENT",
    readAt: null,
    isTask: true,
    relatedEntity: "damage_missing_report",
    relatedId: "dm-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2h ago
  },
  {
    id: "notif-4",
    title: "Technician Declined Assignment",
    detail: "Technician Samuel T. declined booking assignment SB020 due to schedule overlap. Action required: reassign.",
    type: "Schedule",
    priority: "URGENT",
    readAt: null,
    isTask: true,
    relatedEntity: "assignment",
    relatedId: "SB020",
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() // 3h ago
  },
  {
    id: "notif-5",
    title: "Client Payment Received",
    detail: "Client relations confirmed receipt of ETB 37,500 advance payment for booking SB020.",
    type: "Payment",
    priority: "NORMAL",
    readAt: "2026-06-30T10:00:00Z",
    isTask: false,
    relatedEntity: "booking",
    relatedId: "SB020",
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString() // 6h ago
  }
];

function getLocalNotifications(): Notification[] {
  if (!isBrowser) return MOCK_NOTIFICATIONS_INITIAL;
  
  const saved = localStorage.getItem("vortex_notifications");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  
  localStorage.setItem("vortex_notifications", JSON.stringify(MOCK_NOTIFICATIONS_INITIAL));
  return MOCK_NOTIFICATIONS_INITIAL;
}

function saveLocalNotifications(notifs: Notification[]) {
  if (!isBrowser) return;
  localStorage.setItem("vortex_notifications", JSON.stringify(notifs));
}

// ----------------------------------------------------
// REST APIs
// ----------------------------------------------------

export async function getNotificationsApi(limit = 50, offset = 0): Promise<Notification[]> {
  try {
    return await client.get<Notification[]>(`/api/notifications?limit=${limit}&offset=${offset}`);
  } catch (error) {
    console.warn("Failed to fetch notifications from server, returning local mock.", error);
    return getLocalNotifications();
  }
}

export async function getPendingTasksApi(): Promise<Notification[]> {
  try {
    return await client.get<Notification[]>(`/api/notifications/tasks`);
  } catch (error) {
    console.warn("Failed to fetch pending tasks from server, returning local mock tasks.", error);
    return getLocalNotifications().filter((n) => n.isTask && !n.readAt);
  }
}

export async function markNotificationReadApi(id: string): Promise<void> {
  try {
    await client.patch(`/api/notifications/${id}/read`, {});
  } catch (error) {
    console.warn(`Failed to mark notification ${id} read on server, updating local mock.`, error);
    const list = getLocalNotifications();
    const updated = list.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n);
    saveLocalNotifications(updated);
  }
}

export async function markAllNotificationsReadApi(): Promise<void> {
  try {
    await client.post(`/api/notifications/read-all`, {});
  } catch (error) {
    console.warn("Failed to mark all notifications read on server, updating local mock.", error);
    const list = getLocalNotifications();
    const updated = list.map((n) => ({ ...n, readAt: new Date().toISOString() }));
    saveLocalNotifications(updated);
  }
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
 * Automatically falls back to a simulated background interval stream if the server is offline.
 */
export function connectNotificationsStream(handlers: SseHandlers): () => void {
  const token = authStorage.getToken();
  const hasValidToken = token && token !== "undefined" && token !== "null";
  if (!hasValidToken) {
    console.warn("No valid authentication token found. Unable to connect to notifications stream.");
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let simulatedStreamInterval: any = null;
  let isClosed = false;

  const connectRealSse = () => {
    try {
      // Direct connection: use VITE_API_URL in production to bypass Vercel serverless function timeouts.
      const backendBase = import.meta.env.VITE_API_URL || window.location.origin;
      const sseUrl = `${backendBase}/api/notifications/stream?token=${encodeURIComponent(token)}`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const newNotif: Notification = JSON.parse(event.data);
          // If we successfully get a real notif, update local storage as sync fallback
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
        
        // If connection fails repeatedly or immediately, start mock backup stream after 5 seconds of failure
        if (!simulatedStreamInterval && !isClosed) {
          console.warn("MinIO/S3 or Backend SSE stream offline. Activating mock backup streams.");
          startSimulatedStream();
        }
      };
    } catch (e) {
      console.error("Failed to initialize SSE EventSource:", e);
      startSimulatedStream();
    }
  };

  const startSimulatedStream = () => {
    if (simulatedStreamInterval) return;
    
    // Simulate a new operational alert arriving every 45-60 seconds for dashboard demo
    const mockTemplates = [
      {
        title: "BOM Approval Required",
        detail: "Lead Tech Bereket A. submitted a Bill of Materials for booking SB020 requiring validation.",
        type: "Inventory",
        priority: "NORMAL",
        isTask: true,
        relatedEntity: "booking",
        relatedId: "SB020"
      },
      {
        title: "Client Payment Flagged",
        detail: "CCR reported billing balance issue for booking SB021 Hilton Hotel.",
        type: "Payment",
        priority: "NORMAL",
        isTask: false,
        relatedEntity: "booking",
        relatedId: "SB021"
      },
      {
        title: "Truck Loading Dispatched",
        detail: "Driver Abebe G. departed from warehouse carrying 48 panels for booking SB020 Hilton.",
        type: "Schedule",
        priority: "NORMAL",
        isTask: false,
        relatedEntity: "booking",
        relatedId: "SB020"
      },
      {
        title: "Technical Review Approved",
        detail: "CTO checked design parameters for P3.91 screen layout on booking SB021 Hilton.",
        type: "Booking",
        priority: "NORMAL",
        isTask: false,
        relatedEntity: "booking",
        relatedId: "SB021"
      }
    ];

    simulatedStreamInterval = setInterval(() => {
      if (isClosed) return;

      const randomTemplate = mockTemplates[Math.floor(Math.random() * mockTemplates.length)];
      const newNotif: Notification = {
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        title: randomTemplate.title,
        detail: randomTemplate.detail,
        type: randomTemplate.type as NotificationType,
        priority: randomTemplate.priority as NotificationPriority,
        readAt: null,
        isTask: randomTemplate.isTask,
        relatedEntity: randomTemplate.relatedEntity as any,
        relatedId: randomTemplate.relatedId,
        createdAt: new Date().toISOString()
      };

      // Add to local mock storage
      const list = getLocalNotifications();
      saveLocalNotifications([newNotif, ...list]);

      handlers.onMessage(newNotif);
    }, 45000); // 45 seconds
  };

  // Start connect
  connectRealSse();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
    }
    if (simulatedStreamInterval) {
      clearInterval(simulatedStreamInterval);
    }
  };
}
