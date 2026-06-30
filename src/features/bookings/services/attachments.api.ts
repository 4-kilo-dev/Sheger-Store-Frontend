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

// In-memory registry to hold local Object URLs for session-based downloading
const localFileUrls: Record<string, string> = {};

const isBrowser = typeof window !== "undefined";

const DEFAULT_ATTACHMENTS: Record<string, Attachment[]> = {
  "SB020": [
    {
      id: "att-1",
      bookingId: "SB020",
      objectKey: "bookings/SB020/contract_signed.pdf",
      originalName: "Contract_signed.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 1258291, // 1.2 MB
      uploaderName: "Nathan B.",
      createdAt: "2026-05-10T10:00:00Z"
    },
    {
      id: "att-2",
      bookingId: "SB020",
      objectKey: "bookings/SB020/site_survey_photos.zip",
      originalName: "Site_survey_photos.zip",
      fileType: "application/zip",
      fileSizeBytes: 18874368, // 18 MB
      uploaderName: "Samuel K.",
      createdAt: "2026-05-11T12:30:00Z"
    },
    {
      id: "att-3",
      bookingId: "SB020",
      objectKey: "bookings/SB020/stage_diagram.pdf",
      originalName: "Stage_diagram.pdf",
      fileType: "application/pdf",
      fileSizeBytes: 655360, // 640 KB
      uploaderName: "Bereket G.",
      createdAt: "2026-05-11T14:45:00Z"
    },
    {
      id: "att-4",
      bookingId: "SB020",
      objectKey: "bookings/SB020/bom_approved.xlsx",
      originalName: "BOM_approved.xlsx",
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileSizeBytes: 122880, // 120 KB
      uploaderName: "Eyob W.",
      createdAt: "2026-05-13T09:15:00Z"
    }
  ]
};

// Helper to get local attachments list
function getLocalAttachments(bookingId: string): Attachment[] {
  if (!isBrowser) return DEFAULT_ATTACHMENTS[bookingId] || [];
  
  const saved = localStorage.getItem(`vortex_attachments_${bookingId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  
  // Set default if it's the mock booking
  if (DEFAULT_ATTACHMENTS[bookingId]) {
    localStorage.setItem(`vortex_attachments_${bookingId}`, JSON.stringify(DEFAULT_ATTACHMENTS[bookingId]));
    return DEFAULT_ATTACHMENTS[bookingId];
  }
  
  return [];
}

// Helper to save local attachments list
function saveLocalAttachments(bookingId: string, attachments: Attachment[]) {
  if (!isBrowser) return;
  localStorage.setItem(`vortex_attachments_${bookingId}`, JSON.stringify(attachments));
}

// ----------------------------------------------------
// Attachments APIs
// ----------------------------------------------------

export async function getBookingAttachmentsApi(bookingId: string): Promise<Attachment[]> {
  let serverAttachments: Attachment[] = [];
  try {
    serverAttachments = await client.get<Attachment[]>(`/api/bookings/${bookingId}/attachments`);
  } catch (error) {
    console.warn(`Failed to fetch attachments for ${bookingId} from server, returning mock.`, error);
    return getLocalAttachments(bookingId);
  }

  // Merge server-returned attachments with local mock entries so uploaded mock files show up
  const local = getLocalAttachments(bookingId);
  const merged = [...serverAttachments];
  for (const locAtt of local) {
    if (!merged.some(s => s.id === locAtt.id || s.objectKey === locAtt.objectKey)) {
      merged.push(locAtt);
    }
  }
  return merged;
}

export async function getUploadUrlApi(
  bookingId: string,
  payload: {
    fileName: string;
    fileType: string;
    relatedEntity?: string;
    relatedId?: string;
  }
): Promise<{ uploadUrl: string; objectKey: string }> {
  try {
    return await client.post<{ uploadUrl: string; objectKey: string }>(
      `/api/bookings/${bookingId}/attachments/upload-url`,
      payload
    );
  } catch (error) {
    console.warn("Failed to retrieve upload URL from server, returning mock values.", error);
    const mockUuid = Math.random().toString(36).substr(2, 9);
    return {
      uploadUrl: `mock://vortex-s3.local/attachments/${bookingId}/${mockUuid}_${payload.fileName}`,
      objectKey: `attachments/${bookingId}/${mockUuid}_${payload.fileName}`
    };
  }
}

