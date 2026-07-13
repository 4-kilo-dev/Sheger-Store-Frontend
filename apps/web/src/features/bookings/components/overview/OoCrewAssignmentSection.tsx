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

export function OoCrewAssignmentSection({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const { staffList, isStaffRestricted } = useStaffForBooking(caps.canFetchStaff);

  const [ooCrewIds, setOoCrewIds] = useState<string[]>([""]);
  const [isAssigningCrew, setIsAssigningCrew] = useState(false);
  const [isDeletingCrewId, setIsDeletingCrewId] = useState<string | null>(null);

  const handleAssignCrew = async () => {
    const valid = ooCrewIds.filter((id) => id);
    if (valid.length === 0) {
      toast.error("Please select at least one crew member.");
      return;
    }
    setIsAssigningCrew(true);
    try {
      await Promise.all(
        valid.map((userId) =>
          createAssignmentApi(b.id, { userId, roleContext: "CREW", isTeamLead: false })
        )
      );
      setOoCrewIds([""]);
      toast.success(`${valid.length} crew member(s) assigned!`);
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign crew");
    } finally {
      setIsAssigningCrew(false);
    }
  };

  const handleRemoveCrew = async (assignmentId: string) => {
    setIsDeletingCrewId(assignmentId);
    try {
      await deleteAssignmentApi(assignmentId);
      toast.success("Crew member removed.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to remove crew member");
    } finally {
      setIsDeletingCrewId(null);
    }
  };

  return (
    <Section title="Assign Field Crew (Operations)" icon={Users}>
      {isStaffRestricted && (
        <AccessLockOverlay
          sectionName="Crew Assignment"
          permissionKey={PERMISSION.ASSIGNMENT_ASSIGN_CREW}
        />
      )}
      <div className="space-y-4">
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Assign stagehands and freelancers for this deployment. These crew members will appear on
          the onsite team brief.
        </p>

        {(b.assignments || []).filter((a: any) => a.roleContext === "CREW").length > 0 && (
          <div className="space-y-2">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-3)" }}
            >
              Currently Assigned Crew
            </div>
            {(b.assignments || [])
              .filter((a: any) => a.roleContext === "CREW")
              .map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded border px-3 py-2 text-[12px]"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  <span className="font-medium">{a.user?.name || "—"}</span>
                  <button
                    onClick={() => handleRemoveCrew(a.id)}
                    disabled={isDeletingCrewId === a.id}
                    className="text-[11px] font-semibold rounded px-2 py-1 transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                    style={{
                      background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
                      color: "var(--destructive)",
                    }}
                  >
                    {isDeletingCrewId === a.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="space-y-2">
          {ooCrewIds.map((crewId, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                Crew member #{idx + 1}
                <select
                  value={crewId}
                  onChange={(e) =>
                    setOoCrewIds((prev) => prev.map((c, i) => (i === idx ? e.target.value : c)))
                  }
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px] cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option value="">— Select crew member —</option>
                  {staffList
                    .filter((s) =>
                      ["stagehand", "freelancer", "sh", "fl"].includes(s.role.toLowerCase())
                    )
                    .map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={ooCrewIds.includes(s.id) && s.id !== crewId}
                      >
                        {s.name} ({s.role})
                      </option>
                    ))}
                </select>
              </label>
              {ooCrewIds.length > 1 && (
                <button
                  onClick={() => setOoCrewIds((prev) => prev.filter((_, i) => i !== idx))}
                  className="mb-1 rounded px-2 py-2 text-[11px] font-semibold cursor-pointer"
                  style={{
                    background: "color-mix(in oklab, var(--destructive) 12%, transparent)",
                    color: "var(--destructive)",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOoCrewIds((prev) => [...prev, ""])}
            className="rounded px-3 py-1.5 text-xs font-semibold hover:brightness-110 cursor-pointer"
            style={{ background: "var(--surface-3)", color: "var(--text-1)" }}
          >
            + Add another crew member
          </button>
          <button
            onClick={handleAssignCrew}
            disabled={isAssigningCrew}
            className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {isAssigningCrew ? "Assigning…" : "Assign Crew"}
          </button>
        </div>
      </div>
    </Section>
  );
}
