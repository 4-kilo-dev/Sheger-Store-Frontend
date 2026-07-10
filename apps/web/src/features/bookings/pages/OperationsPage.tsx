import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getBookingsApi, type Booking, type BookingStatus } from "@/features/bookings/services/bookings.api";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import {
  Search, Truck, Loader2, MapPin, Calendar, Users, User,
  RotateCcw, AlertCircle, Package, ChevronRight,
} from "lucide-react";

// ─── Column definitions ───────────────────────────────────────────────────────
const COLUMNS: Array<{
  id: string;
  label: string;
  statuses: BookingStatus[];
  accent: string;
  accentFg: string;
  emptyMsg: string;
}> = [
  {
    id: "dispatch",
    label: "Needs Dispatch",
    statuses: ["ACCEPTED", "PREPARATION"],
    accent: "#f59e0b",
    accentFg: "#78350f",
    emptyMsg: "No bookings awaiting dispatch.",
  },
  {
    id: "onsite",
    label: "Active On-Site",
    statuses: ["ONSITE"],
    accent: "#22c55e",
    accentFg: "#14532d",
    emptyMsg: "No active on-site deployments.",
  },
  {
    id: "retrieval",
    label: "Needs Retrieval",
    statuses: ["COMPLETED", "PARTIALLY_RETURNED"],
    accent: "#6366f1",
    accentFg: "#312e81",
    emptyMsg: "No gear awaiting warehouse return.",
  },
];

const STATUS_BADGE: Record<BookingStatus, { label: string; bg: string; fg: string }> = {
  ACCEPTED: { label: "ACCEPTED", bg: "#fef3c7", fg: "#92400e" },
  PREPARATION: { label: "PREPARATION", bg: "#dbeafe", fg: "#1e40af" },
  ONSITE: { label: "ONSITE", bg: "#dcfce7", fg: "#166534" },
  COMPLETED: { label: "COMPLETED", bg: "#ede9fe", fg: "#4c1d95" },
  PARTIALLY_RETURNED: { label: "PARTIAL RETURN", bg: "#fde8d8", fg: "#92400e" },
  RESERVED: { label: "RESERVED", bg: "#f3f4f6", fg: "#374151" },
  CONFIRMED: { label: "CONFIRMED", bg: "#d1fae5", fg: "#065f46" },
  ASSIGNED: { label: "ASSIGNED", bg: "#e0e7ff", fg: "#3730a3" },
  DONE: { label: "DONE", bg: "#f0fdf4", fg: "#15803d" },
  CANCELED: { label: "CANCELED", bg: "#fee2e2", fg: "#991b1b" },
};

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, colAccent }: { booking: Booking; colAccent: string }) {
  const { formatDate } = useDateFormatter();
  const navigate = useNavigate();
  const badge = STATUS_BADGE[booking.status];
  const crewCount = (booking.assignments || []).filter((a: any) => a.roleContext === "CREW" || a.roleContext === "TECHNICIAN").length;
  const hasDriver = !!booking.driver;

  return (
    <div
      onClick={() => navigate({ to: "/bookings/$code", params: { code: booking.code } })}
      className="group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface-2)",
        borderLeft: `3px solid ${colAccent}`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="font-mono text-[11px] font-bold tracking-wider" style={{ color: colAccent }}>
            {booking.code}
          </span>
          <div className="text-[14px] font-semibold leading-tight mt-0.5 line-clamp-1">
            {booking.client}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
            style={{ background: badge.bg, color: badge.fg }}
          >
            {badge.label}
          </span>
          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-3)" }} />
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{booking.venue || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{formatDate(booking.eventDate)}</span>
        </div>
      </div>

      {/* Conditional context row */}
      {booking.status === "ONSITE" && (
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
            <User className="h-3 w-3 shrink-0" style={{ color: colAccent }} />
            <span className="truncate">{booking.teamLeader || "No lead"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
            <Truck className="h-3 w-3 shrink-0" style={{ color: colAccent }} />
            <span className="truncate">{booking.driver || "No driver"}</span>
          </div>
        </div>
      )}

      {(booking.status === "ACCEPTED" || booking.status === "PREPARATION") && (
        <div className="mt-3 pt-3 border-t flex items-center gap-1.5 text-[11px]" style={{ borderColor: "var(--border)" }}>
          {crewCount > 0 ? (
            <>
              <Users className="h-3 w-3 shrink-0" style={{ color: colAccent }} />
              <span style={{ color: "var(--text-2)" }}>{crewCount} crew assigned</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 shrink-0 text-amber-400" />
              <span className="text-amber-400 font-medium">No crew assigned</span>
            </>
          )}
        </div>
      )}

      {(booking.status === "COMPLETED" || booking.status === "PARTIALLY_RETURNED") && (
        <div className="mt-3 pt-3 border-t flex items-center gap-1.5 text-[11px]" style={{ borderColor: "var(--border)" }}>
          <RotateCcw className="h-3 w-3 shrink-0" style={{ color: colAccent }} />
          <span style={{ color: "var(--text-2)" }}>
            {booking.status === "PARTIALLY_RETURNED" ? "Partial return — awaiting remainder" : "Awaiting warehouse return"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  col,
  bookings,
}: {
  col: typeof COLUMNS[number];
  bookings: Booking[];
}) {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "color-mix(in oklab, var(--surface-2) 60%, transparent)" }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: col.accent }} />
          <span className="text-[13px] font-bold tracking-tight">{col.label}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: `${col.accent}22`, color: col.accent }}
        >
          {bookings.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ maxHeight: "calc(100vh - 240px)", minHeight: "280px" }}>
        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center" style={{ color: "var(--text-3)" }}>
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-[12px]">{col.emptyMsg}</p>
          </div>
        ) : (
          bookings.map((b) => (
            <BookingCard key={b.id} booking={b} colAccent={col.accent} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Operations Page ──────────────────────────────────────────────────────────
export function OperationsPage() {
  const [search, setSearch] = useState("");
  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allBookings;
    return allBookings.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.client.toLowerCase().includes(q) ||
        (b.venue || "").toLowerCase().includes(q)
    );
  }, [allBookings, search]);

  const byColumn = useMemo(() =>
    Object.fromEntries(
      COLUMNS.map((col) => [
        col.id,
        filtered.filter((b) => col.statuses.includes(b.status)),
      ])
    ),
    [filtered]
  );

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div>
          <div className="label-eyebrow mb-1">Logistics & dispatch</div>
          <h1 className="text-[22px] font-bold tracking-tight">Operations Board</h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Oversee crew dispatch, monitor active deployments, and coordinate gear returns.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--text-3)" }} />
          <input
            type="text"
            placeholder="Search bookings, client, venue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border pl-9 pr-3 text-[13px] outline-none transition focus:ring-2"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 gap-3" style={{ color: "var(--text-2)" }}>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-[13px]">Loading operations data…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.id} col={col} bookings={byColumn[col.id] || []} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default OperationsPage;
