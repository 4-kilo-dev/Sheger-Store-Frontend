import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";

interface DeclineAssignmentModalProps {
  actions: ReturnType<typeof useBookingActions>;
}

export function DeclineAssignmentModal({ actions }: DeclineAssignmentModalProps) {
  const {
    showDeclineModal,
    setShowDeclineModal,
    declineReason,
    setDeclineReason,
    declineAssignment,
    declining,
  } = actions;

  if (!showDeclineModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-lg border p-5 shadow-xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b pb-3 mb-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-[15px] font-bold text-destructive">Decline Assignment</h3>
          <button
            onClick={() => setShowDeclineModal(false)}
            className="text-[12px] font-semibold hover:opacity-80"
            style={{ color: "var(--text-3)" }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Reason for declining (minimum 10 characters)
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Please state why you are declining this job (e.g. scheduling conflict, double-booked)..."
              className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-24 block resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>
        <div
          className="mt-5 flex items-center gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => declineAssignment(declineReason)}
            disabled={declining || declineReason.trim().length < 10}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--destructive)", color: "#fff" }}
          >
            {declining ? "Processing..." : "Confirm Decline"}
          </button>
          <button
            onClick={() => setShowDeclineModal(false)}
            className="rounded border px-4 py-2 text-[12px]"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
