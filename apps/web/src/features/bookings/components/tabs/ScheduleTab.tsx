import { Wrench, Users, Clock } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import type { Booking } from "@/features/bookings/services/bookings.api";
import { useDateFormatter } from "@/context/CalendarSystemContext";

type TimelineItem = {
  key: string;
  title: string;
  when?: string;
  detail?: string;
  icon: typeof Wrench;
  accent?: boolean;
};

function parseWhen(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ScheduleTab({ b }: { b: Booking }) {
  const { formatDateTime } = useDateFormatter();

  const assemblyWhen = b.assemblyDate || b.rentalStart;
  const eventWhen = b.eventDate;
  const dismantleWhen = b.dismantleDate || b.rentalEnd;

  const items: TimelineItem[] = [
    {
      key: "assembly",
      title: "Assembly Start",
      when: assemblyWhen,
      detail: b.venue || undefined,
      icon: Wrench,
    },
    {
      key: "event",
      title: "Event Start",
      when: eventWhen,
      detail: [b.client, b.venue].filter(Boolean).join(" · ") || undefined,
      icon: Users,
      accent: true,
    },
    {
      key: "dismantle",
      title: "Dismantle Start",
      when: dismantleWhen,
      detail: b.venue || undefined,
      icon: Wrench,
    },
  ];

  const scheduled = items.filter((item) => parseWhen(item.when));

  return (
    <Section title="Timeline" icon={Clock}>
      {scheduled.length === 0 ? (
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          No schedule dates recorded for this booking yet.
        </p>
      ) : (
        <div className="relative space-y-3">
          <div
            className="absolute bottom-0 left-[44px] top-2 w-px"
            style={{ background: "var(--border)" }}
          />
          {scheduled.map((item) => {
            const when = parseWhen(item.when);
            const timeLabel = when
              ? when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
              : "—";
            const dateLabel = when ? formatDateTime(item.when!) : "—";

            return (
              <div key={item.key} className="relative flex items-start gap-4">
                <div
                  className="w-10 pt-2 text-right font-mono text-[11px] font-bold"
                  style={{ color: item.accent ? "var(--accent)" : "var(--text-2)" }}
                >
                  {timeLabel}
                </div>
                <div
                  className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: item.accent ? "var(--accent)" : "var(--border)",
                    background: item.accent
                      ? "color-mix(in oklab, var(--accent) 20%, transparent)"
                      : "var(--surface-2)",
                    color: item.accent ? "var(--accent)" : "var(--text-2)",
                  }}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div
                  className="flex-1 rounded-md border px-3 py-2.5"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-semibold">{item.title}</div>
                    <span className="font-mono text-[10px] shrink-0" style={{ color: "var(--text-3)" }}>
                      {dateLabel}
                    </span>
                  </div>
                  {item.detail && (
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>
                      {item.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
