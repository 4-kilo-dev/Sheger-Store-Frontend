import { Users } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import type { Booking } from "@/features/bookings/services/bookings.api";
import {
  getActiveTechnicianAssignments,
  getDeclinedTechnicianAssignments,
  isDeclinedAssignment,
} from "@/features/bookings/utils/assignmentHelpers";

type TeamMemberStatus = "UNASSIGNED" | "PENDING" | "ASSIGNED" | "ACCEPTED" | "DECLINED";

interface TeamRow {
  role: string;
  name: string;
  status: TeamMemberStatus;
}

const STATUS_STYLE: Record<TeamMemberStatus, { color: string }> = {
  UNASSIGNED: { color: "var(--text-3)" },
  PENDING: { color: "var(--color-status-assigned)" },
  ASSIGNED: { color: "var(--color-status-confirmed)" },
  ACCEPTED: { color: "var(--color-status-accepted)" },
  DECLINED: { color: "var(--destructive)" },
};

function isEmptyAssignmentName(value?: string | null): boolean {
  const v = (value || "").trim();
  return !v || v === "None Assigned" || v === "Unassigned";
}

function technicianAssignmentStatus(assignment: any): TeamMemberStatus {
  if (assignment.status === "DECLINED") return "DECLINED";
  if (assignment.respondedAt == null) return "PENDING";
  return "ACCEPTED";
}

function aggregateTechnicianStatus(assignments: any[]): TeamMemberStatus {
  if (assignments.length === 0) return "UNASSIGNED";
  if (assignments.some((a) => a.status === "DECLINED")) return "DECLINED";
  if (assignments.some((a) => a.respondedAt == null)) return "PENDING";
  return "ACCEPTED";
}

function buildTeamRoster(b: Booking): TeamRow[] {
  const allAssignments = b.assignments || [];
  const activeTech = getActiveTechnicianAssignments(allAssignments);
  const declinedTech = getDeclinedTechnicianAssignments(allAssignments);
  const otherActive = allAssignments.filter(
    (a: any) => !isDeclinedAssignment(a) && a.roleContext !== "TECHNICIAN"
  );

  const chief = activeTech.find((a: any) => a.isTeamLead);
  const technicians = activeTech.filter((a: any) => !a.isTeamLead);
  const operationOfficer = otherActive.find((a: any) => a.roleContext === "OO");
  const crew = otherActive.filter((a: any) => a.roleContext === "CREW");

  const technicianNames = technicians.map((a: any) => a.user?.name).filter(Boolean);
  const crewNames = crew.map((a: any) => a.user?.name).filter(Boolean);

  const stageHandFromField = b.stageHand.replace(/^TEAM · /, "");
  const stageHandName =
    crewNames.length > 0
      ? crewNames.join(", ")
      : isEmptyAssignmentName(stageHandFromField)
        ? "Unassigned"
        : stageHandFromField;

  const driverName = isEmptyAssignmentName(b.driver) ? "Unassigned" : b.driver;
  const teamLeaderName = isEmptyAssignmentName(b.teamLeader) ? "Unassigned" : b.teamLeader;

  return [
    {
      role: "Chief Technician",
      name: chief?.user?.name || "Unassigned",
      status: chief ? technicianAssignmentStatus(chief) : "UNASSIGNED",
    },
    {
      role: "Technician",
      name: technicianNames.length > 0 ? technicianNames.join(", ") : "Unassigned",
      status: aggregateTechnicianStatus(technicians),
    },
    ...declinedTech.map((a: any) => ({
      role: a.isTeamLead ? "Chief Technician (Declined)" : "Technician (Declined)",
      name: a.user?.name || "Unknown",
      status: "DECLINED" as TeamMemberStatus,
    })),
    {
      role: "Operation Officer",
      name: operationOfficer?.user?.name || "Unassigned",
      status: operationOfficer ? "ASSIGNED" : "UNASSIGNED",
    },
    {
      role: "Team Leader",
      name: teamLeaderName,
      status: isEmptyAssignmentName(b.teamLeader) ? "UNASSIGNED" : "ASSIGNED",
    },
    {
      role: "Stage Hand Team",
      name: stageHandName,
      status: crew.length > 0 ? "ASSIGNED" : "UNASSIGNED",
    },
    {
      role: "Driver",
      name: driverName,
      status: isEmptyAssignmentName(b.driver) ? "UNASSIGNED" : "ASSIGNED",
    },
  ];
}

function initialsFor(name: string): string {
  if (isEmptyAssignmentName(name)) return "—";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamTab({ b }: { b: Booking }) {
  const roster = buildTeamRoster(b);

  return (
    <Section title="Assigned Team" icon={Users}>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {roster.map((member) => (
          <div
            key={`${member.role}-${member.name}`}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                style={{
                  background: "var(--surface-2)",
                  color: isEmptyAssignmentName(member.name) ? "var(--text-3)" : "var(--accent)",
                }}
              >
                {initialsFor(member.name)}
              </div>
              <div>
                <div
                  className="text-[13px] font-semibold"
                  style={{
                    color: isEmptyAssignmentName(member.name) ? "var(--text-3)" : "var(--text-1)",
                  }}
                >
                  {member.name}
                </div>
                <div
                  className="text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--text-3)" }}
                >
                  {member.role}
                </div>
              </div>
            </div>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: STATUS_STYLE[member.status].color,
                borderColor: "var(--border)",
              }}
            >
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
