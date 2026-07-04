import { Check, X } from "lucide-react";
import { STATUS_LABELS, type BookingStatus } from "@/features/bookings/services/bookings.api";

const VAR: Record<BookingStatus, string> = {
  RESERVED: "var(--color-status-reserved)",
  CONFIRMED: "var(--color-status-confirmed)",
  ASSIGNED: "var(--color-status-assigned)",
  ACCEPTED: "var(--color-status-accepted)",
  PREPARATION: "var(--color-status-preparation)",
  ONSITE: "var(--color-status-onsite)",
  COMPLETED: "var(--color-status-completed)",
  DONE: "var(--color-status-done)",
  CANCELED: "var(--color-status-canceled)",
  PARTIALLY_RETURNED: "var(--color-status-partially-returned)",
};

export function StatusStepper({ current }: { current: BookingStatus }) {
  const isCanceled = current === "CANCELED";
  const isPartiallyReturned = current === "PARTIALLY_RETURNED";

  const steps: BookingStatus[] = [
    "RESERVED",
    "CONFIRMED",
    "ASSIGNED",
    "ACCEPTED",
    "PREPARATION",
    "ONSITE",
    "COMPLETED",
  ];

  if (isPartiallyReturned) {
    steps.push("PARTIALLY_RETURNED");
  }
  steps.push("DONE");

  const idx = steps.indexOf(current);

  return (
    <div className="flex w-full flex-col gap-4">
      {isCanceled && (
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-status-canceled)] bg-[color-mix(in oklab,var(--color-status-canceled)_10%,transparent)] px-4 py-2.5 text-[12px] font-semibold text-[var(--color-status-canceled)]">
          <X className="h-4 w-4" />
          This booking has been canceled.
        </div>
      )}
      <div className="flex w-full items-start">
        {steps.map((s, i) => {
          const done = !isCanceled && i < idx;
          const active = !isCanceled && i === idx;
          const color = VAR[s];
          return (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className="h-px flex-1" style={{ background: i === 0 ? "transparent" : i <= idx && !isCanceled ? color : "var(--border)" }} />
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${active ? "animate-pulse" : ""}`}
                  style={{
                    borderColor: done || active ? color : "var(--border)",
                    background: done ? color : "var(--surface)",
                    color: done ? "var(--background)" : color,
                  }}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                <div className="h-px flex-1" style={{ background: i === steps.length - 1 ? "transparent" : i < idx && !isCanceled ? color : "var(--border)" }} />
              </div>
              <div className="mt-2 text-center">
                <div
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: done || active ? color : "var(--text-3)" }}
                >
                  {STATUS_LABELS[s]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
