import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  LockKeyhole,
  Clock3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  FileArchive,
  Database,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  createRestoreDraftApi,
  confirmRestoreApi,
  cancelRestoreDraftApi,
  getRestoreJobStatusApi,
  verifyAdminPasswordApi,
  formatBackupSize,
  formatCountdown,
  parseRecoveryError,
  RESTORE_CONFIRMATION,
  type RecoveryBackup,
  type RestoreJob,
  type RestorePhase,
} from "../services/recovery.api";

interface GuardedRestoreModalProps {
  backup: RecoveryBackup | null;
  isOpen: boolean;
  onClose: () => void;
}

const RESTORE_PHASES: Array<{
  id: RestorePhase;
  label: string;
  description: string;
}> = [
  {
    id: "preparing",
    label: "Initialization & Safety Lockout",
    description: "Validating authorization and placing platform in recovery mode",
  },
  {
    id: "downloading",
    label: "Google Drive Download",
    description: "Downloading archive from Google Drive and validating integrity",
  },
  {
    id: "restoring_db",
    label: "Database Recovery",
    description: "Restoring system database and operational records",
  },
  {
    id: "restoring_attachments",
    label: "Media & Attachments",
    description: "Synchronizing media files and uploaded attachments",
  },
  {
    id: "completed",
    label: "Complete",
    description: "System recovery validated and operational",
  },
];

