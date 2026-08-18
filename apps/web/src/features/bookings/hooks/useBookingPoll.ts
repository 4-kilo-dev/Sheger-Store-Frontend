import { useEffect, useState } from "react";
import {
  BOOKING_POLL_QUERY_DEFAULTS,
  getBookingPollIntervalMs,
  resolveBookingPollPhase,
  type BookingPollKind,
  type BookingPollPhase,
} from "@vortex/utils";

/**
 * True while this document is visible. Combined with
 * `refetchIntervalInBackground: false` so hidden tabs do not poll.
 */
export function usePollSurfaceActive(): boolean {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const update = () => {
      setIsActive(document.visibilityState !== "hidden");
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return isActive;
}

function readStatuses(data: unknown): {
  status?: string;
  statuses?: Array<string | undefined>;
} {
  if (Array.isArray(data)) {
    return {
      statuses: data.map((row) =>
        row && typeof row === "object" && "status" in row
          ? String((row as { status?: unknown }).status ?? "")
          : undefined,
      ),
    };
  }
  if (data && typeof data === "object" && "status" in data) {
    const status = (data as { status?: unknown }).status;
    return { status: typeof status === "string" ? status : undefined };
  }
  return {};
}

export function useBookingPollInterval(
  kind: BookingPollKind,
  status?: string,
  enabled = true,
) {
  const isSurfaceActive = usePollSurfaceActive();

  return (query: { state: { data: unknown; fetchFailureCount: number } }): number | false => {
    if (!enabled) return false;
    const parsed = readStatuses(query.state.data);
    return getBookingPollIntervalMs({
      kind,
      status: parsed.status ?? status,
      statuses: parsed.statuses,
      isSurfaceActive,
      fetchFailureCount: query.state.fetchFailureCount,
    });
  };
}

export function useBookingPollQueryOptions(
  kind: BookingPollKind,
  status?: string,
  enabled = true,
) {
  const refetchInterval = useBookingPollInterval(kind, status, enabled);
  return {
    ...BOOKING_POLL_QUERY_DEFAULTS,
    refetchInterval,
  };
}

export function getBookingPollPhaseFromQuery(input: {
  data: { status?: string } | undefined;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
}): BookingPollPhase {
  return resolveBookingPollPhase({
    hasData: !!input.data,
    isPending: input.isPending,
    isFetching: input.isFetching,
    isError: input.isError,
    error: input.error,
    status: input.data?.status,
  });
}
