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
  resolveNotificationDisplay,
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
  return (
    <NotificationsContext.Provider 
      value={{
        notifications: [],
        pendingTasks: [],
        unreadCount: 0,
        isLoading: false,
        markAsRead: () => {},
        markAllRead: () => {}
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
