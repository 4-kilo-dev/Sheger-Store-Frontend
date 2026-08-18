import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { runWithPollTimeout } from "@vortex/utils";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import {
  getBookingDetailApi,
  getBookingSnapshotsApi,
  getBookingsApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import {
  getBookingPollPhaseFromQuery,
  useBookingPollQueryOptions,
} from "@/features/bookings/hooks/useBookingPoll";

function assignmentStamp(booking: Booking | undefined): string {
  return (booking?.assignments ?? [])
    .map((a: { id?: string; respondedAt?: string | null; declineReason?: string | null }) =>
      `${a.id ?? ""}:${a.respondedAt ?? ""}:${a.declineReason ?? ""}`,
    )
    .join("|");
}

export function useBookingDetail(code: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const { can } = usePermissions();
  const pollOptions = useBookingPollQueryOptions("detail");

  // Code→UUID resolution for assigned-scope actors who may not resolve codes directly
  const needsCodeResolution =
    !!authUser &&
    !can(PERMISSION.BOOKING_VIEW_ALL) &&
    can(PERMISSION.BOOKING_VIEW_ASSIGNED);

  const {
    data: booking,
    isLoading,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<Booking>({
    queryKey: ["booking", code],
    queryFn: async ({ signal }) => {
      return runWithPollTimeout(async (pollSignal) => {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            code,
          );
        if (!isUuid && needsCodeResolution) {
          try {
            const list = await getBookingsApi({ signal: pollSignal });
            const found = list.find((b) => b.code === code || b.id === code);
            if (found) {
              return await getBookingDetailApi(found.id, { signal: pollSignal });
            }
          } catch (e) {
            console.error("Failed to resolve booking code to UUID in useBookingDetail", e);
          }
        }
        return getBookingDetailApi(code, { signal: pollSignal });
      }, signal);
    },
    enabled: !!code,
    ...pollOptions,
  });

  const pollPhase = getBookingPollPhaseFromQuery({
    data: booking,
    isPending,
    isFetching,
    isError,
    error,
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

  const relatedStamp = `${booking?.id ?? ""}:${booking?.status ?? ""}:${assignmentStamp(booking)}`;
  const prevRelatedStamp = useRef(relatedStamp);

  useEffect(() => {
    if (!booking?.id) return;
    if (prevRelatedStamp.current === relatedStamp) return;
    const hadBooking = prevRelatedStamp.current.split(":")[0] !== "";
    prevRelatedStamp.current = relatedStamp;
    if (!hadBooking) return;
    void queryClient.invalidateQueries({
      queryKey: ["booking-allowed-transitions", booking.id],
    });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }, [booking?.id, queryClient, relatedStamp]);

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
    isPending,
    isFetching,
    isError,
    error,
    refetch,
    pollPhase,
    checkoutSnapshot,
    checkoutSnapshots,
    authUser,
  };
}
