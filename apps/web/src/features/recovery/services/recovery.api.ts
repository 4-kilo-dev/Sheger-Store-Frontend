import { client } from "@/lib/api/client";

export interface RecoveryBackup {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  checksum?: string;
}

export type RestorePhase =
  "draft" | "downloading" | "restoring_db" | "restoring_attachments" | "completed" | "failed";

export interface RestoreAuthorization {
  id: string;
  backupId: string;
  expiresAt: string;
  status: "armed" | "running" | "completed" | "failed" | "cancelled" | "expired";
}

export interface RestoreJob {
  id: string;
  backupId: string;
  phase: RestorePhase;
  progressPercent: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export const RESTORE_CONFIRMATION = "I WANT TO RESTORE";

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
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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

export function armRestoreApi(payload: {
  backupId: string;
  password: string;
  confirmation: string;
}) {
  return client.post<RestoreAuthorization>("/api/recovery/authorizations", payload);
}

export function cancelRestoreApi(authorizationId: string) {
  return client.post<void>(`/api/recovery/authorizations/${authorizationId}/cancel`);
}

export function executeRestoreApi(authorizationId: string) {
  return client.post<RestoreAuthorization>(
    `/api/recovery/authorizations/${authorizationId}/execute`,
  );
}

export function getRestoreJobStatusApi(authorizationId: string) {
  return client.get<RestoreJob>(`/api/recovery/authorizations/${authorizationId}/status`);
}
