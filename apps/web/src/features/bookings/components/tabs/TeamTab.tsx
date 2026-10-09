import { useState } from "react";
import { Users, UserPlus, Crown, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Section } from "@/features/bookings/components/shared/Section";
import { AdminOverrideBanner } from "@/features/bookings/components/shared/AdminOverrideBanner";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";
import {
  setCrewTeamLeadApi,
  deleteAssignmentApi,
} from "@/features/bookings/services/bookings.api";
import { createAssignTechnicianAction } from "@/features/bookings/constants";
import {
  getActiveTechnicianAssignments,
  getDeclinedTechnicianAssignments,
  isDeclinedAssignment,
} from "@/features/bookings/utils/assignmentHelpers";

type TeamMemberStatus = "UNASSIGNED" | "PENDING" | "ASSIGNED" | "ACCEPTED" | "DECLINED";

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

function initialsFor(name: string): string {
  if (isEmptyAssignmentName(name)) return "—";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface TeamTabProps {
  b: Booking;
  caps?: BookingCapabilities;
  actions?: any;
}

export function TeamTab({ b, caps, actions }: TeamTabProps) {
  const queryClient = useQueryClient();
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);

  const canManageAssignments =
    Boolean(caps?.canBypassStageLock) ||
    Boolean(caps?.canAssignTechnician) ||
    Boolean(caps?.canAssignCrew);

  const isClosedBooking = ["COMPLETED", "PARTIALLY_RETURNED", "DONE", "CANCELED"].includes(
    b.status
  );

  const allAssignments = b.assignments || [];
  const activeTech = getActiveTechnicianAssignments(allAssignments);
  const declinedTech = getDeclinedTechnicianAssignments(allAssignments);
  const activeCrew = allAssignments.filter(
    (a: any) => !isDeclinedAssignment(a) && a.roleContext === "CREW"
  );
  const operationOfficers = allAssignments.filter(
    (a: any) => !isDeclinedAssignment(a) && a.roleContext === "OO"
  );

  const handleSetTeamLead = async (assignmentId: string) => {
    setBusyAssignmentId(assignmentId);
    try {
      await setCrewTeamLeadApi(assignmentId, b.id);
      toast.success("Team leader updated.");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update team leader");
    } finally {
      setBusyAssignmentId(null);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setBusyAssignmentId(assignmentId);
    try {
      await deleteAssignmentApi(assignmentId, b.id);
      toast.success("Staff member removed from booking.");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove staff member");
    } finally {
      setBusyAssignmentId(null);
    }
  };

  const handleOpenAssignModal = () => {
    if (actions?.setSelectedAction) {
      actions.setSelectedAction(caps?.assignTechnicianAction ?? createAssignTechnicianAction());
      actions.setShowActionModal(true);
    }
  };

  return (
    <div className="space-y-4">
      {caps?.canBypassStageLock && isClosedBooking && <AdminOverrideBanner />}

      <Section
        title="Assigned Team"
        icon={Users}
        action={
          canManageAssignments && actions?.setSelectedAction ? (
            <button
              type="button"
              onClick={handleOpenAssignModal}
              className="flex items-center gap-1.5 text-[11px] font-semibold transition hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Assign / Edit Technicians
            </button>
          ) : undefined
        }
      >
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {/* Technicians */}
          {activeTech.map((tech: any) => {
            const name = tech.user?.name || "Unknown";
            const status = technicianAssignmentStatus(tech);
            const isLead = Boolean(tech.isTeamLead);
            const isBusy = busyAssignmentId === tech.id;

            return (
              <div
                key={tech.id}
                className="flex items-center justify-between py-3 first:pt-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--accent)",
                    }}
                  >
                    {initialsFor(name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{name}</span>
                      {isLead && (
                        <span
                          className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                        >
                          <Crown className="h-3 w-3" /> Team Lead
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[11px] uppercase tracking-wider"
                      style={{ color: "var(--text-3)" }}
                    >
                      {tech.roleContext || "Technician"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: STATUS_STYLE[status].color,
                      borderColor: "var(--border)",
                    }}
                  >
                    {status}
                  </span>

                  {canManageAssignments && (
                    <div className="flex items-center gap-1 ml-2">
                      {!isLead && (
                        <button
                          type="button"
                          onClick={() => handleSetTeamLead(tech.id)}
                          disabled={isBusy}
                          title="Set as team leader"
                          className="rounded p-1 text-[11px] hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-amber-500 transition disabled:opacity-50"
                        >
                          <Crown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(tech.id)}
                        disabled={isBusy}
                        title="Remove technician"
                        className="rounded p-1 text-[11px] hover:bg-[var(--surface-2)] text-destructive transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Declined Technicians */}
          {declinedTech.map((tech: any) => (
            <div
              key={tech.id}
              className="flex items-center justify-between py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold bg-destructive/10 text-destructive"
                >
                  {initialsFor(tech.user?.name || "Unknown")}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-destructive">
                    {tech.user?.name || "Unknown"}
                  </div>
                  <div
                    className="text-[11px] uppercase tracking-wider text-destructive/80"
                  >
                    Technician (Declined)
                  </div>
                </div>
              </div>
              <span
                className="rounded-md border border-destructive/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive"
              >
                DECLINED
              </span>
            </div>
          ))}

          {/* Active Crew / Stagehands */}
          {activeCrew.map((crew: any) => {
            const name = crew.user?.name || "Unknown";
            const isLead = Boolean(crew.isTeamLead);
            const isBusy = busyAssignmentId === crew.id;

            return (
              <div
                key={crew.id}
                className="flex items-center justify-between py-3"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--accent)",
                    }}
                  >
                    {initialsFor(name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold">{name}</span>
                      {isLead && (
                        <span
                          className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                        >
                          <Crown className="h-3 w-3" /> Stagehand Leader
                        </span>
                      )}
                    </div>
                    <div
                      className="text-[11px] uppercase tracking-wider"
                      style={{ color: "var(--text-3)" }}
                    >
                      Stagehand Crew
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      color: STATUS_STYLE.ASSIGNED.color,
                      borderColor: "var(--border)",
                    }}
                  >
                    ASSIGNED
                  </span>

                  {canManageAssignments && (
                    <div className="flex items-center gap-1 ml-2">
                      {!isLead && (
                        <button
                          type="button"
                          onClick={() => handleSetTeamLead(crew.id)}
                          disabled={isBusy}
                          title="Set as stagehand leader"
                          className="rounded p-1 text-[11px] hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-amber-500 transition disabled:opacity-50"
                        >
                          <Crown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(crew.id)}
                        disabled={isBusy}
                        title="Remove stagehand"
                        className="rounded p-1 text-[11px] hover:bg-[var(--surface-2)] text-destructive transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Operation Officer */}
          {operationOfficers.map((oo: any) => (
            <div
              key={oo.id}
              className="flex items-center justify-between py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--accent)",
                  }}
                >
                  {initialsFor(oo.user?.name || "Unknown")}
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{oo.user?.name || "Unknown"}</div>
                  <div
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    Operation Officer
                  </div>
                </div>
              </div>
              <span
                className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: STATUS_STYLE.ASSIGNED.color,
                  borderColor: "var(--border)",
                }}
              >
                ASSIGNED
              </span>
            </div>
          ))}

          {/* Driver & Team Leader booking fields fallback if not in assignments */}
          {activeTech.length === 0 && (
            <div
              className="flex items-center justify-between py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
                >
                  —
                </div>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text-3)" }}>
                    Unassigned
                  </div>
                  <div
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    Technician Crew
                  </div>
                </div>
              </div>
              <span
                className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: STATUS_STYLE.UNASSIGNED.color, borderColor: "var(--border)" }}
              >
                UNASSIGNED
              </span>
            </div>
          )}

          {!isEmptyAssignmentName(b.driver) && (
            <div
              className="flex items-center justify-between py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{
                    background: "var(--surface-2)",
                    color: "var(--accent)",
                  }}
                >
                  {initialsFor(b.driver)}
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{b.driver}</div>
                  <div
                    className="text-[11px] uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    Driver
                  </div>
                </div>
              </div>
              <span
                className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: STATUS_STYLE.ASSIGNED.color,
                  borderColor: "var(--border)",
                }}
              >
                ASSIGNED
              </span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

