import { ClipboardCheck } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { ScoreInput, ScoreLabel } from "@/features/bookings/components/shared/ScoreRenderer";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingEvaluations } from "@/features/bookings/hooks/useBookingEvaluations";

interface InternalEvalModalProps {
  booking: Booking;
  evaluations: ReturnType<typeof useBookingEvaluations>;
}

export function InternalEvalModal({ booking, evaluations }: InternalEvalModalProps) {
  const {
    showInternalModal,
    setShowInternalModal,
    venueName,
    setVenueName,
    eventDate,
    setEventDate,
    teamSize,
    setTeamSize,
    notes,
    setNotes,
    internalScores,
    setInternalScores,
    internalMetrics,
    submitInternal,
    submittingInternal,
  } = evaluations;

  if (!showInternalModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b pb-3 mb-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-[15px] font-bold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /> Submit Crew
            Evaluation ({booking.code})
          </h3>
          <button
            onClick={() => setShowInternalModal(false)}
            className="text-[12px] font-semibold hover:opacity-80"
            style={{ color: "var(--text-3)" }}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Client / Venue Location
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Event Date
              <div className="mt-1">
                <DatePicker value={eventDate} onChange={setEventDate} />
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Team Size (On-site Crew)
              <input
                type="number"
                value={teamSize}
                onChange={(e) => setTeamSize(parseInt(e.target.value) || 0)}
                className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="label-eyebrow text-[9px]">Crew Compliance & Standards Checklist</span>
            <div
              className="space-y-3 rounded-lg border p-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              {internalMetrics.length === 0 ? (
                <div className="text-[11px] text-center py-2" style={{ color: "var(--text-3)" }}>
                  No metrics configured in settings.
                </div>
              ) : (
                internalMetrics.map((m) => {
                  const score =
                    internalScores[m.id] ??
                    (m.valueType === "boolean"
                      ? 1
                      : m.valueType === "rating_5"
                        ? 5
                        : m.valueType === "percentage"
                          ? 100
                          : 10);
                  return (
                    <div
                      key={m.id}
                      className="rounded border p-2.5 bg-[var(--surface)] flex flex-col gap-2"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-[12px] font-semibold">{m.label}</div>
                          {m.description && (
                            <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
                              {m.description}
                            </div>
                          )}
                        </div>
                        <ScoreLabel valueType={m.valueType as any} score={score} />
                      </div>

                      <ScoreInput
                        valueType={m.valueType as any}
                        score={score}
                        onChange={(newScore) =>
                          setInternalScores((prev) => ({ ...prev, [m.id]: newScore }))
                        }
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Evaluator Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Summarize setup/teardown details, structural rigidity, or any component malfunctions..."
              className="mt-1 h-20 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px]"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>

        <div
          className="mt-5 flex items-center gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => {
              const scoresList = Object.entries(internalScores).map(([metricId, score]) => ({
                metricId,
                score,
              }));
              submitInternal({
                clientNameVenue: venueName,
                eventDate: eventDate ? new Date(eventDate).toISOString() : undefined,
                teamSize,
                notes,
                scores: scoresList,
              });
            }}
            disabled={submittingInternal}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {submittingInternal ? "Submitting..." : "Submit Evaluation"}
          </button>
          <button
            onClick={() => setShowInternalModal(false)}
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
