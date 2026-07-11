import { Link } from "@tanstack/react-router";
import { ArrowLeft, Printer, Share2, Edit3, MoreHorizontal } from "lucide-react";
import type { BookingAction } from "@/features/bookings/constants";

interface BookingActionBarProps {
  isTechnician: boolean;
  computedActions: BookingAction[];
  setSelectedAction: (act: BookingAction | null) => void;
  setShowActionModal: (show: boolean) => void;
  setCancellationReason: (reason: string) => void;
}

export function BookingActionBar({
  isTechnician,
  computedActions,
  setSelectedAction,
  setShowActionModal,
  setCancellationReason,
}: BookingActionBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Link
        to="/bookings"
        className="flex items-center gap-2 text-[12px] font-semibold transition hover:opacity-80"
        style={{ color: "var(--text-2)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Bookings
      </Link>
      <div className="flex items-center gap-2">
        {[
          { icon: Printer, label: "Print" },
          { icon: Share2, label: "Share" },
          { icon: Edit3, label: "Edit" },
        ]
          .filter((item) => !(isTechnician && item.label === "Edit"))
          .map(({ icon: I, label }) => (
            <button
              key={label}
              className="flex h-8 items-center gap-1.5 rounded-md border bg-[var(--surface)] px-2.5 text-[12px] transition hover:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              <I className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        {!isTechnician &&
          computedActions.map((act) => (
            <button
              key={act.id}
              onClick={() => {
                setSelectedAction(act);
                setShowActionModal(true);
                setCancellationReason(""); // reset reason
              }}
              className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition hover:brightness-110"
              style={{
                background:
                  act.variant === "destructive"
                    ? "var(--destructive)"
                    : act.variant === "outline"
                      ? "transparent"
                      : "var(--accent)",
                color: act.variant === "outline" ? "var(--text-1)" : "var(--accent-foreground)",
                border: act.variant === "outline" ? "1px solid var(--border)" : "none",
              }}
            >
              <act.icon className="h-3.5 w-3.5" />
              {act.label}
            </button>
          ))}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md border"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
