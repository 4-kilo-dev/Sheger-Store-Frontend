import { client } from "@/lib/api/client";

export interface RecoveryBackup {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  checksum?: string;
}

export interface RestoreAuthorization {
  id: string;
  backupId: string;
  expiresAt: string;
  status: "armed" | "running" | "completed" | "failed" | "cancelled" | "expired";
}

export function listRecoveryBackupsApi() {
  return client.get<RecoveryBackup[]>("/api/recovery/backups");
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