/**
 * Double-Hop Step 2: PUT file directly to S3 / MinIO
 */
export async function uploadFileDirectApi(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  // If it's a mock upload URL, simulate progress and store in-memory Object URL
  if (uploadUrl.startsWith("mock://")) {
    return new Promise((resolve) => {
      let percent = 0;
      const interval = setInterval(() => {
        percent += 10;
        onProgress(percent);
        if (percent >= 100) {
          clearInterval(interval);
          // Register the file's object URL in-memory
          const key = uploadUrl.replace("mock://vortex-s3.local/", "");
          if (isBrowser) {
            localFileUrls[key] = URL.createObjectURL(file);
          }
          resolve();
        }
      }, 100);
    });
  }

  // Real upload using XMLHttpRequest to track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };
    
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(file);
  });
}

/**
 * Double-Hop Step 3: Confirm upload and record metadata
 */
export async function confirmUploadApi(
  bookingId: string,
  payload: {
    objectKey: string;
    originalName: string;
    fileType: string;
    fileSizeBytes: number;
    relatedEntity?: string;
    relatedId?: string;
  }
): Promise<Attachment> {
  try {
    return await client.post<Attachment>(`/api/bookings/${bookingId}/attachments/confirm`, payload);
  } catch (error) {
    console.warn("Failed to confirm upload metadata on server, saving to mock storage.", error);
    
    const activeProfile = isBrowser ? localStorage.getItem("vortex_active_profile") : null;
    const uploaderName = activeProfile ? JSON.parse(activeProfile).name : "User";

    const newAttachment: Attachment = {
      id: `att-${Math.random().toString(36).substr(2, 9)}`,
      bookingId,
      objectKey: payload.objectKey,
      originalName: payload.originalName,
      fileType: payload.fileType,
      fileSizeBytes: payload.fileSizeBytes,
      relatedEntity: payload.relatedEntity,
      relatedId: payload.relatedId,
      uploaderName,
      createdAt: new Date().toISOString()
    };

    const currentList = getLocalAttachments(bookingId);
    // Add to list and save
    const updatedList = [newAttachment, ...currentList];
    saveLocalAttachments(bookingId, updatedList);
    
    // Copy the Object URL mapping to the new attachment ID as well
    if (localFileUrls[payload.objectKey]) {
      localFileUrls[newAttachment.id] = localFileUrls[payload.objectKey];
    }
    
    return newAttachment;
  }
}

export async function getDownloadUrlApi(attachmentId: string): Promise<{ downloadUrl: string }> {
  try {
    return await client.get<{ downloadUrl: string }>(`/api/attachments/${attachmentId}/download-url`);
  } catch (error) {
    console.warn(`Failed to fetch download url for ${attachmentId} from server, returning mock.`, error);
    
    // Check if we have an in-memory local file URL
    if (localFileUrls[attachmentId]) {
      return { downloadUrl: localFileUrls[attachmentId] };
    }
    
    // Otherwise, generate a simulated dummy download URL or a placeholder
    return { downloadUrl: "#" };
  }
}

export async function deleteAttachmentApi(attachmentId: string): Promise<void> {
  try {
    await client.delete(`/api/attachments/${attachmentId}`);
  } catch (error) {
    console.warn(`Failed to delete attachment ${attachmentId} on server, deleting from mock storage.`, error);
    
    // Look through all local storage files and filter out this attachment
    if (isBrowser) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("vortex_attachments_")) {
          try {
            const list: Attachment[] = JSON.parse(localStorage.getItem(key) || "[]");
            const filtered = list.filter((a) => a.id !== attachmentId);
            localStorage.setItem(key, JSON.stringify(filtered));
          } catch {
            // ignore
          }
        }
      }
    }
    
    // Clean up in-memory object URL if present
    delete localFileUrls[attachmentId];
  }
}
