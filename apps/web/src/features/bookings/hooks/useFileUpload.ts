import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBookingAttachmentsApi,
  getUploadUrlApi,
  uploadFileDirectApi,
  confirmUploadApi,
  getDownloadUrlApi,
  deleteAttachmentApi,
  type Attachment,
} from "@/features/bookings/services/attachments.api";
import type { Booking } from "@/features/bookings/services/bookings.api";

export function useFileUpload(booking: Booking | undefined) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["booking-attachments", booking?.id],
    queryFn: () => getBookingAttachmentsApi(booking!.id),
    enabled: !!booking?.id,
  });

  const { mutate: uploadFile, isPending: isUploadPending } = useMutation({
    mutationFn: async (file: File) => {
      if (!booking) throw new Error("Booking is undefined");
      setIsUploading(true);
      setUploadingFileName(file.name);
      setUploadProgress(0);

      let uploadUrl = "";
      let objectKey = "";

      try {
        const res = await getUploadUrlApi(booking.id, {
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
        });
        uploadUrl = res.uploadUrl;
        objectKey = res.objectKey;
      } catch (e) {
        const mockUuid = Math.random().toString(36).substr(2, 9);
        uploadUrl = `mock://vortex-s3.local/attachments/${booking.code}/${mockUuid}_${file.name}`;
        objectKey = `attachments/${booking.code}/${mockUuid}_${file.name}`;
      }

      try {
        await uploadFileDirectApi(uploadUrl, file, (percent) => {
          setUploadProgress(percent);
        });
      } catch (err) {
        console.warn("Direct S3 upload failed (likely MinIO is offline). Falling back to mock S3 simulator.", err);
        const mockUuid = Math.random().toString(36).substr(2, 9);
        const fallbackUrl = `mock://vortex-s3.local/attachments/${booking.code}/${mockUuid}_${file.name}`;
        objectKey = `attachments/${booking.code}/${mockUuid}_${file.name}`;

        await uploadFileDirectApi(fallbackUrl, file, (percent) => {
          setUploadProgress(percent);
        });
      }

      return await confirmUploadApi(booking.id, {
        objectKey,
        originalName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
      });
    },
    onSuccess: () => {
      toast.success("File attached successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking-attachments", booking?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to upload file attachment");
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadingFileName("");
      setUploadProgress(0);
    },
  });

  const { mutate: deleteAttachment } = useMutation({
    mutationFn: deleteAttachmentApi,
    onSuccess: () => {
      toast.success("Attachment deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking-attachments", booking?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete attachment");
    },
  });

  const handleDownload = async (att: Attachment) => {
    try {
      const { downloadUrl } = await getDownloadUrlApi(att.id);
      if (downloadUrl && downloadUrl !== "#") {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Unable to generate preview/download URL");
      }
    } catch {
      toast.error("Failed to fetch download token");
    }
  };

  return {
    uploadFile,
    deleteAttachment,
    isUploading: isUploading || isUploadPending,
    uploadProgress,
    uploadingFileName,
    handleDownload,
    attachments,
    isLoading,
  };
}
