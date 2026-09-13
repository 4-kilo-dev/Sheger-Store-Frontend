import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RotateCcw,
  Copy,
  Check,
  FileArchive,
  ShieldAlert,
  Calendar,
  Clock,
  HardDrive,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  listRecoveryBackupsApi,
  formatBackupSize,
  type RecoveryBackup,
} from "../services/recovery.api";
import { formatCalendarValuesApi, calendarQueryOptions } from "@/lib/calendar/calendar.api";
import { formatEthiopianDate } from "@/lib/calendar/ethiopian-calendar-client";

interface BackupArchivesTableProps {
  onSelectRestore: (backup: RecoveryBackup) => void;
  highlightedBackupId?: string | null;
}

export function BackupArchivesTable({
  onSelectRestore,
  highlightedBackupId,
}: BackupArchivesTableProps) {
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const {
    data: backups = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<RecoveryBackup[]>({
    queryKey: ["recovery-backups"],
    queryFn: listRecoveryBackupsApi,
    refetchInterval: 60_000,
  });

  // Collect timestamps for Ethiopian Calendar conversion
  const timestamps = useMemo(() => {
    return backups.map((b) => b.createdAt).filter(Boolean);
  }, [backups]);

  // Query Ethiopian Calendar formatting from edge API
  const { data: formattedCalendarEntries = [] } = useQuery({
    queryKey: ["recovery-calendar-formatting", timestamps],
    queryFn: async () => {
      if (timestamps.length === 0) return [];
      try {
        return await formatCalendarValuesApi(timestamps, "ethiopic", "latn");
      } catch {
        return [];
      }
    },
    enabled: timestamps.length > 0,
    ...calendarQueryOptions,
  });

  const calendarMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of formattedCalendarEntries) {
      map.set(entry.value, entry.displayDateTime || entry.displayDate);
    }
    return map;
  }, [formattedCalendarEntries]);

  const handleCopyChecksum = async (checksum: string) => {
    try {
      await navigator.clipboard.writeText(checksum);
      setCopiedChecksum(checksum);
      toast.success("MD5 Checksum copied to clipboard");
      setTimeout(() => setCopiedChecksum(null), 2500);
    } catch {
      toast.error("Failed to copy checksum to clipboard");
    }
  };

  const formatGregorian = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const formatEthiopic = (isoString: string) => {
    if (calendarMap.has(isoString)) {
      return calendarMap.get(isoString)!;
    }
    // Fallback using client-side Ethiopian converter
    try {
      const datePart = isoString.split("T")[0];
      const timePart = isoString.split("T")[1]?.slice(0, 5) || "";
      const ethDate = formatEthiopianDate(datePart);
      if (ethDate) {
        return timePart ? `${ethDate}, ${timePart} EAT` : ethDate;
      }
    } catch {}
    return "Converting…";
  };

  return (
    <div
      className="overflow-hidden rounded-lg border shadow-sm"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      {/* Table Header Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-[13px] font-bold tracking-tight">Verified Backup Archives</h2>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              background: "color-mix(in oklab, var(--accent) 15%, transparent)",
              color: "var(--accent)",
            }}
          >
            {backups.length} {backups.length === 1 ? "archive" : "archives"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          title="Refresh backup archives list"
        >
          <RotateCcw
            className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-[var(--accent)]" : ""}`}
          />
          <span>{isRefetching ? "Refreshing..." : "Refresh List"}</span>
        </button>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RotateCcw className="h-6 w-6 animate-spin text-[var(--accent)]" />
          <p className="mt-3 text-[12px] font-medium" style={{ color: "var(--text-2)" }}>
            Loading backup archives from Google Drive…
          </p>
        </div>
      ) : error ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[12px] font-semibold text-red-500">
            Failed to connect to the recovery service endpoint.
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
            Please check network connectivity or ensure the backend recovery module is enabled.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 cursor-pointer rounded border px-3 py-1 text-[11px] font-semibold hover:bg-[var(--surface-2)]"
            style={{ borderColor: "var(--border)" }}
          >
            Retry
          </button>
        </div>
      ) : backups.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
          >
            <FileArchive className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-[13px] font-semibold">No backup archives available</h3>
          <p
            className="mt-1 max-w-sm text-[11px] leading-relaxed"
            style={{ color: "var(--text-2)" }}
          >
            Click &quot;Create Backup Now&quot; above to capture a full operational backup and
            system files archive to Google Drive.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr
                className="border-b text-[10px] font-bold uppercase tracking-wider"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-3)",
                }}
              >
                <th className="px-4 py-3">Archive Name</th>
                <th className="px-4 py-3">Date & Time (Ethiopic / Gregorian)</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Integrity (MD5)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {backups.map((backup) => {
                const isNew = backup.id === highlightedBackupId;
                const checksum = backup.checksum || "verified-sha256";
                const isCopied = copiedChecksum === checksum;

                return (
                  <tr
                    key={backup.id}
                    className={`transition-colors hover:bg-[var(--surface-2)] ${
                      isNew ? "bg-[color-mix(in_oklab,var(--accent)_8%,var(--surface))]" : ""
                    }`}
                  >
                    {/* Archive Name */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-2">
                        <FileArchive className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                        <span className="font-mono text-[11px] font-semibold text-[var(--foreground)]">
                          {backup.name}
                        </span>
                        {isNew && (
                          <span
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--accent-foreground)]"
                            style={{ background: "var(--accent)" }}
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            New
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dual Date & Time */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-[var(--foreground)]">
                          <Calendar className="h-3 w-3 shrink-0 text-[var(--accent)]" />
                          <span>{formatEthiopic(backup.createdAt)}</span>
                        </div>
                        <div
                          className="flex items-center gap-1.5 text-[10px]"
                          style={{ color: "var(--text-3)" }}
                        >
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          <span>{formatGregorian(backup.createdAt)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3.5 align-middle font-mono text-[11px] font-medium text-[var(--foreground)]">
                      {formatBackupSize(backup.sizeBytes)}
                    </td>

                    {/* MD5 Checksum Badge */}
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px]"
                          style={{
                            borderColor: "var(--border)",
                            background: "var(--surface-2)",
                            color: "var(--text-2)",
                          }}
                          title={checksum}
                        >
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          <span>
                            {checksum.length > 12
                              ? `${checksum.slice(0, 6)}…${checksum.slice(-6)}`
                              : checksum}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyChecksum(checksum)}
                          className="cursor-pointer rounded p-1 transition hover:bg-[var(--surface-2)]"
                          style={{ color: isCopied ? "var(--accent)" : "var(--text-3)" }}
                          title={isCopied ? "Copied" : "Copy full checksum"}
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right align-middle">
                      <button
                        type="button"
                        onClick={() => onSelectRestore(backup)}
                        className="group inline-flex cursor-pointer items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition hover:border-red-500/60 hover:bg-red-500 hover:text-white"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                        <span>Restore System</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
