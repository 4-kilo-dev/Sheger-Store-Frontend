/**
 * Shared booking-status polling policy for web and mobile.
 *
 * TanStack Query drives the loop (`refetchInterval`). This module is the single
 * source of truth for when to poll, how fast, when to back off, and how to
 * classify loading / success / failure / timeout / cancelled.
 */

export const BOOKING_POLL = {
  /** Abort a single status fetch if the network hangs. */
  REQUEST_TIMEOUT_MS: 12_000,
  /** Field-ops statuses that change quickly (assignment, prep, on-site). */
  DETAIL_ACTIVE_MS: 5_000,
  /** Early / waiting statuses (quote, confirmed, wrap-up). */
  DETAIL_QUIET_MS: 15_000,
  /** List / operations board — slower heartbeat while the surface is visible. */
  LIST_MS: 45_000,
  /** Cap exponential backoff after consecutive failures. */
  MAX_BACKOFF_MS: 60_000,
} as const;

export const TERMINAL_BOOKING_STATUSES = ["DONE", "CANCELED"] as const;

const ACTIVE_OPS_BOOKING_STATUSES = new Set([
  "ASSIGNED",
  "ACCEPTED",
  "PREPARATION",
  "ONSITE",
  "PARTIALLY_RETURNED",
]);

export type BookingPollKind = "detail" | "list" | "transitions";

export type BookingPollPhase =
  | "loading"
  | "polling"
  | "success"
  | "failure"
  | "timeout"
  | "cancelled";

export class PollTimeoutError extends Error {
  override name = "PollTimeoutError";

  constructor(message = "Booking status request timed out") {
    super(message);
  }
}

export function isPollTimeoutError(error: unknown): boolean {
  return (
    error instanceof PollTimeoutError ||
    (error instanceof Error && error.name === "PollTimeoutError")
  );
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "CanceledError");
}

export function isTerminalBookingStatus(status: string | null | undefined): boolean {
  return status === "DONE" || status === "CANCELED";
}

export function isCanceledBookingStatus(status: string | null | undefined): boolean {
  return status === "CANCELED";
}

export function isActiveOpsBookingStatus(status: string | null | undefined): boolean {
  return !!status && ACTIVE_OPS_BOOKING_STATUSES.has(status);
}

export function getBookingPollBackoff(fetchFailureCount: number, baseMs: number): number {
  if (fetchFailureCount <= 0) return baseMs;
  const scaled = baseMs * 2 ** fetchFailureCount;
  return Math.min(scaled, BOOKING_POLL.MAX_BACKOFF_MS);
}

export function getBookingPollIntervalMs(input: {
  kind: BookingPollKind;
  status?: string;
  statuses?: Array<string | undefined>;
  isSurfaceActive: boolean;
  fetchFailureCount: number;
}): number | false {
  if (!input.isSurfaceActive) return false;

  if (input.kind === "list") {
    // Lists stay live while visible — new bookings can appear even if current
    // rows are already DONE / CANCELED.
    return getBookingPollBackoff(input.fetchFailureCount, BOOKING_POLL.LIST_MS);
  }

  if (isTerminalBookingStatus(input.status)) return false;

  const baseMs = isActiveOpsBookingStatus(input.status)
    ? BOOKING_POLL.DETAIL_ACTIVE_MS
    : BOOKING_POLL.DETAIL_QUIET_MS;

  return getBookingPollBackoff(input.fetchFailureCount, baseMs);
}

/**
 * Defaults for TanStack Query observers that poll booking status.
 * `refetchInterval` is supplied by the platform hook (needs surface activity).
 */
export const BOOKING_POLL_QUERY_DEFAULTS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchIntervalInBackground: false,
  retry: (failureCount: number, error: unknown) => {
    if (isPollTimeoutError(error) || isAbortError(error)) return false;
    return failureCount < 1;
  },
} as const;

export function resolveBookingPollPhase(input: {
  hasData: boolean;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  status?: string;
}): BookingPollPhase {
  if (isCanceledBookingStatus(input.status)) return "cancelled";
  if (input.isPending && !input.hasData) return "loading";
  if (input.isError) {
    return isPollTimeoutError(input.error) ? "timeout" : "failure";
  }
  if (isTerminalBookingStatus(input.status)) return "success";
  if (input.hasData) return "polling";
  if (input.isFetching) return "loading";
  return "loading";
}

export function getBookingPollCopy(phase: BookingPollPhase): {
  title: string;
  detail: string;
} {
  switch (phase) {
    case "loading":
      return {
        title: "Loading booking",
        detail: "Fetching the latest booking status.",
      };
    case "polling":
      return {
        title: "Live status",
        detail: "Watching for status changes.",
      };
    case "success":
      return {
        title: "Up to date",
        detail: "This booking has reached a finished state.",
      };
    case "failure":
      return {
        title: "Couldn't refresh status",
        detail: "Check your connection. You can keep working with the last known booking.",
      };
    case "timeout":
      return {
        title: "Status refresh timed out",
        detail: "The request took too long. Retry to fetch the latest status.",
      };
    case "cancelled":
      return {
        title: "Booking canceled",
        detail: "This booking was canceled. Status updates have stopped.",
      };
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  const abortError = new Error("Aborted");
  abortError.name = "AbortError";
  throw abortError;
}

/**
 * Run a fetch with the React Query abort signal plus a hard request timeout.
 * Query cancellation (unmount / disable) stays an AbortError; hangs become
 * PollTimeoutError so the UI can show a timeout state instead of spinning.
 */
export async function runWithPollTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  querySignal?: AbortSignal,
  timeoutMs: number = BOOKING_POLL.REQUEST_TIMEOUT_MS,
): Promise<T> {
  throwIfAborted(querySignal);

  const controller = new AbortController();
  let timedOut = false;

  const onQueryAbort = () => {
    try {
      controller.abort(querySignal?.reason);
    } catch {
      controller.abort();
    }
  };
  querySignal?.addEventListener("abort", onQueryAbort);

  const timeoutId = setTimeout(() => {
    timedOut = true;
    const timeoutError = new PollTimeoutError();
    try {
      controller.abort(timeoutError);
    } catch {
      controller.abort();
    }
  }, timeoutMs);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (timedOut) throw new PollTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
    querySignal?.removeEventListener("abort", onQueryAbort);
  }
}
