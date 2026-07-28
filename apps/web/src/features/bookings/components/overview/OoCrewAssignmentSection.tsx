import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import {
  createAssignmentApi,
  deleteAssignmentApi,
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

  const stagehandLeader = (b.assignments || []).find(
    (a: any) =>
      a.roleContext === "CREW" &&
      a.isTeamLead &&
      a.status !== "DECLINED"
  );

  const stagehandStaff = staffList.filter((s) => isStagehandRole(s.role));

  const handleAssignLeader = async () => {
    if (!selectedStagehandId) {
      toast.error("Please select a stagehand leader.");
      return;
    }

    if (stagehandLeader?.userId === selectedStagehandId) {
      toast.error("This stagehand is already assigned as team leader.");
      return;
    }

    setIsAssigning(true);
    try {
      if (stagehandLeader) {
        await deleteAssignmentApi(stagehandLeader.id);
      }

      await createAssignmentApi(b.id, {
        userId: selectedStagehandId,
        roleContext: "CREW",
        isTeamLead: true,
      });

      setSelectedStagehandId("");
      toast.success("Stagehand leader assigned!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign stagehand leader");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveLeader = async (assignmentId: string) => {
    setIsRemovingId(assignmentId);
    try {
      await deleteAssignmentApi(assignmentId);
      toast.success("Stagehand leader removed.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove stagehand leader");
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <Section title="Assign Stagehand Leader" icon={Users}>
      {isStaffRestricted && (
        <AccessLockOverlay
          sectionName="Stagehand Leader Assignment"
          permissionKey={PERMISSION.ASSIGNMENT_ASSIGN_CREW}
        />
      )}
      <div className="space-y-4">
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Assign the stagehand team leader for this deployment. They will appear on the onsite team
          brief and in logistics as team leader.
        </p>

        {stagehandLeader && (
          <div className="space-y-2">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-3)" }}
            >
              Current Stagehand Leader
            </div>
            <div
              className="flex items-center justify-between rounded border px-3 py-2 text-[12px]"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <span className="font-medium">{stagehandLeader.user?.name || "—"}</span>
              <button
                type="button"
                onClick={() => handleRemoveLeader(stagehandLeader.id)}
                disabled={isRemovingId === stagehandLeader.id}
                className="text-[11px] font-semibold rounded px-2 py-1 transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                style={{
                  background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
                  color: "var(--destructive)",
                }}
              >
                {isRemovingId === stagehandLeader.id ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        )}

        <label className="block text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
          {stagehandLeader ? "Replace Stagehand Leader" : "Stagehand Leader"}
          <select
            value={selectedStagehandId}
            onChange={(e) => setSelectedStagehandId(e.target.value)}
            className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px] cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="">— Select stagehand —</option>
            {stagehandStaff.map((s) => (
              <option
                key={s.id}
                value={s.id}
                disabled={stagehandLeader?.userId === s.id}
              >
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

        <button
          type="button"
          onClick={handleAssignLeader}
          disabled={isAssigning || !selectedStagehandId}
          className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
          style={{ background: "var(--accent)" }}
        >
          {isAssigning
            ? "Assigning…"
            : stagehandLeader
              ? "Replace Stagehand Leader"
              : "Assign Stagehand Leader"}
        </button>
      </div>
    </Section>
  );
}