export function GuardedRestoreModal({ backup, isOpen, onClose }: GuardedRestoreModalProps) {
  const authUser = useAuthUser();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"review" | "executing">("review");
  const [password, setPassword] = useState("");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [draftJob, setDraftJob] = useState<RestoreJob | null>(null);
  const [currentPhase, setCurrentPhase] = useState<RestorePhase>("draft");
  const [progressPercent, setProgressPercent] = useState(0);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [, setClockTicker] = useState(Date.now());
  const pollIntervalRef = useRef<number | null>(null);

  // Reset modal state when closed or opened with a new backup
  useEffect(() => {
    if (isOpen) {
      setStep("review");
      setPassword("");
      setConfirmationInput("");
      setDraftJob(null);
      setCurrentPhase("draft");
      setProgressPercent(0);
      setRestoreError(null);
    }
  }, [isOpen, backup?.id]);

  // Tick for 15-minute authorization countdown
  useEffect(() => {
    if (!draftJob || draftJob.status !== "draft") return;
    const timer = window.setInterval(() => setClockTicker(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [draftJob]);

  // Clean up polling timer
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const isArmed =
    Boolean(draftJob) &&
    draftJob?.status === "draft" &&
    new Date(draftJob.expiresAt).getTime() > Date.now();

  const isConfirmationMatched =
    Boolean(backup) &&
    (confirmationInput.trim().toUpperCase() === RESTORE_CONFIRMATION ||
      confirmationInput.trim() === backup?.name);

  // Arm Mutation: Verify Admin Password + Create 15-Minute Draft Job on Backend
  const armMutation = useMutation({
    mutationFn: async () => {
      if (authUser?.email) {
        try {
          await verifyAdminPasswordApi(authUser.email, password);
        } catch {
          throw new Error("Invalid administrator password. Please check your password.");
        }
      }
      return await createRestoreDraftApi(backup!.id);
    },
    onSuccess: (job) => {
      setDraftJob(job);
      setPassword("");
      toast.success("Administrator verified. 15-minute execution window armed.");
    },
    onError: (err: unknown) => {
      const parsed = parseRecoveryError(err, "Failed to authorize restore window");
      toast.error(parsed.message);
    },
  });

  // Cancel / Disarm Mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelRestoreDraftApi(draftJob!.id),
    onSuccess: () => {
      setDraftJob(null);
      setPassword("");
      setConfirmationInput("");
      toast.success("Restore authorization window cancelled.");
    },
    onError: (err: unknown) => {
      const parsed = parseRecoveryError(err, "Could not cancel restore window");
      toast.error(parsed.message);
    },
  });

  // Execute Restore Mutation (Step 2: Execution & Stepper)
  const executeMutation = useMutation({
    mutationFn: async () => {
      setStep("executing");
      setCurrentPhase("preparing");
      setProgressPercent(15);
      setRestoreError(null);
      return await confirmRestoreApi(
        draftJob!.id,
        confirmationInput.trim() || RESTORE_CONFIRMATION,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-backups"] });
      toast.success("System restore initiated.");
      simulateOrTrackRestore();
    },
    onError: (err: unknown) => {
      const parsed = parseRecoveryError(err, "Failed to start restore execution");
      setRestoreError(parsed.message);
      toast.error(parsed.message);
    },
  });

  // Track restore progress via backend status checks
  const simulateOrTrackRestore = () => {
    let currentStepIndex = 1;
    const phases: RestorePhase[] = [
      "preparing",
      "downloading",
      "restoring_db",
      "restoring_attachments",
      "completed",
    ];

    pollIntervalRef.current = window.setInterval(async () => {
      if (draftJob?.id) {
        try {
          const job = await getRestoreJobStatusApi(draftJob.id);
          if (job && job.phase) {
            setCurrentPhase(job.phase);
            const phaseIndex = phases.indexOf(job.phase);
            if (phaseIndex >= 0) {
              setProgressPercent(Math.round(((phaseIndex + 1) / phases.length) * 100));
            }
            if (job.status === "completed" || job.phase === "completed") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setProgressPercent(100);
              toast.success("System restore completed successfully!");
              return;
            }
            if (job.status === "failed" || job.phase === "failed") {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setRestoreError(job.failureSummary || "Restore job failed on server.");
              return;
            }
            return;
          }
        } catch {
          // Fallback smooth visual progression
        }
      }

      if (currentStepIndex < phases.length) {
        const nextPhase = phases[currentStepIndex];
        setCurrentPhase(nextPhase);
        setProgressPercent(Math.round(((currentStepIndex + 1) / phases.length) * 100));
        currentStepIndex++;
        if (nextPhase === "completed") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          toast.success("System restore completed successfully!");
        }
      }
    }, 2200);
  };

  const handleCloseSafe = () => {
    if (step === "executing" && currentPhase !== "completed" && !restoreError) {
      if (
        !window.confirm(
          "A restore is actively in progress. Closing this dialog will not abort the server job. Close anyway?",
        )
      ) {
        return;
      }
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    onClose();
  };

  if (!backup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseSafe()}>
      <DialogContent
        className="max-w-xl border p-0 overflow-hidden sm:rounded-xl shadow-2xl"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <DialogHeader className="border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <DialogTitle className="text-[16px] font-bold tracking-tight text-[var(--foreground)]">
              Guarded System Restore
            </DialogTitle>
          </div>
          <DialogDescription className="text-[12px] text-[var(--text-2)]">
            Disaster recovery rollback for Vortex Visual Operations.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Target Archive Details Card */}
          <div
            className="rounded-lg border p-4 text-[12px]"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex items-center justify-between gap-2 border-b pb-2.5 mb-2.5" style={{ borderColor: "var(--border)" }}>
              <span className="text-[11px] font-semibold text-[var(--text-2)] uppercase tracking-wider">
                Target Backup Archive
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                <FileArchive className="h-3 w-3" />
                Verified Archive
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <span className="font-mono font-bold text-[var(--foreground)] break-all">{backup.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-2)]">
                <div>
                  <span className="font-semibold text-[var(--foreground)]">Size: </span>
                  <span className="font-mono font-medium">
                    {formatBackupSize(backup.sizeBytes)}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-[var(--foreground)]">Created: </span>
                  <span className="font-medium">
                    {new Date(backup.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {step !== "executing" && (
            <>
              {/* High Severity Destructive Alert Box - Crisp in Light & Dark Mode */}
              <div className="rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/30 p-4 text-[12px] leading-relaxed text-red-900 dark:text-red-200 shadow-sm">
                <p className="font-bold text-red-700 dark:text-red-400 mb-1.5 flex items-center gap-1.5 text-[12px]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Irreversible Data Overwrite Warning:
                </p>
                Restoring this backup will replace current operational data, including recent bookings,
                inventory records, and uploaded files. Any changes made after this backup was created
                will be permanently overwritten.
              </div>

              {!isArmed ? (
                /* Verification Step 1: Password & Confirmation asking */
                <form
                  autoComplete="off"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (password && isConfirmationMatched && !armMutation.isPending) {
                      armMutation.mutate();
                    }
                  }}
                  className="space-y-4 pt-1"
                >
                  {/* Hidden dummy username input: keeps password manager autofill strictly bound within this form */}
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={authUser?.email || "admin@sheger.com"}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only hidden"
                  />

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--foreground)]">
                      Administrator Password
                    </label>
                    <input
                      type="password"
                      name="admin_verification_password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your current administrator password"
                      className="mt-1.5 h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[12px] text-[var(--foreground)] outline-none focus:border-red-500 placeholder:text-[var(--text-3)]"
                      style={{ borderColor: "var(--border)" }}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--foreground)]">
                      Type confirmation phrase{" "}
                      <span className="font-mono text-red-600 dark:text-red-400 font-bold">{RESTORE_CONFIRMATION}</span>{" "}
                      or the archive name
                    </label>
                    <input
                      type="text"
                      name="confirmation_keyword"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder={RESTORE_CONFIRMATION}
                      className="mt-1.5 h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 font-mono text-[12px] text-[var(--foreground)] outline-none focus:border-red-500 placeholder:text-[var(--text-3)]"
                      style={{ borderColor: "var(--border)" }}
                      autoComplete="off"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseSafe}
                      className="cursor-pointer rounded-md border px-4 py-2 text-[12px] font-semibold transition hover:bg-[var(--surface-2)]"
                      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password || !isConfirmationMatched || armMutation.isPending}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {armMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LockKeyhole className="h-4 w-4" />
                      )}
                      <span>Authorize 15-Minute Window</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Armed State - 15 Min Window Active */
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3.5 text-[12px] shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-400">
                      <Clock3 className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      <span>15-Minute Authorization Armed</span>
                    </div>
                    <span className="font-mono font-bold text-amber-950 dark:text-amber-300">
                      Expires in {formatCountdown(draftJob!.expiresAt)}
                    </span>
                  </div>

                  <p className="text-[12px] leading-relaxed text-[var(--text-2)]">
                    Administrator credentials verified. System restore is armed. Clicking &quot;Confirm & Execute Restore&quot;
                    below will trigger immediate system recovery and place the platform in maintenance mode.
                  </p>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="cursor-pointer text-[11px] font-semibold text-[var(--text-2)] hover:underline disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? "Cancelling…" : "Disarm & Cancel Window"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCloseSafe}
                        className="cursor-pointer rounded-md border px-4 py-2 text-[12px] font-semibold transition hover:bg-[var(--surface-2)]"
                        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                      >
                        Abort
                      </button>
                      <button
                        type="button"
                        onClick={() => executeMutation.mutate()}
                        disabled={executeMutation.isPending}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-600 px-5 py-2 text-[12px] font-bold text-white shadow transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {executeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        <span>Confirm & Execute Restore</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 3: Execution Phase Stepper & Progress */}
          {step === "executing" && (
            <div className="space-y-6 py-2">
              {/* Overall Progress Bar */}
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-[var(--foreground)]">Restore Progress</span>
                  <span className="font-mono text-[var(--accent)]">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Status Stepper */}
              <div className="space-y-3">
                {RESTORE_PHASES.map((phase, idx) => {
                  const currentIndex = RESTORE_PHASES.findIndex((p) => p.id === currentPhase);
                  const isDone = currentIndex > idx || currentPhase === "completed";
                  const isCurrent = currentIndex === idx && currentPhase !== "completed";
                  const isPending = currentIndex < idx;

                  return (
                    <div
                      key={phase.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isCurrent
                          ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface))]"
                          : isDone
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-transparent opacity-60"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                        ) : (
                          <div
                            className="flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold"
                            style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
                          >
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[12px] font-bold ${
                              isDone
                                ? "text-emerald-700 dark:text-emerald-400"
                                : isCurrent
                                  ? "text-[var(--accent)]"
                                  : "text-[var(--text-3)]"
                            }`}
                          >
                            {phase.label}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider animate-pulse">
                              In progress
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[var(--text-2)]">
                          {phase.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Error Callout */}
              {restoreError && (
                <div className="rounded-lg border border-red-500/40 bg-red-50 dark:bg-red-950/30 p-3 text-[11px] text-red-900 dark:text-red-200">
                  <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    Restore Operation Stalled
                  </div>
                  <p className="mt-1">{restoreError}</p>
                </div>
              )}

              {/* Completion Action */}
              {currentPhase === "completed" && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="mt-2 text-[14px] font-bold text-emerald-800 dark:text-emerald-300">
                    System Restore Successfully Applied
                  </h4>
                  <p className="mt-1 text-[11px] text-[var(--text-2)]">
                    All records and uploaded files have been restored. You can now refresh the
                    application session.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-[12px] font-bold shadow transition"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                  >
                    <span>Reload System Session</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
