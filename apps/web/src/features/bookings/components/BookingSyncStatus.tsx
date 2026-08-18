import { getBookingPollCopy, type BookingPollPhase } from "@vortex/utils";

export function BookingSyncStatus({
  phase,
  onRetry,
}: {
  phase: BookingPollPhase;
  onRetry?: () => void;
}) {
  if (phase === "loading" || phase === "success") return null;

  if (phase === "polling") {
    return (
      <div
        className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wide"
        style={{ color: "var(--text-3)" }}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
            style={{ background: "var(--accent)" }}
          />
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
        </span>
        Live status
      </div>
    );
  }

  if (phase === "cancelled") {
    const copy = getBookingPollCopy(phase);
    return (
      <div
        className="mb-3 rounded-md border px-3 py-2 text-[12px]"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
          color: "var(--text-2)",
        }}
      >
        <span className="font-semibold">{copy.title}.</span> {copy.detail}
      </div>
    );
  }

  const copy = getBookingPollCopy(phase);
  return (
    <div
      className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-2)",
      }}
    >
      <div className="text-[12px]" style={{ color: "var(--text-2)" }}>
        <span className="font-semibold">{copy.title}.</span> {copy.detail}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={() => onRetry()}
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--accent)" }}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
