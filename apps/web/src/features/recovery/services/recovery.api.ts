import { client } from "@/lib/api/client";

export interface RecoveryBackup {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  checksum?: string;
}

export type RestorePhase =
  | "draft"
  | "preparing"
  | "downloading"
  | "restoring_db"
  | "restoring_attachments"
  | "completed"
  | "failed";

export interface RestoreJob {
  id: string;
  archiveDriveId: string;
  archiveName: string;
  archiveChecksum?: string | null;
  status: "draft" | "started" | "running" | "completed" | "failed" | "cancelled";
  phase: RestorePhase;
  expiresAt: string;
  progressPercent?: number;
  failureSummary?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const RESTORE_CONFIRMATION = "CONFIRM_RESTORE";

export function formatBackupSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCountdown(expiresAt: string): string {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export interface ParsedRecoveryError {
  status?: number;
  message: string;
  isConflict: boolean;
  isServiceUnavailable: boolean;
}

export function parseRecoveryError(error: unknown, fallback: string): ParsedRecoveryError {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as any).status === "number"
      ? (error as any).status
      : undefined;

  const rawMessage =
    error instanceof Error && error.message
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  const isConflict =
    status === 409 ||
    rawMessage.toLowerCase().includes("conflict") ||
    rawMessage.toLowerCase().includes("already in progress");

  const isServiceUnavailable =
    status === 503 ||
    rawMessage.toLowerCase().includes("unavailable") ||
    rawMessage.toLowerCase().includes("google drive");

  let message = rawMessage;
  if (isConflict) {
    message = "A backup or recovery operation is already in progress.";
  } else if (isServiceUnavailable) {
    message =
      "Google Drive backup storage is unavailable. Please verify connection and credentials.";
  }

  return {
    status,
    message,
    isConflict,
    isServiceUnavailable,
  };
}

export function listRecoveryBackupsApi() {
  return client.get<RecoveryBackup[]>("/api/recovery/backups");
}

export function createBackupApi() {
  return client.post<RecoveryBackup>("/api/recovery/backups");
}

export async function verifyAdminPasswordApi(email: string, password: string): Promise<boolean> {
  await client.post(
    "/api/auth/login",
    { email, password },
    { skipAuthRedirect: true } as any,
  );
  return true;
}

export function createRestoreDraftApi(archiveDriveId: string) {
  return client.post<RestoreJob>("/api/recovery/restore/draft", { archiveDriveId });
}

export function confirmRestoreApi(jobId: string, confirmationPhrase: string) {
  return client.post<RestoreJob>(`/api/recovery/restore/${jobId}/confirm`, {
    confirmationPhrase,
  });
}

export function cancelRestoreDraftApi(jobId: string) {
  return client.post<RestoreJob>(`/api/recovery/restore/${jobId}/cancel`);
}

export function getRestoreJobStatusApi(jobId: string) {
  return client.get<RestoreJob>(`/api/recovery/restore/${jobId}`);
}
