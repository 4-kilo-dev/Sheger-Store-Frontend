import { client } from "@/lib/api/client";

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

/**
 * Upload a file attachment for a booking.
 * Uses a multipart/form-data POST to the backend which proxies to S3.
 * Mirrors apps/web/src/features/bookings/services/attachments.api.ts uploadBookingAttachmentApi.
 */
export async function uploadBookingAttachmentApi(
  bookingId: string,
  file: { uri: string; name: string; type: string; fileSize?: number | null },
  meta?: { relatedEntity?: string; relatedId?: string },
): Promise<Attachment> {
  const maxBytes = 20 * 1024 * 1024;
  if (file.fileSize && file.fileSize > maxBytes) {
    throw new Error("File size exceeds the 20MB limit.");
  }
  const formData = new FormData();
  // React Native's FormData accepts { uri, name, type } objects directly
  formData.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  if (meta?.relatedEntity) formData.append("relatedEntity", meta.relatedEntity);
  if (meta?.relatedId) formData.append("relatedId", meta.relatedId);

  return client.post<Attachment>(`/api/bookings/${bookingId}/attachments/file-upload`, formData);
}
