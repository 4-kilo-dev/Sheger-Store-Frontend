import { useState } from "react";
import { ClipboardCheck, Star, MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/use-active-profile";
import { Section } from "@/features/bookings/components/shared/Section";
import {
  ScoreDisplay,
  ScoreProgressBar,
  getScoreColor,
  getScoreText,
  ScoreInput,
} from "@/features/bookings/components/shared/ScoreRenderer";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingEvaluations } from "@/features/bookings/hooks/useBookingEvaluations";

interface EvaluationsTabProps {
  b: Booking;
  evaluations: ReturnType<typeof useBookingEvaluations>;
}

export function EvaluationsTab({ b, evaluations }: EvaluationsTabProps) {
  const [activeProfile] = useActiveProfile();
  const canSubmitInternal = ["Admin", "CTO", "TO"].includes(activeProfile.role);

  const {
    showWebhookModal,
    setShowWebhookModal,
    respondentName,
    setRespondentName,
    clientScores,
    setClientScores,
    clientMetrics,
    internalEval,
    loadingInternal,
    clientEval,
    loadingClient,
    simulateWebhook,
    submittingWebhook,
    openInternalForm,
    openClientForm,
  } = evaluations;

  const filteredList =
    clientEval?.scores?.map((s) => {
      return s;
    }) || [];

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Internal Evaluation */}
      <div className="col-span-12 md:col-span-6">
        <Section
          title="Internal Crew Review"
          icon={ClipboardCheck}
          action={
            !loadingInternal && !internalEval && canSubmitInternal && (
              <button
                onClick={openInternalForm}
                className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold transition hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", color: "var(--accent)" }}
              >
                + Submit Review
              </button>
            )
          }
        >
          {loadingInternal ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              Loading review...
            </div>
          ) : internalEval ? (
            <div className="space-y-4">
              <div
                className="rounded-md border p-3 bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
                  <span>
                    Evaluated by:{" "}
                    <strong style={{ color: "var(--foreground)" }}>{internalEval.evaluatorId}</strong>
                  </span>
                  <span className="font-mono">
                    {new Date(internalEval.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span style={{ color: "var(--text-3)" }}>Client/Venue:</span>{" "}
                    {internalEval.clientNameVenue || b.venue}
                  </div>
                  <div>
                    <span style={{ color: "var(--text-3)" }}>Team Size:</span>{" "}
                    {internalEval.teamSize || b.assignees.length + 2} crew
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="label-eyebrow text-[10px]">Operations Checklist</span>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {internalEval.scores.map((s) => (
                    <div key={s.metricId} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-[13px] font-semibold">{s.label}</div>
                        {s.description && (
                          <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
                            {s.description}
                          </div>
                        )}
                      </div>
                      <ScoreDisplay valueType={s.valueType as any} score={s.score} />
                    </div>
                  ))}
                </div>
              </div>

              {internalEval.notes && (
                <div
                  className="rounded-md border p-3 bg-[var(--surface)] text-[12px] leading-relaxed"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  <div className="flex items-center gap-1.5 label-eyebrow mb-1.5 text-[9px]">
                    <MessageSquare className="h-3 w-3" style={{ color: "var(--accent)" }} /> Evaluator Notes
                  </div>
                  {internalEval.notes}
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <ClipboardCheck className="h-8 w-8 mb-2" style={{ color: "var(--text-3)" }} />
              <div className="text-[13px] font-semibold">No Internal Review Submitted</div>
              <p className="mt-1 max-w-[280px] text-[11px] px-4" style={{ color: "var(--text-3)" }}>
                Technicians and administrators can complete the operations review for safety, PPE
                compliance, and load-in efficiency.
              </p>
              {canSubmitInternal && (
                <button
                  onClick={openInternalForm}
                  className="mt-4 rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  Start Crew Review
                </button>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Client Feedback */}
      <div className="col-span-12 md:col-span-6">
        <Section
          title="Client Satisfaction Review"
          icon={Star}
          action={
            !loadingClient && !clientEval && (
              <button
                onClick={openClientForm}
                className="rounded border bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold transition hover:border-[var(--accent)]"
                style={{ borderColor: "var(--border)", color: "var(--accent)" }}
              >
                Simulate Webhook
              </button>
            )
          }
        >
          {loadingClient ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              Loading feedback...
            </div>
          ) : clientEval ? (
            <div className="space-y-4">
              <div
                className="rounded-md border p-3 bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-3)" }}>
                  <span>
                    Respondent:{" "}
                    <strong style={{ color: "var(--foreground)" }}>{clientEval.respondentName}</strong>
                  </span>
                  <span className="font-mono">
                    {new Date(clientEval.submittedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                  Ingested automatically via Google Forms Webhook API
                </div>
              </div>

              <div className="space-y-4">
                <span className="label-eyebrow text-[10px]">Client Survey Results</span>
                <div className="space-y-3.5">
                  {clientEval.scores.map((s) => {
                    const scoreColor = getScoreColor(s.valueType as any, s.score);
                    const scoreText = getScoreText(s.valueType as any, s.score);

                    return (
                      <div key={s.metricId} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[13px] font-semibold">{s.label}</span>
                            {s.description && (
                              <span className="ml-2 text-[10px]" style={{ color: "var(--text-3)" }}>
                                ({s.description})
                              </span>
                            )}
                          </div>

                          <span
                            className="font-data text-[12px] font-bold"
                            style={{ color: scoreColor }}
                          >
                            {scoreText}
                          </span>
                        </div>

                        <ScoreProgressBar valueType={s.valueType as any} score={s.score} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-10 text-center border border-dashed rounded-lg"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <Star className="h-8 w-8 mb-2" style={{ color: "var(--text-3)" }} />
              <div className="text-[13px] font-semibold">Awaiting Client Feedback</div>
              <p className="mt-1 max-w-[280px] text-[11px] px-4" style={{ color: "var(--text-3)" }}>
                This card will update automatically once the client completes the Google Form
                evaluation link sent after event breakdown.
              </p>
              <button
                onClick={openClientForm}
                className="mt-4 rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                Simulate Webhook Ingestion
              </button>
            </div>
          )}
        </Section>
      </div>

      {/* Simulate Client Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div
              className="flex items-center justify-between border-b pb-3 mb-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="text-[15px] font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "var(--accent)" }} /> Google Forms
                Webhook Simulator
              </h3>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="text-[12px] font-semibold hover:opacity-80"
                style={{ color: "var(--text-3)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pr-1">
              <div
                className="rounded border p-3 bg-[var(--surface-2)] text-[11px]"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                This simulating modal issues a webhook trigger matching the Apps Script signature
                payload to:
                <code
                  className="block mt-1 font-mono text-[10px] bg-[var(--surface)] p-1 rounded"
                  style={{ color: "var(--accent)" }}
                >
                  POST /bookings/{b.code}/client-evaluation
                </code>
              </div>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Respondent Name
                <input
                  type="text"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="e.g. John Doe (Event Organizer)"
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                <span className="label-eyebrow text-[9px]">Ingested Client Metrics & Dynamic Scales</span>
                {clientMetrics.map((m) => {
                  const score =
                    clientScores[m.key] ??
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
                      className="space-y-1.5 rounded border p-2.5 bg-[var(--surface-2)] animate-in fade-in duration-200"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold">{m.label}</span>
                        <span className="font-data text-[12px] font-bold" style={{ color: "var(--accent)" }}>
                          {getScoreText(m.valueType as any, score)}
                        </span>
                      </div>

                      <ScoreInput
                        valueType={m.valueType as any}
                        score={score}
                        onChange={(newScore) =>
                          setClientScores((prev) => ({ ...prev, [m.key]: newScore }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="mt-5 flex items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => {
                  if (!respondentName.trim()) {
                    toast.error("Please enter a respondent name!");
                    return;
                  }
                  const scoresList = Object.entries(clientScores).map(([metricKey, score]) => ({
                    metricKey,
                    score,
                  }));
                  simulateWebhook({
                    respondentName,
                    scores: scoresList,
                  });
                }}
                disabled={submittingWebhook}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <Send className="h-3 w-3" />
                {submittingWebhook ? "Simulating..." : "Trigger Webhook"}
              </button>
              <button
                onClick={() => setShowWebhookModal(false)}
                className="rounded border px-4 py-2 text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
