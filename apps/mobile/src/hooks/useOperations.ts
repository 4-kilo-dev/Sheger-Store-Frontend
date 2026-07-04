import { useQuery } from "@tanstack/react-query";
import { operationsService } from "@/services/operations-service";

export function useBookings() {
  return useQuery({ queryKey: ["mobile", "bookings"], queryFn: operationsService.listBookings });
}

export function useBooking(code: string) {
  return useQuery({
    queryKey: ["mobile", "bookings", code],
    queryFn: () => operationsService.getBooking(code),
  });
}

export function useInventory() {
  return useQuery({ queryKey: ["mobile", "inventory"], queryFn: operationsService.listInventory });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["mobile", "inventory", id],
    queryFn: () => operationsService.getInventoryItem(id),
  });
}

export function useStaff() {
  return useQuery({ queryKey: ["mobile", "staff"], queryFn: operationsService.listStaff });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["mobile", "notifications"],
    queryFn: operationsService.listNotifications,
  });
}

export function useReportMonths() {
  return useQuery({
    queryKey: ["mobile", "reports", "months"],
    queryFn: operationsService.getReportMonths,
  });
}
