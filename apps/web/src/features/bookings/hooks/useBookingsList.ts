import { useQuery } from "@tanstack/react-query";
import { runWithPollTimeout } from "@vortex/utils";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";
import { useBookingPollQueryOptions } from "@/features/bookings/hooks/useBookingPoll";

export function useBookingsList() {
  const pollOptions = useBookingPollQueryOptions("list");
  return useQuery({
    queryKey: ["bookings"],
    queryFn: ({ signal }) =>
      runWithPollTimeout((pollSignal) => getBookingsApi({ signal: pollSignal }), signal),
    ...pollOptions,
  });
}
