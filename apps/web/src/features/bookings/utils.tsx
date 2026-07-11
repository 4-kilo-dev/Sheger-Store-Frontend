import { File, FileArchive, FileText, Image } from "lucide-react";

/**
 * Format a byte count into a human-readable string (e.g. "1.5 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Return a colored Lucide icon element based on MIME type.
 */
export function getFileIcon(mime: string) {
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return <FileText className="h-7 w-7 text-red-400" />;
  if (m.includes("image/"))
    return <Image className="h-7 w-7 text-emerald-400" />;
  if (
    m.includes("zip") ||
    m.includes("tar") ||
    m.includes("rar") ||
    m.includes("compressed")
  ) {
    return <FileArchive className="h-7 w-7 text-amber-400" />;
  }
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv")) {
    return <FileText className="h-7 w-7 text-emerald-500" />;
  }
  return <File className="h-7 w-7 text-zinc-400" />;
}
