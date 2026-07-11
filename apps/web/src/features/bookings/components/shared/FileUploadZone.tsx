import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface FileUploadZoneProps {
  /** Unique HTML id for the hidden file input (must be unique per page if multiple zones exist). */
  inputId: string;
  /** Called with the selected File when the user picks or drops one. */
  onFileSelect: (file: File) => void;
  /** Whether an upload is currently in progress. */
  isUploading: boolean;
  /** Upload progress percentage (0–100). */
  uploadProgress?: number;
  /** Name of the file currently being uploaded (shown during progress). */
  uploadingFileName?: string;
  /** Optional size variant — "compact" uses less padding. */
  variant?: "default" | "compact";
}

export function FileUploadZone({
  inputId,
  onFileSelect,
  isUploading,
  uploadProgress = 0,
  uploadingFileName = "",
  variant = "default",
}: FileUploadZoneProps) {
  const handleDragEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files?.[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds the 20MB limit.");
        return;
      }
      onFileSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds the 20MB limit.");
        return;
      }
      onFileSelect(file);
    }
  };

  const padding = variant === "compact" ? "p-4" : "p-6";

  return (
    <div
      onDragEnter={handleDragEvent}
      onDragOver={handleDragEvent}
      onDragLeave={handleDragEvent}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed ${padding} text-center transition-all border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-2)]`}
    >
      <input
        type="file"
        id={inputId}
        className="hidden"
        disabled={isUploading}
        onChange={handleFileInput}
      />
      <label htmlFor={inputId} className="cursor-pointer block">
        {isUploading ? (
          <div className="space-y-2">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--accent)]" />
            <div className="text-[11px] font-semibold">
              Uploading {uploadingFileName}... {uploadProgress}%
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 bg-[var(--accent)]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-6 w-6 mb-1.5 text-[var(--accent)]" />
            <span className="text-[12px] font-bold block">
              Drag & Drop or{" "}
              <span style={{ color: "var(--accent)" }}>browse</span>
            </span>
            <span
              className="text-[10px] block mt-0.5"
              style={{ color: "var(--text-3)" }}
            >
              PDFs, images, spreadsheets, archives up to 20MB
            </span>
          </>
        )}
      </label>
    </div>
  );
}
