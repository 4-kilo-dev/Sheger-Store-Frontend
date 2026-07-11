import { Download, Trash2 } from "lucide-react";
import { formatBytes, getFileIcon } from "@/features/bookings/utils";
import type { Attachment } from "@/features/bookings/services/attachments.api";

interface FileCardProps {
  attachment: Attachment;
  onDownload: (attachment: Attachment) => void;
  onDelete: (id: string) => void;
  /** Visual layout — "row" for inline lists, "card" for grid layouts. */
  layout?: "row" | "card";
}

export function FileCard({
  attachment,
  onDownload,
  onDelete,
  layout = "row",
}: FileCardProps) {
  const f = attachment;

  if (layout === "card") {
    return (
      <div
        className="group relative flex items-start gap-3 rounded-lg border p-3.5 transition duration-200 hover:border-[var(--accent)] bg-[var(--surface-2)] hover:bg-[var(--surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mt-0.5 shrink-0">{getFileIcon(f.fileType)}</div>

        <div className="flex-1 min-w-0 pr-6">
          <div
            className="truncate text-[12.5px] font-bold"
            title={f.originalName}
          >
            {f.originalName}
          </div>
          <div
            className="text-[10px] mt-1 space-y-0.5"
            style={{ color: "var(--text-3)" }}
          >
            <div>{formatBytes(f.fileSizeBytes)}</div>
            <div>Uploaded by {f.uploaderName || "User"}</div>
            <div>{new Date(f.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onDownload(f)}
            title="Download File"
            className="rounded p-1 hover:bg-[var(--surface-2)] transition"
            style={{ color: "var(--accent)" }}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(f.id)}
            title="Delete File"
            className="rounded p-1 hover:bg-red-500/10 transition"
            style={{ color: "var(--destructive)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Row layout (compact, used in technician attachments)
  return (
    <div
      className="group flex items-center gap-3 rounded-md border p-2.5 transition hover:border-[var(--accent)] bg-[var(--surface-2)]"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="shrink-0">{getFileIcon(f.fileType)}</div>
      <div className="flex-1 min-w-0">
        <div
          className="truncate text-[12px] font-semibold"
          title={f.originalName}
        >
          {f.originalName}
        </div>
        <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
          {formatBytes(f.fileSizeBytes)} ·{" "}
          {new Date(f.createdAt).toLocaleDateString()}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onDownload(f)}
          title="Download"
          className="rounded p-1 hover:bg-[var(--surface)] transition"
          style={{ color: "var(--accent)" }}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(f.id)}
          title="Delete"
          className="rounded p-1 hover:bg-red-500/10 transition"
          style={{ color: "var(--destructive)" }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
