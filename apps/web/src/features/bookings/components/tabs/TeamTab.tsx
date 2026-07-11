import { Users } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import type { Booking } from "@/features/bookings/services/bookings.api";

export function TeamTab({ b }: { b: Booking }) {
  const roster = [
    { role: "Chief Technician", name: b.assignees[0], status: "ACCEPTED" },
    { role: "Technician", name: b.assignees[1], status: "ACCEPTED" },
    { role: "Operation Officer", name: "Eyob D.", status: "ASSIGNED" },
    { role: "Team Leader", name: b.teamLeader, status: "CONFIRMED" },
    { role: "Stage Hand Team", name: b.stageHand, status: "CONFIRMED" },
    { role: "Driver", name: b.driver, status: "CONFIRMED" },
    { role: "CCR", name: "Selam M.", status: "CONFIRMED" },
  ];
  
  return (
    <Section
      title="Assigned Team"
      icon={Users}
      action={
        <button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
          + Assign Member
        </button>
      }
    >
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {roster.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                style={{ background: "var(--surface-2)", color: "var(--accent)" }}
              >
                {(p.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[13px] font-semibold">{p.name}</div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                  {p.role}
                </div>
              </div>
            </div>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color:
                  p.status === "ACCEPTED"
                    ? "var(--color-status-accepted)"
                    : "var(--color-status-confirmed)",
                borderColor: "var(--border)",
              }}
            >
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
