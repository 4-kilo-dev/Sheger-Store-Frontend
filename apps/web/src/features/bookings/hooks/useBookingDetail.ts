import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import {
  getBookingDetailApi,
  getBookingSnapshotsApi,
  getBookingsApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";

export function useBookingDetail(code: string) {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const { can } = usePermissions();

  // Code→UUID resolution for assigned-scope actors who may not resolve codes directly
  const needsCodeResolution =
    !!authUser &&
    !can(PERMISSION.BOOKING_VIEW_ALL) &&
    can(PERMISSION.BOOKING_VIEW_ASSIGNED);

  const { data: booking, isLoading, error } = useQuery<Booking>({
    queryKey: ["booking", code],
    queryFn: async () => {
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          code
        );
      if (!isUuid && needsCodeResolution) {
        try {
          const list = await getBookingsApi();
          const found = list.find((b) => b.code === code || b.id === code);
          if (found) {
            return await getBookingDetailApi(found.id);
          }
        } catch (e) {
          console.error("Failed to resolve booking code to UUID in useBookingDetail", e);
        }
      }
      return getBookingDetailApi(code);
    },
  });

  const { data: checkoutSnapshots = [] } = useQuery({
    queryKey: ["booking-checkout-snapshots", booking?.id],
    queryFn: () => getBookingSnapshotsApi(booking!.id, { kind: "CHECKOUT" }),
    enabled:
      !!booking?.id &&
      (booking.status === "ONSITE" ||
        booking.status === "COMPLETED" ||
        booking.status === "DONE" ||
        booking.status === "PARTIALLY_RETURNED"),
  });

  const checkoutSnapshot = checkoutSnapshots?.[0] || null;

  useEffect(() => {
    if (booking && booking.code && code !== booking.code) {
      navigate({
        to: "/bookings/$code" as any,
        params: { code: booking.code } as any,
        replace: true,
      });
    }
  }, [booking, code, navigate]);

  return {
    booking,
    isLoading,
    error,
    checkoutSnapshot,
    checkoutSnapshots,
    authUser,
  };
}
