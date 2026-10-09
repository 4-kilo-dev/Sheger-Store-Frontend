import { AlertTriangle } from "lucide-react";

interface AdminOverrideBannerProps {
  className?: string;
  message?: string;
}

export function AdminOverrideBanner({
  className = "",
  message = "You are editing a completed or canceled booking. Changes will be audited.",
}: AdminOverrideBannerProps) {
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] font-medium text-amber-700 dark:text-amber-400 ${className}`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        <strong>Admin Override:</strong> {message}
      </span>
    </div>
  );
}
