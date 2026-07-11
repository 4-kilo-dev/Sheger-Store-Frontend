import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getBookingDetailApi, getBookingSnapshotsApi, type Booking } from "@/features/bookings/services/bookings.api";

export function useBookingDetail(code: string) {
  const navigate = useNavigate();
  const authUser = useAuthUser();

  const { data: booking, isLoading, error } = useQuery<Booking>({
    queryKey: ["booking", code],
    queryFn: () => getBookingDetailApi(code),
  });

  const { data: checkoutSnapshots = [] } = useQuery({
    queryKey: ["booking-checkout-snapshots", booking?.id],
    queryFn: () => getBookingSnapshotsApi(booking!.id, { kind: "CHECKOUT" }),
    enabled: !!booking?.id && (booking.status === "ONSITE" || booking.status === "COMPLETED" || booking.status === "DONE" || booking.status === "PARTIALLY_RETURNED"),
  });
  
  const checkoutSnapshot = checkoutSnapshots?.[0] || null;

  // Auto-redirect to friendly SB code if loaded with a UUID
  useEffect(() => {
    if (booking && booking.code && code !== booking.code) {
      navigate({
        to: "/bookings/$code" as any,
        params: { code: booking.code } as any,
        replace: true,
      });
    }
  }, [booking, code, navigate]);

  // Role and relationship detection
  const isTechnician = authUser?.role?.toLowerCase() === "technician";
  const userRole = authUser?.role?.toLowerCase() || "";
  const isUserDriver = !!(authUser?.id && booking?.driverUserId && authUser.id === booking.driverUserId);

  return {
    booking,
    isLoading,
    error,
    checkoutSnapshot,
    checkoutSnapshots,
    isTechnician,
    userRole,
    isUserDriver,
    authUser,
  };
}
