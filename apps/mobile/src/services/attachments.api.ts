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
