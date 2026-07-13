import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { createAssignmentApi } from "@/features/bookings/services/bookings.api";
import { useStaffForBooking } from "@/features/bookings/hooks/useStaffForBooking";
import { Section } from "@/features/bookings/components/shared/Section";
import { AccessLockOverlay } from "@/features/bookings/components/shared/AccessLockOverlay";
import { PERMISSION } from "@/lib/auth/permission-keys";
import type { OverviewSectionProps } from "./types";

export function CtoTechnicianAssignmentSection({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const { staffList, isStaffRestricted } = useStaffForBooking(caps.canFetchStaff);

  const [assignedTechs, setAssignedTechs] = useState<string[]>([""]);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);

  const handleAssignStaff = async () => {
    const validTechs = assignedTechs.filter((id) => id);
    if (validTechs.length === 0) {
      toast.error("Please select at least one technician to assign.");
      return;
    }
    setIsAssigningStaff(true);
    try {
      if (authUser?.id) {
        await createAssignmentApi(b.id, {
          userId: authUser.id,
          roleContext: "TECHNICIAN",
          isTeamLead: true,
        });
      }

      await Promise.all(
        validTechs.map((techId) =>
          createAssignmentApi(b.id, {
            userId: techId,
            roleContext: "TECHNICIAN",
            isTeamLead: false,
          })
        )
      );

      toast.success("Technician assignment completed!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign crew");
    } finally {
      setIsAssigningStaff(false);
    }
  };

  return (
    <Section title="Assign Lead Crew (Chief Tech Review)" icon={Users}>
      {isStaffRestricted && (
        <AccessLockOverlay
          sectionName="Crew Assignment"
          permissionKey={PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN}
        />
      )}
      <div className="space-y-4">
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Assign the technicians to manage this event deployment. You will be automatically assigned
          as the Chief Technician.
        </p>

        <div className="space-y-3">
          {assignedTechs.map((techId, idx) => (
            <div
              key={idx}
              className="flex items-end gap-3 rounded border p-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                Technician #{idx + 1}
                <select
                  value={techId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignedTechs((prev) => prev.map((t, i) => (i === idx ? val : t)));
                  }}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option value="">— Select Technician —</option>
                  {staffList
                    .filter(
                      (s) =>
                        s.role.toLowerCase() === "technician" || s.role.toLowerCase() === "to"
                    )
                    .map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={assignedTechs.includes(s.id) && s.id !== techId}
                      >
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>

              {assignedTechs.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAssignedTechs((prev) => prev.filter((_, i) => i !== idx))}
                  className="mb-1 rounded bg-red-600/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-600/30"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAssignedTechs((prev) => [...prev, ""])}
            className="rounded px-3 py-1.5 text-xs font-semibold hover:brightness-110"
            style={{ background: "var(--surface-3)", color: "var(--text-1)" }}
          >
            + Add another technician
          </button>

          <button
            onClick={handleAssignStaff}
            disabled={isAssigningStaff}
            className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110"
            style={{ background: "var(--accent)" }}
          >
            {isAssigningStaff ? "Assigning..." : "Assign Crew & Dispatch"}
          </button>
        </div>
      </div>
    </Section>
  );
}
