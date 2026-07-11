import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import { FileUploadZone } from "@/features/bookings/components/shared/FileUploadZone";
import { FileCard } from "@/features/bookings/components/shared/FileCard";
import { DeleteConfirmModal } from "@/features/bookings/components/shared/DeleteConfirmModal";
import { useFileUpload } from "@/features/bookings/hooks/useFileUpload";
import type { Booking } from "@/features/bookings/services/bookings.api";

export function FilesTab({ b }: { b: Booking }) {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    uploadFile,
    deleteAttachment,
    isUploading,
    uploadProgress,
    uploadingFileName,
    handleDownload,
    attachments,
    isLoading,
  } = useFileUpload(b);

  const filteredList =
    attachments?.filter((att) => {
      if (entityFilter === "all") return true;
      if (entityFilter === "general") return !att.relatedEntity;
      return att.relatedEntity === entityFilter;
    }) || [];

  return (
    <Section title="Files & Attachments" icon={Paperclip}>
      <div className="space-y-4">
        {/* Upload Interface and Active Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <FileUploadZone
              inputId="file-upload-input"
              onFileSelect={uploadFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              uploadingFileName={uploadingFileName}
            />
          </div>

          <div className="flex flex-col justify-center space-y-3">
            {isUploading ? (
              <div
                className="rounded-md border p-3.5 space-y-2 bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 truncate">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                    Uploading {uploadingFileName}...
                  </span>
                  <span className="font-mono text-[var(--accent)]">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-[var(--accent)]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="rounded-md border p-4 bg-[var(--surface-2)] text-[11.5px] leading-relaxed"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                <div className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                  🔒 Double-Hop S3 Upload
                </div>
                Files stream directly from your browser to our secure storage bucket, bypassing backend
                memory to guarantee performance.
              </div>
            )}
          </div>
        </div>

        {/* Files Repository Section */}
        <div className="mt-6 space-y-3">
          <div
            className="flex items-center justify-between border-b pb-2"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="label-eyebrow text-[10px]">Files Repository</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span style={{ color: "var(--text-3)" }}>Filter:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="rounded border bg-[var(--surface-2)] px-2 py-0.5"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="all">All Attachments</option>
                <option value="general">General Files</option>
                <option value="damage_report">Damage Reports</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              Loading files...
            </div>
          ) : filteredList.length === 0 ? (
            <div
              className="py-10 text-center border border-dashed rounded-lg"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <Paperclip className="h-8 w-8 mx-auto mb-2 text-zinc-500" />
              <div className="text-[13px] font-semibold">No Attachments Found</div>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
                Use the dropzone above to link documents to this booking.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredList.map((f) => (
                <FileCard
                  key={f.id}
                  attachment={f}
                  onDownload={handleDownload}
                  onDelete={(id) => setDeletingId(id)}
                  layout="card"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isDeleting={false}
        onConfirm={() => {
          if (deletingId) {
            deleteAttachment(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </Section>
  );
}
