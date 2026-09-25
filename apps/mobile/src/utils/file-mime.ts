const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

export const COMMON_DOCUMENT_TYPES = [
  "image/*",
  "video/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
];

export function fileExtension(nameOrUri: string): string {
  const cleaned = nameOrUri.split("?")[0]?.split("#")[0] ?? nameOrUri;
  const base = cleaned.split("/").pop() ?? cleaned;
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function mimeTypeForFile(nameOrUri: string, declaredType?: string | null): string {
  const declared = declaredType?.trim().toLowerCase() ?? "";
  if (declared === "image/jpg" || declared === "image/pjpeg") return "image/jpeg";
  if (declared.includes("/") && declared !== "image" && declared !== "video" && declared !== "audio") {
    return declared;
  }
  const ext = fileExtension(nameOrUri);
  if (ext && MIME_BY_EXTENSION[ext]) return MIME_BY_EXTENSION[ext];
  if (declared === "video") return "video/mp4";
  if (declared === "image") return "image/jpeg";
  return "application/octet-stream";
}
