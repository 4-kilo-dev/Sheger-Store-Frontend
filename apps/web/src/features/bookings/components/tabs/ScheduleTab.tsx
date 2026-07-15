import { Truck, MapPin, Wrench, CheckCircle2, Users, PackageCheck, Clock } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import type { Booking } from "@/features/bookings/services/bookings.api";
import { useDateFormatter } from "@/context/CalendarSystemContext";

export function ScheduleTab({ b }: { b: Booking }) {
  const { formatDate } = useDateFormatter();

  const formatTimeOnly = (dateTimeStr?: string, fallback: string = "—") => {
    if (!dateTimeStr) return fallback;
    const parts = dateTimeStr.split("T");
    if (parts[1]) {
      return parts[1].slice(0, 5); // HH:MM
    }
    const spaceParts = dateTimeStr.split(" ");
    if (spaceParts[1]) {
      return spaceParts[1].slice(0, 5);
    }
    return fallback;
  };

  const formatDateOnly = (dateTimeStr?: string) => {
    if (!dateTimeStr) return "";
    const datePart = dateTimeStr.split(/[T ]/)[0];
    return formatDate(datePart);
  };

  const events = [
    { t: "07:00", title: "Load Out from Warehouse", who: "Storekeeper · Storeroom A", icon: Truck },
    { t: "09:30", title: "Arrive at Venue", who: b.venue, icon: MapPin },
    { t: formatTimeOnly(b.assemblyDate, "10:00"), title: "Assembly Start", who: b.assignees.join(" · ") || "None Assigned", icon: Wrench, date: formatDateOnly(b.assemblyDate) },
    { t: "16:00", title: "Test Run & Calibration", who: "Chief Technician", icon: CheckCircle2 },
    { t: formatTimeOnly(b.eventDate, "18:00"), title: "Live Event", who: b.client, icon: Users, date: formatDateOnly(b.eventDate), accent: true },
    { t: formatTimeOnly(b.dismantleDate, "23:30"), title: "Dismantle", who: b.stageHand, icon: Wrench, date: formatDateOnly(b.dismantleDate) },
    { t: "00:30", title: "Material Return & Check-in", who: "Storekeeper", icon: PackageCheck },
  ];
  
  return (
    <Section title="Timeline" icon={Clock}>
      <div className="relative space-y-3">
        <div className="absolute bottom-0 left-[44px] top-2 w-px" style={{ background: "var(--border)" }} />
        {events.map((e, i) => (
          <div key={i} className="relative flex items-start gap-4">
            <div className="w-10 pt-2 text-right font-mono text-[11px] font-bold" style={{ color: e.accent ? "var(--accent)" : "var(--text-2)" }}>{e.t}</div>
            <div
              className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
              style={{
                borderColor: e.accent ? "var(--accent)" : "var(--border)",
                background: e.accent ? "color-mix(in oklab, var(--accent) 20%, transparent)" : "var(--surface-2)",
                color: e.accent ? "var(--accent)" : "var(--text-2)",
              }}
            >
              <e.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 rounded-md border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold">{e.title}</div>
                {e.date && <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>{e.date}</span>}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-2)" }}>{e.who}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
