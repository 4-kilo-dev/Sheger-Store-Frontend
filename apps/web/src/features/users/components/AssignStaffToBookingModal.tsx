import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import {
  createAssignmentApi,
  getBookingsApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import type { StaffMember } from "@/features/checkout/services/operations.api";
import { useDateFormatter } from "@/context/CalendarSystemContext";

type RoleContext = "TECHNICIAN" | "CREW" | "OO";

function resolveRoleContext(person: StaffMember): RoleContext | null {
  const key = (person.roleKey || "").toLowerCase();
  const role = (person.role || "").toLowerCase();
  if (key === "technician" || key === "chief_tech" || role.includes("technician") || role.includes("chief")) {
    return "TECHNICIAN";
  }
  if (key === "oo" || role.includes("operation") || role.includes("ops")) {
    return "OO";
  }
  if (
    key === "stagehand" ||
    key === "freelancer" ||
    role.includes("stagehand") ||
    role.includes("freelancer") ||
    person.isFreelancer
  ) {
    return "CREW";
  }
  return null;
}

function eligibleStatuses(roleContext: RoleContext): Booking["status"][] {
  if (roleContext === "TECHNICIAN") return ["CONFIRMED", "ASSIGNED"];
  return ["CONFIRMED", "ASSIGNED", "ACCEPTED", "PREPARATION", "ONSITE"];
}

export function AssignStaffToBookingModal({
  person,
  open,
  onClose,
}: {
  person: StaffMember | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { formatDate } = useDateFormatter();
  const [bookingId, setBookingId] = useState("");
  const [asTeamLead, setAsTeamLead] = useState(false);

  const roleContext = person ? resolveRoleContext(person) : null;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
    enabled: open && !!person,
  });

  const options = useMemo(() => {
    if (!person || !roleContext) return [];
    const allowed = new Set(eligibleStatuses(roleContext));
    return bookings
      .filter((b) => allowed.has(b.status))
      .filter((b) => {
        const already = (b.assignments || []).some(
          (a: any) =>
            a.userId === person.id &&
            a.roleContext === roleContext &&
            a.status !== "DECLINED",
        );
        return !already;
      })
      .sort((a, b) => (b.assemblyDate || "").localeCompare(a.assemblyDate || ""));
  }, [bookings, person, roleContext]);

  const { mutate: assign, isPending } = useMutation({
    mutationFn: async () => {
      if (!person?.id) throw new Error("Staff member required");
      if (!roleContext) {
        throw new Error(
          `${person.name} cannot be assigned from Staff — their role is not TECHNICIAN, CREW, or OO.`,
        );
      }
      if (!bookingId) throw new Error("Select a booking");
      await createAssignmentApi(bookingId, {
        userId: person.id,
        roleContext,
        isTeamLead: roleContext === "CREW" ? asTeamLead : roleContext === "TECHNICIAN" && (person.roleKey === "chief_tech" || /chief/i.test(person.role)),
      });
    },
    onSuccess: () => {
      toast.success(`${person?.name} assigned to booking`);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setBookingId("");
      setAsTeamLead(false);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign staff");
    },
  });

  if (!open || !person) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-lg border p-5 shadow-xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="label-eyebrow mb-1">Assign staff</div>
            <h2 className="text-[16px] font-bold">{person.name}</h2>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
              {person.role}
              {roleContext ? ` · ${roleContext}` : " · not assignable"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-2)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!roleContext ? (
          <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
            Only technicians, stagehands/freelancers (crew), and operations officers can be
            assigned to bookings from here.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[12px] font-semibold">
              Booking
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[12px] outline-none focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)" }}
                disabled={isLoading}
              >
                <option value="">
                  {isLoading ? "Loading bookings…" : "-- Choose booking --"}
                </option>
                {options.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.status} · {b.client} · {formatDate(b.assemblyDate || b.eventDate)}
                  </option>
                ))}
              </select>
            </label>
            {roleContext === "CREW" && (
              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={asTeamLead}
                  onChange={(e) => setAsTeamLead(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Assign as stagehand team lead
              </label>
            )}
            {options.length === 0 && !isLoading && (
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                No eligible open bookings for this role
                {roleContext === "TECHNICIAN" ? " (CONFIRMED / ASSIGNED only)" : ""}.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-2 text-[12px] font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!roleContext || !bookingId || isPending}
            onClick={() => assign()}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-bold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {isPending ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
