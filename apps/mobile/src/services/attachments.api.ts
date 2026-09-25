import { client } from "@/lib/api/client";
import { fileExtension, mimeTypeForFile } from "@/utils/file-mime";

export interface Attachment {
  id: string;
  bookingId: string;
  objectKey: string;
  originalName: string;
  fileType: string;
  fileSizeBytes: number;
  relatedEntity?: string;
  relatedId?: string;
  uploaderName?: string;
  createdAt: string;
}

export type UploadFilePart = {
  uri: string;
  name: string;
  type?: string | null;
  fileSize?: number | null;
};

export async function getBookingAttachmentsApi(bookingId: string): Promise<Attachment[]> {
  const serverAttachments = await client.get<Attachment[]>(
    `/api/bookings/${bookingId}/attachments`,
  );
  return serverAttachments || [];
}

export async function deleteAttachmentApi(attachmentId: string): Promise<void> {
  return client.delete(`/api/attachments/${attachmentId}`);
}

export async function getDownloadUrlApi(attachmentId: string): Promise<{ downloadUrl: string }> {
  return client.get<{ downloadUrl: string }>(`/api/attachments/${attachmentId}/download-url`);
}

function isUnsupportedFormDataPart(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("unsupported formdatapart");
}

async function blobFromUri(uri: string, mimeType: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Could not read the selected file.");
  }
  const blob = await response.blob();
  if (blob.type && blob.type !== "application/octet-stream") return blob;
  return blob.slice(0, blob.size, mimeType);
}

function appendUriFile(formData: FormData, name: string, type: string, uri: string) {
  formData.append(
    "file",
    {
      uri,
      name,
      type,
    } as unknown as Blob,
  );
}

async function buildFormData(
  file: UploadFilePart,
  preferBlob: boolean,
  meta?: { relatedEntity?: string; relatedId?: string },
): Promise<FormData> {
  const name = file.name || `attachment_${Date.now()}.${fileExtension(file.uri) || "bin"}`;
  const type = mimeTypeForFile(name, file.type);
  const formData = new FormData();

  if (preferBlob) {
    const blob = await blobFromUri(file.uri, type);
    const part =
      typeof File !== "undefined" ? new File([blob], name, { type: blob.type || type }) : blob;
    formData.append("file", part, name);
  } else {
    appendUriFile(formData, name, type, file.uri);
  }

  if (meta?.relatedEntity) formData.append("relatedEntity", meta.relatedEntity);
  if (meta?.relatedId) formData.append("relatedId", meta.relatedId);
  return formData;
}

/**
 * Upload a file attachment for a booking.
 * Uses a multipart/form-data POST to the backend which proxies to S3.
 */
export async function uploadBookingAttachmentApi(
  bookingId: string,
  file: UploadFilePart,
  meta?: { relatedEntity?: string; relatedId?: string },
): Promise<Attachment> {
  const maxBytes = 20 * 1024 * 1024;
  if (file.fileSize && file.fileSize > maxBytes) {
    throw new Error("File size exceeds the 20MB limit.");
  }

  const post = (formData: FormData) =>
    client.post<Attachment>(`/api/bookings/${bookingId}/attachments/file-upload`, formData);

  try {
    return await post(await buildFormData(file, true, meta));
  } catch (error) {
    if (!isUnsupportedFormDataPart(error)) throw error;
    return post(await buildFormData(file, false, meta));
  }
}
