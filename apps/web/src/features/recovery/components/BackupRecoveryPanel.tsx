import { useState } from "react";
import { ShieldCheck, HardDrive, CloudCheck, Server, Layers, Info } from "lucide-react";
import { CreateBackupButton } from "./CreateBackupButton";
import { BackupArchivesTable } from "./BackupArchivesTable";
import { GuardedRestoreModal } from "./GuardedRestoreModal";
import { type RecoveryBackup } from "../services/recovery.api";

export function BackupRecoveryPanel() {
  const [selectedRestoreBackup, setSelectedRestoreBackup] = useState<RecoveryBackup | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [highlightedBackupId, setHighlightedBackupId] = useState<string | null>(null);

  const handleOpenRestore = (backup: RecoveryBackup) => {
    setSelectedRestoreBackup(backup);
    setIsRestoreModalOpen(true);
  };

  const handleCloseRestore = () => {
    setIsRestoreModalOpen(false);
    setSelectedRestoreBackup(null);
  };

  const handleBackupCreated = (newBackup: RecoveryBackup) => {
    setHighlightedBackupId(newBackup.id);
    setTimeout(() => setHighlightedBackupId(null), 8000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview Card */}
      <div
        className="rounded-lg border p-5 shadow-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{
                  background: "color-mix(in oklab, var(--accent) 15%, transparent)",
                  color: "var(--accent)",
                }}
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h2 className="text-[16px] font-bold tracking-tight">
                Platform Backup & Disaster Recovery
              </h2>
            </div>
            <p
              className="mt-1 max-w-2xl text-[12px] leading-relaxed"
              style={{ color: "var(--text-2)" }}
            >
              Automated and on-demand disaster recovery snapshots for Vortex Visual Operations.
              Backups capture full database records, equipment inventories, and media attachments,
              streaming encrypted archives directly to Google Drive.
            </p>
          </div>

          <CreateBackupButton onSuccess={handleBackupCreated} />
        </div>

        {/* Feature Highlights / System Badges */}
        <div
          className="mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-[11px]">
              <span className="font-bold text-[var(--foreground)]">System Data & Storage</span>
              <p className="text-[10px]" style={{ color: "var(--text-2)" }}>
                Bookings, inventory & files
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <CloudCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-[11px]">
              <span className="font-bold text-[var(--foreground)]">Google Drive Storage</span>
              <p className="text-[10px]" style={{ color: "var(--text-2)" }}>
                Secure cloud sync connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-[11px]">
              <span className="font-bold text-[var(--foreground)]">Guarded Rollback</span>
              <p className="text-[10px]" style={{ color: "var(--text-2)" }}>
                15-minute multi-step authorization
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Archives Table */}
      <BackupArchivesTable
        onSelectRestore={handleOpenRestore}
        highlightedBackupId={highlightedBackupId}
      />

      {/* Notice Callout */}
      <div
        className="flex items-start gap-2.5 rounded-lg border p-4 text-[12px] leading-relaxed"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
          color: "var(--text-2)",
        }}
      >
        <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <span className="font-bold text-[var(--foreground)]">Security & Retention Policy: </span>
          Backup archives are retained according to the company&apos;s data governance rules. Only
          administrators with explicit{" "}
          <code className="font-mono text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.5 rounded">system.restore</code>{" "}
          permissions can execute system rollbacks. Restores temporarily place the platform in
          maintenance mode while applying records.
        </div>
      </div>

      {/* Guarded Restore Modal */}
      <GuardedRestoreModal
        backup={selectedRestoreBackup}
        isOpen={isRestoreModalOpen}
        onClose={handleCloseRestore}
      />
    </div>
  );
}
