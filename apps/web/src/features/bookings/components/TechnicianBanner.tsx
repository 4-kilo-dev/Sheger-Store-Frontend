import { toast } from "sonner";
import { createHandoffSnapshotApi, type Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";

interface TechnicianBannerProps {
  booking: Booking;
  caps: BookingCapabilities;
  actions: ReturnType<typeof useBookingActions>;
  openInternalForm: () => void;
}

/**
 * Field-ops banner: shown when the actor has assignment or field actions available.
 * Gated by capabilities — not by role strings.
 */
export function TechnicianBanner({
  booking,
  caps,
  actions,
  openInternalForm,
}: TechnicianBannerProps) {
  const {
    acceptAssignment,
    accepting,
    setShowDeclineModal,
    isTransitioning,
    transitionStatus,
    setShowDamageModal,
    setSelectedAction,
    setShowActionModal,
    setCancellationReason,
  } = actions;

  if (!caps.showFieldOpsBanner) return null;

  const {
    canAcceptAssignment,
    canDeclineAssignment,
    pendingTechAssignment,
    advancePreparationAction,
    canReportDamage,
    canSubmitEval,
  } = caps;

  return (
    <div
      className="mb-4 rounded-lg border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
      style={{
        borderColor: "var(--accent)",
        background: "color-mix(in oklab, var(--accent) 5%, var(--surface))",
      }}
    >
      <div>
        <div className="text-[14px] font-bold">Field Operations</div>
        <div className="text-[11px] mt-1" style={{ color: "var(--text-2)" }}>
          {booking.status === "ASSIGNED" && pendingTechAssignment && (
            <span>You have a pending crew assignment for this booking. Please accept or decline below.</span>
          )}
          {booking.status === "ASSIGNED" && !pendingTechAssignment && (
            <span>Waiting for other crew members to respond to their assignments.</span>
          )}
          {booking.status === "ACCEPTED" && (
            <span>
              BOM Preparation: Specify screen, cabling, and rigging requirements in the{" "}
              <strong>Equipment</strong> tab, upload schematic drawing in the <strong>Files</strong>{" "}
              tab, then submit to Operations.
            </span>
          )}
          {booking.status === "PREPARATION" && (
            <span>Setup checklist submitted. Warehouse storekeepers are preparing checkout.</span>
          )}
          {booking.status === "ONSITE" && (
            <span>
              Event active. Report any equipment failures or submit the post-event crew evaluation once
              completed.
            </span>
          )}
          {booking.status === "COMPLETED" && (
            <span>Event completed. Crew evaluation submitted successfully.</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {booking.status === "ASSIGNED" && canAcceptAssignment && (
          <button
            onClick={() => acceptAssignment()}
            disabled={accepting}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--color-status-done)", color: "#fff" }}
          >
            {accepting ? "Accepting..." : "Accept Assignment"}
          </button>
        )}
        {booking.status === "ASSIGNED" && canDeclineAssignment && (
          <button
            onClick={() => setShowDeclineModal(true)}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
            style={{ background: "var(--destructive)", color: "#fff" }}
          >
            Decline Assignment
          </button>
        )}

        {advancePreparationAction && booking.status === "ACCEPTED" && (
          <button
            onClick={async () => {
              try {
                await createHandoffSnapshotApi(booking.id);
                if (advancePreparationAction.requiresForm) {
                  setSelectedAction(advancePreparationAction);
                  setShowActionModal(true);
                  setCancellationReason("");
                } else {
                  transitionStatus({ toStatus: "PREPARATION" });
                }
              } catch (e: any) {
                toast.error(e.message || "Failed to submit BOM");
              }
            }}
            disabled={isTransitioning}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {isTransitioning
              ? "Submitting..."
              : advancePreparationAction.viaBypass
                ? "Submit BOM to Operations"
                : advancePreparationAction.label}
          </button>
        )}

        {(booking.status === "ONSITE" || booking.status === "COMPLETED") && canReportDamage && (
          <button
            onClick={() => setShowDamageModal(true)}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
            style={{ background: "var(--destructive)", color: "#fff" }}
          >
            Report Damaged Gear
          </button>
        )}

        {booking.status === "ONSITE" && canSubmitEval && (
          <button
            onClick={openInternalForm}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Submit Crew Evaluation
          </button>
        )}
      </div>
    </div>
  );
}
