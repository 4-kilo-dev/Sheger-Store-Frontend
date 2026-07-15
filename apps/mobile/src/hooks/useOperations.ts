import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAssignmentApi,
  createBookingApi,
  getBookingDetailApi,
  getBookingsApi,
  recordBookingPaymentApi,
  transitionBookingStatusApi,
} from "@/services/bookings-api";
import { checkinBookingApi, checkoutBookingApi } from "@/services/checkout-api";
import { createDamageReportApi } from "@/services/damage-api";
import { getInventoryApi, getInventoryItemApi } from "@/services/inventory-api";
import {
  getNotificationsApi,
  getPendingTasksApi,
  markNotificationReadApi,
} from "@/services/notifications-api";
import {
  getPerformanceMetricsApi,
  toggleMetricActiveApi,
} from "@/services/performance-metrics-api";
import { createStaffApi, getStaffApi } from "@/services/staff-api";
import type { BomItem, BookingStatus } from "@/types/domain";

export function useBookings() {
  return useQuery({ queryKey: ["bookings"], queryFn: getBookingsApi });
}

export function useBooking(code: string) {
  return useQuery({
    queryKey: ["bookings", code],
    queryFn: () => getBookingDetailApi(code),
    enabled: !!code,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBookingApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useTransitionBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      toStatus,
      reason,
    }: {
      bookingId: string;
      toStatus: BookingStatus;
      reason?: string;
    }) => transitionBookingStatusApi(bookingId, toStatus, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useRecordBookingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      toStatus,
      amount,
    }: {
      bookingId: string;
      toStatus: "advance" | "fully_paid";
      amount: number;
    }) => recordBookingPaymentApi(bookingId, toStatus, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: { userId: string; roleContext: string; isTeamLead?: boolean; phase?: string };
    }) => createAssignmentApi(bookingId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCheckoutBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, items }: { bookingId: string; items: BomItem[] }) =>
      checkoutBookingApi(bookingId, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCheckinBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, items }: { bookingId: string; items: BomItem[] }) =>
      checkinBookingApi(bookingId, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCreateDamageReport() {
  return useMutation({ mutationFn: createDamageReportApi });
}

export function useInventory() {
  return useQuery({ queryKey: ["inventory"], queryFn: getInventoryApi });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => getInventoryItemApi(id),
    enabled: !!id,
  });
}

export function useStaff() {
  return useQuery({ queryKey: ["staff"], queryFn: getStaffApi });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStaffApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => getNotificationsApi() });
}

export function usePendingTasks() {
  return useQuery({ queryKey: ["notifications", "tasks"], queryFn: getPendingTasksApi });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function usePerformanceMetrics() {
  return useQuery({ queryKey: ["performance-metrics"], queryFn: getPerformanceMetricsApi });
}

export function useToggleMetricActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleMetricActiveApi(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance-metrics"] }),
  });
}
