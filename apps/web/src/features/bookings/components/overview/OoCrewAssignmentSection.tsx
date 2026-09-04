import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import {
  createAssignmentApi,
  deleteAssignmentApi,
  setCrewTeamLeadApi,
} from "@/features/bookings/services/bookings.api";
import { useStaffForBooking } from "@/features/bookings/hooks/useStaffForBooking";
import { Section } from "@/features/bookings/components/shared/Section";
import { AccessLockOverlay } from "@/features/bookings/components/shared/AccessLockOverlay";
import { PERMISSION } from "@/lib/auth/permission-keys";
import type { OverviewSectionProps } from "./types";

function isStagehandRole(role: string): boolean {
  const r = role.toLowerCase();
  return r === "stagehand" || r === "sh";
}

export function OoCrewAssignmentSection({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const { staffList, isStaffRestricted } = useStaffForBooking(caps.canFetchStaff);

  const [selectedStagehandId, setSelectedStagehandId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [isPromotingId, setIsPromotingId] = useState<string | null>(null);

  const stagehandTeam = (b.assignments || []).filter(
    (a: any) =>
      a.roleContext === "CREW" &&
      a.status !== "DECLINED"
  );
  const stagehandStaff = staffList.filter((s) => isStagehandRole(s.role));
  const availableStagehands = stagehandStaff.filter(
    (s) => !stagehandTeam.some((a: any) => a.userId === s.id),
  );

  const handleAddStagehand = async () => {
    if (!selectedStagehandId) {
      toast.error("Please select a stagehand.");
      return;
    }

    setIsAssigning(true);
    try {
      await createAssignmentApi(b.id, {
        userId: selectedStagehandId,
        roleContext: "CREW",
        isTeamLead: stagehandTeam.length === 0,
      });

      setSelectedStagehandId("");
      toast.success(
        stagehandTeam.length === 0
          ? "Stagehand leader assigned!"
          : "Stagehand added to the team!",
      );
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign stagehand leader");
    } finally {
      setIsAssigning(false);
    }
  };

  const handlePromote = async (assignmentId: string) => {
    setIsPromotingId(assignmentId);
    try {
      await setCrewTeamLeadApi(assignmentId);
      toast.success("Stagehand team leader updated.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update the stagehand team leader");
    } finally {
      setIsPromotingId(null);
    }
  };

  const handleRemoveStagehand = async (assignment: any) => {
    if (assignment.isTeamLead && stagehandTeam.length > 1) {
      toast.error("Choose another team leader before removing the current leader.");
      return;
    }
    setIsRemovingId(assignment.id);
    try {
      await deleteAssignmentApi(assignment.id);
      toast.success("Stagehand removed from the team.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove stagehand leader");
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <Section title="Assign Stagehand Team" icon={Users}>
      {isStaffRestricted && (
        <AccessLockOverlay
          sectionName="Stagehand Team Assignment"
          permissionKey={PERMISSION.ASSIGNMENT_ASSIGN_CREW}
        />
      )}
      <div className="space-y-4">
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Add one or more stagehands to this deployment. One member is designated as the logistics
          team leader for the onsite brief and checkout.
        </p>

        {stagehandTeam.length > 0 && (
          <div className="space-y-2">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-3)" }}
            >
              Assigned Stagehand Team ({stagehandTeam.length})
            </div>
            {stagehandTeam.map((assignment: any) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-[12px]"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <div className="min-w-0">
                  <span className="font-medium">{assignment.user?.name || "—"}</span>
                  {assignment.isTeamLead && (
                    <span className="ml-2 text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                      TEAM LEADER
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!assignment.isTeamLead && (
                    <button
                      type="button"
                      onClick={() => handlePromote(assignment.id)}
                      disabled={isPromotingId === assignment.id || isRemovingId !== null}
                      className="text-[11px] font-semibold transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                      style={{ color: "var(--accent)" }}
                    >
                      {isPromotingId === assignment.id ? "Updating…" : "Make leader"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveStagehand(assignment)}
                    disabled={isRemovingId === assignment.id || isPromotingId !== null}
                    className="text-[11px] font-semibold rounded px-2 py-1 transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                    style={{
                      background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
                      color: "var(--destructive)",
                    }}
                  >
                    {isRemovingId === assignment.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <label className="block text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
          Add Stagehand
          <select
            value={selectedStagehandId}
            onChange={(e) => setSelectedStagehandId(e.target.value)}
            className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px] cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">— Select stagehand —</option>
            {availableStagehands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {stagehandStaff.length === 0 && (
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            No stagehands available to assign.
          </p>
        )}
        {stagehandStaff.length > 0 && availableStagehands.length === 0 && (
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            All available stagehands are already assigned to this booking.
          </p>
        )}

        <button
          type="button"
          onClick={handleAddStagehand}
          disabled={isAssigning || !selectedStagehandId || availableStagehands.length === 0}
          className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--accent)" }}
        >
          {isAssigning ? "Assigning…" : stagehandTeam.length === 0 ? "Assign Stagehand Leader" : "Add to Stagehand Team"}
        </button>
      </div>
    </Section>
  );
}
