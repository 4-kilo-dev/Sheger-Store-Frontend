import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CloudUpload, Loader2, AlertCircle } from "lucide-react";
import { createBackupApi, parseRecoveryError, type RecoveryBackup } from "../services/recovery.api";

interface CreateBackupButtonProps {
  onSuccess?: (backup: RecoveryBackup) => void;
  className?: string;
}

export function CreateBackupButton({ onSuccess, className = "" }: CreateBackupButtonProps) {
  const queryClient = useQueryClient();
  const [inProgressMessage, setInProgressMessage] = useState<string | null>(null);

  const backupMutation = useMutation({
    mutationFn: async () => {
      setInProgressMessage(
        "Creating database dump and archiving MinIO attachments to Google Drive...",
      );
      return await createBackupApi();
    },
    onSuccess: (newBackup) => {
      setInProgressMessage(null);
      queryClient.invalidateQueries({ queryKey: ["recovery-backups"] });
      toast.success("Platform backup archive created successfully and uploaded to Google Drive.");
      if (onSuccess) {
        onSuccess(newBackup);
      }
    },
    onError: (error: unknown) => {
      setInProgressMessage(null);
      const parsed = parseRecoveryError(error, "Failed to create platform backup");
      if (parsed.isConflict) {
        toast.warning(parsed.message, {
          description: "Please wait until the active operation completes before starting another.",
        });
      } else if (parsed.isServiceUnavailable) {
        toast.error(parsed.message, {
          description: "Google Drive is unreachable or cloud storage quota has been exceeded.",
        });
      } else {
        toast.error(parsed.message);
      }
    },
  });

  const isPending = backupMutation.isPending;

  return (
    <div className={`flex flex-col items-start gap-2 sm:items-end ${className}`}>
      <button
        type="button"
        onClick={() => backupMutation.mutate()}
        disabled={isPending}
        className="group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md px-4 py-2.5 text-[12px] font-bold tracking-tight shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: "var(--accent)",
          color: "var(--accent-foreground)",
        }}
        aria-busy={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-current" />
        ) : (
          <CloudUpload className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
        )}
        <span>{isPending ? "Creating Backup..." : "Create Backup Now"}</span>
      </button>

      {isPending && inProgressMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded border px-3 py-1.5 text-[11px] font-medium animate-pulse"
          style={{
            borderColor: "color-mix(in oklab, var(--accent) 30%, transparent)",
            background: "color-mix(in oklab, var(--accent) 8%, var(--surface-2))",
            color: "var(--foreground)",
          }}
        >
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--accent)]" />
          <span>{inProgressMessage}</span>
        </div>
      )}

      {backupMutation.isError && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-[11px] font-medium text-red-500"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Last attempt failed. You can retry creating a backup.</span>
        </div>
      )}
    </div>
  );
}
