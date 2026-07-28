import { AlertTriangle, UserPlus } from "lucide-react";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";

interface DeclinedAssignmentBannerProps {
  booking: Booking;
  caps: BookingCapabilities;
  actions: ReturnType<typeof useBookingActions>;
}

export function DeclinedAssignmentBanner({
  booking,
  caps,
  actions,
}: DeclinedAssignmentBannerProps) {
  const { setSelectedAction, setShowActionModal, setSelectedTechnicianIds, setCancellationReason } =
    actions;

  const {
    showDeclinedAssignmentBanner,
    declinedTechnicianAssignments,
    activeTechnicianAssignments,
    assignTechnicianAction,
  } = caps;

  if (!showDeclinedAssignmentBanner || !assignTechnicianAction) return null;

  const needsImmediateReassignment =
    activeTechnicianAssignments.length === 0 || booking.status === "CONFIRMED";

  return (
    <div
      className="mb-4 rounded-lg border-2 p-4 animate-in fade-in slide-in-from-top-4 duration-300"
      style={{
        borderColor: "var(--destructive)",
        background: "color-mix(in oklab, var(--destructive) 8%, var(--surface))",
      }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "var(--destructive)", color: "#fff" }}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold" style={{ color: "var(--destructive)" }}>
              Technician Assignment Declined
            </h3>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
              {needsImmediateReassignment
                ? "This booking no longer has an active technician crew. Assign a replacement to continue."
                : "A technician declined this booking. Assign a replacement or additional crew member."}
            </p>
            <ul className="mt-3 space-y-2">
              {declinedTechnicianAssignments.map((a: any) => (
                <li
                  key={a.id}
                  className="rounded-md border px-3 py-2 text-[12px]"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <span className="font-semibold">{a.user?.name || "Technician"}</span>
                  {a.isTeamLead ? (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                      (Chief Technician)
                    </span>
                  ) : null}
                  <span style={{ color: "var(--text-3)" }}> — </span>
                  <span style={{ color: "var(--text-2)" }}>
                    {a.declineReason?.trim() || "No reason provided"}
                  </span>
                </li>
              ))}
            </ul>
            {booking.status === "CONFIRMED" && (
              <p className="mt-2 text-[11px] font-semibold" style={{ color: "var(--destructive)" }}>
                Booking status reverted to CONFIRMED — reassignment required.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedAction(assignTechnicianAction);
            setShowActionModal(true);
            setSelectedTechnicianIds([]);
            setCancellationReason("");
          }}
          className="flex shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-[12px] font-bold transition hover:brightness-110"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          <UserPlus className="h-4 w-4" />
          Assign Replacement
        </button>
      </div>
    </div>
  );
}
