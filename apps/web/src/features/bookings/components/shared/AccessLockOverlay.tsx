import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { requestPermissionApi } from "@/features/notifications/services/notifications.api";

interface AccessLockOverlayProps {
  sectionName: string;
  permissionKey: string;
}

export function AccessLockOverlay({
  sectionName,
  permissionKey,
}: AccessLockOverlayProps) {
  const [requested, setRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequest = async () => {
    setIsSubmitting(true);
    try {
      await requestPermissionApi(
        permissionKey,
        `Requested view/edit access for ${sectionName}`
      );
      setRequested(true);
      toast.success(
        `Access request for "${permissionKey}" sent to administrators!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-lg backdrop-blur-[6px] p-4 text-center select-none"
      style={{ background: "rgba(18, 18, 18, 0.75)" }}
    >
      <div
        className="rounded-full bg-[var(--surface)] border p-3 shadow-lg mb-3"
        style={{ borderColor: "var(--border)" }}
      >
        <Lock className="h-6 w-6 text-amber-500 animate-pulse" />
      </div>
      <div className="text-[13px] font-bold">Access Restricted</div>
      <p className="text-[11px] text-[var(--text-2)] max-w-[240px] mt-1 mb-4 leading-relaxed">
        You do not have permission to view or manage the {sectionName} section.
      </p>
      <button
        disabled={requested || isSubmitting}
        onClick={handleRequest}
        className="rounded-md border px-4 py-2 text-[11px] font-bold tracking-wide transition hover:brightness-110 shadow-md disabled:opacity-50"
        style={{
          borderColor: "var(--border)",
          background: requested
            ? "color-mix(in oklab, var(--accent) 10%, var(--surface))"
            : "var(--accent)",
          color: requested
            ? "var(--color-bom-returned)"
            : "var(--accent-foreground)",
        }}
      >
        {isSubmitting
          ? "Sending..."
          : requested
            ? "✓ Request Sent to Admin"
            : "Request Permission from Admin"}
      </button>
    </div>
  );
}
