import { Link, useNavigate } from "@tanstack/react-router";
import { useNotifications } from "../context/NotificationsContext";
import { resolveNotificationDisplay } from "../services/notifications.api";
import { ClipboardList, AlertTriangle, ArrowRight, ShieldAlert, Check } from "lucide-react";

export function PendingTasksWidget() {
  const navigate = useNavigate();
  const { pendingTasks, isLoading, markAsRead } = useNotifications();

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return { color: "var(--destructive)", bg: "rgba(229, 70, 102, 0.15)", border: "1px solid rgba(229, 70, 102, 0.3)" };
      case "NORMAL":
        return { color: "var(--color-status-reserved)", bg: "rgba(253, 224, 71, 0.1)", border: "1px solid rgba(253, 224, 71, 0.2)" };
      default:
        return { color: "var(--text-3)", bg: "var(--surface-2)", border: "1px solid var(--border)" };
    }
  };

  return (
    <div className="rounded-lg border p-4 flex flex-col h-full" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between border-b pb-2.5 mb-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4.5 w-4.5" style={{ color: "var(--accent)" }} />
          <span className="text-[13px] font-bold">Task Center</span>
        </div>
        {pendingTasks.length > 0 && (
          <span className="rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] px-1.5 py-0.5 font-mono font-bold animate-pulse">
            {pendingTasks.length} Action Required
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-[11px]" style={{ color: "var(--text-3)" }}>Loading tasks...</div>
      ) : pendingTasks.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center flex-1">
          <Check className="h-7 w-7 mb-1.5 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full p-1.5" />
          <div className="text-[12px] font-semibold text-foreground">All Caught Up!</div>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>No pending tasks require action.</p>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
          {pendingTasks.map((t) => {
            const pStyle = getPriorityStyle(t.priority);
            const display = resolveNotificationDisplay(t);

            let redirectPath = display.linkTo || "/notifications";
            let actionLabel = "View Task";

            if (t.eventType === "booking.technical_allocated" || display.linkTo?.startsWith("/bookings/")) {
              actionLabel = t.eventType === "booking.technical_allocated" ? "Open to quote" : "Review Booking";
            } else if (t.relatedEntity === "assignment") {
              actionLabel = "Reassign Crew";
            } else if (t.relatedEntity === "damage_missing_report") {
              actionLabel = "Inspect Damage";
            }

            return (
              <div 
                key={t.id} 
                className="rounded border p-3 bg-[var(--surface-2)] transition hover:border-[var(--accent)] flex flex-col justify-between gap-2.5 text-[11.5px]"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold truncate" style={{ color: "var(--foreground)" }}>{display.title}</span>
                    <span 
                      className="rounded text-[8px] font-bold uppercase px-1.5 py-0.5 tracking-wider shrink-0"
                      style={{ color: pStyle.color, background: pStyle.bg, border: pStyle.border }}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <p className="leading-relaxed leading-5 text-[11px]" style={{ color: "var(--text-2)" }}>{t.detail}</p>
                </div>

                <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
                  <span className="font-mono text-[9px]" style={{ color: "var(--text-3)" }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                  
                  <button
                    onClick={() => {
                      navigate({ to: redirectPath as any });
                      markAsRead(t.id);
                    }}
                    className="flex items-center gap-1 font-bold text-[10.5px] hover:opacity-85 transition"
                    style={{ color: "var(--accent)" }}
                  >
                    {actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
