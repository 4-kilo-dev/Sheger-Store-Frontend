import { toast } from "sonner";
import { createHandoffSnapshotApi, type Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";

interface TechnicianBannerProps {
  booking: Booking;
  isTechnician: boolean;
  userRole: string;
  actions: ReturnType<typeof useBookingActions>;
  openInternalForm: () => void;
}

export function TechnicianBanner({
  booking,
  isTechnician,
  userRole,
  actions,
  openInternalForm,
}: TechnicianBannerProps) {
  const {
    pendingAssignment,
    acceptAssignment,
    accepting,
    setShowDeclineModal,
    isTransitioning,
    transitionStatus,
    setShowDamageModal,
  } = actions;

  if (!isTechnician) return null;

  return (
    <div
      className="mb-4 rounded-lg border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300"
      style={{
        borderColor: "var(--accent)",
        background: "color-mix(in oklab, var(--accent) 5%, var(--surface))",
      }}
    >
      <div>
        <div className="text-[14px] font-bold">Technician Operations Panel</div>
        <div className="text-[11px] mt-1" style={{ color: "var(--text-2)" }}>
          {booking.status === "ASSIGNED" && pendingAssignment && (
            <span>You have a pending crew assignment for this booking. Please accept or decline below.</span>
          )}
          {booking.status === "ASSIGNED" && !pendingAssignment && (
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
        {booking.status === "ASSIGNED" && pendingAssignment && (
          <>
            <button
              onClick={() => acceptAssignment()}
              disabled={accepting}
              className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50"
              style={{ background: "var(--color-status-done)", color: "#fff" }}
            >
              {accepting ? "Accepting..." : "Accept Assignment"}
            </button>
            <button
              onClick={() => setShowDeclineModal(true)}
              className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
              style={{ background: "var(--destructive)", color: "#fff" }}
            >
              Decline Assignment
            </button>
          </>
        )}

        {booking.status === "ACCEPTED" && (
          <button
            onClick={async () => {
              try {
                await createHandoffSnapshotApi(booking.id);
                transitionStatus({ toStatus: "PREPARATION" });
              } catch (e: any) {
                toast.error(e.message || "Failed to submit BOM");
              }
            }}
            disabled={isTransitioning}
            className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {isTransitioning ? "Submitting..." : "Submit BOM to Operations"}
          </button>
        )}

        {(booking.status === "ONSITE" || booking.status === "COMPLETED") &&
          ["technician", "chief_tech", "oo", "storekeeper", "admin"].includes(userRole) && (
            <button
              onClick={() => setShowDamageModal(true)}
              className="rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
              style={{ background: "var(--destructive)", color: "#fff" }}
            >
              Report Damaged Gear
            </button>
          )}

        {booking.status === "ONSITE" &&
          ["technician", "chief_tech", "oo", "admin"].includes(userRole) && (
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
