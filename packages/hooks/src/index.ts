import { useQuery } from "@tanstack/react-query";
import {
  bookingService,
  inventoryService,
  notificationService,
  reportService,
  staffService,
} from "@vortex/api";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingService.listBookings(),
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryService.listInventory(),
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => reportService.getSummary(),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.listNotifications(),
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports", "summary"],
    queryFn: () => reportService.getSummary(),
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => staffService.listStaff(),
  });
}
