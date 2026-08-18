import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "expo-router";
import {
  BOOKING_POLL_QUERY_DEFAULTS,
  getBookingPollIntervalMs,
  resolveBookingPollPhase,
  type BookingPollKind,
  type BookingPollPhase,
} from "@vortex/utils";

/**
 * True only while this screen is focused and the app is in the foreground.
 * Prevents list/detail polls from running in the background or on covered stack screens.
 */
export function usePollSurfaceActive(): boolean {
  const isFocused = useIsFocused();
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setIsAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);

  return isFocused && isAppActive;
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
