import { useState } from "react";
import { Package, Paperclip } from "lucide-react";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { Section } from "@/features/bookings/components/shared/Section";
import { FileUploadZone } from "@/features/bookings/components/shared/FileUploadZone";
import { FileCard } from "@/features/bookings/components/shared/FileCard";
import { DeleteConfirmModal } from "@/features/bookings/components/shared/DeleteConfirmModal";
import { useFileUpload } from "@/features/bookings/hooks/useFileUpload";
import type { OverviewSectionProps } from "./types";

/** ACCEPTED field-tech workspace: assignment brief + schematic uploads (BOM lives in Equipment). */
export function TechnicianAcceptedWorkspace({ b }: OverviewSectionProps) {
  const { formatDate } = useDateFormatter();
  const [techDeletingId, setTechDeletingId] = useState<string | null>(null);

  const {
    uploadFile: techUploadFile,
    deleteAttachment: techDeleteAttachment,
    isUploading: isTechUploading,
    uploadProgress: techUploadProgress,
    uploadingFileName: techUploadingFileName,
    handleDownload: handleTechDownload,
    attachments: techAttachments,
    isLoading: techAttachmentsLoading,
  } = useFileUpload(b);

  return (
    <>
      <Section title="Your Assignment — Equipment & Setup Brief" icon={Package}>
        <div className="space-y-4">
          <div
            className="rounded-md border p-3"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in oklab, var(--accent) 6%, var(--surface-2))",
            }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-3)" }}
            >
              Equipment Specifications
            </div>
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <span style={{ color: "var(--text-3)" }}>Screen Type</span>
                <div className="font-semibold font-mono mt-0.5">{b.screenType || "—"}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-3)" }}>Size</span>
                <div className="font-semibold font-mono mt-0.5">
                  {b.size ? `${b.size} sqm` : "—"}
                </div>
              </div>
              <div>
                <span style={{ color: "var(--text-3)" }}>Arrangement</span>
                <div className="font-semibold font-mono mt-0.5">{b.arrangement || "—"}</div>
              </div>
            </div>
          </div>

          {b.ctoNotes && (
            <div
              className="rounded-md border p-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "var(--text-3)" }}
              >
                CTO Technical Notes
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-1)" }}>
                {b.ctoNotes}
              </p>
            </div>
          )}

          <div
            className="rounded-md border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: "var(--text-3)" }}
            >
              Event Schedule
            </div>
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <span style={{ color: "var(--text-3)" }}>Assembly</span>
                <div className="font-semibold font-mono mt-0.5">{formatDate(b.assemblyDate)}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-3)" }}>Event</span>
                <div className="font-semibold font-mono mt-0.5">{formatDate(b.eventDate)}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-3)" }}>Dismantle</span>
                <div className="font-semibold font-mono mt-0.5">{formatDate(b.dismantleDate)}</div>
              </div>
            </div>
            <div className="mt-2 text-[12px]">
              <span style={{ color: "var(--text-3)" }}>Venue: </span>
              <span className="font-semibold">{b.venue}</span>
            </div>
          </div>

          <div
            className="rounded-md border border-dashed p-3 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
              Manage BOM in Equipment tab
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>
              Add, update, and remove bill-of-materials lines from the Equipment tab.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Schematic & Attachments" icon={Paperclip}>
        <div className="space-y-3">
          <FileUploadZone
            inputId="tech-file-upload"
            onFileSelect={techUploadFile}
            isUploading={isTechUploading}
            uploadProgress={techUploadProgress}
            uploadingFileName={techUploadingFileName}
          />

          {techAttachmentsLoading ? (
            <div className="py-4 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
              Loading files...
            </div>
          ) : techAttachments.length === 0 ? (
            <div className="py-4 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
              No attachments yet. Upload schematic drawings or rigging diagrams above.
            </div>
          ) : (
            <div className="space-y-2">
              {techAttachments.map((f) => (
                <FileCard
                  key={f.id}
                  attachment={f}
                  onDownload={handleTechDownload}
                  onDelete={(id) => setTechDeletingId(id)}
                  layout="row"
                />
              ))}
            </div>
          )}
        </div>
      </Section>

      {techDeletingId && (
        <DeleteConfirmModal
          isDeleting={false}
          onConfirm={() => {
            if (techDeletingId) {
              techDeleteAttachment(techDeletingId);
              setTechDeletingId(null);
            }
          }}
          onCancel={() => setTechDeletingId(null)}
        />
      )}
    </>
  );
}
