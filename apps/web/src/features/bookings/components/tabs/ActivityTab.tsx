import { Clock } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import {
  STATUS_LABELS,
  type Booking,
  type BookingStatus,
} from "@/features/bookings/services/bookings.api";

export function ActivityTab({ b }: { b: Booking }) {
  const log = b.statusHistory || [];
  
  return (
    <Section title="Activity Log" icon={Clock}>
      <div className="space-y-4">
        {log.map((l, i) => (
          <div
            key={i}
            className="flex items-start gap-3 text-[12px] border-b pb-3 last:border-0 last:pb-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{l.actorName}</span>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                  {new Date(l.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="mt-1" style={{ color: "var(--text-2)" }}>
                Changed status to{" "}
                <span
                  className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: "var(--surface-2)", color: "var(--accent)" }}
                >
                  {STATUS_LABELS[l.toStatus as BookingStatus] || l.toStatus}
                </span>
                {l.fromStatus && (
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {" "}(from {STATUS_LABELS[l.fromStatus as BookingStatus] || l.fromStatus})
                  </span>
                )}
              </div>
              {l.reason && (
                <div
                  className="mt-1.5 rounded border p-2 text-[11px] italic animate-fade-in"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--text-3)",
                  }}
                >
                  "{l.reason}"
                </div>
              )}
            </div>
          </div>
        ))}
        {log.length === 0 && (
          <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
            No status activities logged yet.
          </div>
        )}
      </div>
    </Section>
  );
}
