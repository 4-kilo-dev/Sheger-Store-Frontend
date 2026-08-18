import { createFileRoute, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Filter, ArrowUpDown, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { FilterDropdown, SortButton } from "@/components/filter-dropdown";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBookingsApi,
  transitionBookingStatusApi,
  STATUS_ORDER,
  STATUS_LABELS,
  type Booking,
  type BookingStatus,
  type PaymentStatus,
  type ScreenType,
} from "@/features/bookings/services/bookings.api";
import { getStaffApi } from "@/features/users/services/staff.api";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { useDateFormatter } from "@/context/CalendarSystemContext";

const BULK_STATUS_TARGETS: BookingStatus[] = [
  ...STATUS_ORDER,
  "CANCELED",
  "PARTIALLY_RETURNED",
];

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(csvEscape).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function runBulkTransitions(
  codes: string[],
  toStatus: BookingStatus,
  reason: string,
  override = false,
): Promise<{ ok: string[]; failed: { code: string; message: string }[] }> {
  const ok: string[] = [];
  const failed: { code: string; message: string }[] = [];
  for (const code of codes) {
    try {
      await transitionBookingStatusApi(code, toStatus, reason, override);
      ok.push(code);
    } catch (err: any) {
      failed.push({
        code,
        message: err?.message || err?.error || "Transition failed",
      });
    }
  }
  return { ok, failed };
}

const _Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings · Vortex Visual" },
      { name: "description", content: "All LED screen rental bookings, schedules, and assignments." },
    ],
  }),
  component: BookingsIndex,
});

const TABS = ["All", "This Week", "Upcoming", "Onsite", "Last Week", "Assigned to Me"] as const;

const ALL_STATUSES = STATUS_ORDER.map((s) => STATUS_LABELS[s]);
const ALL_SCREEN_TYPES: ScreenType[] = ["P2.97", "P2.97-New", "P3.91 INDOOR", "P3.91 OUTDOOR", "P4", "P5"];
const ALL_PAYMENTS: PaymentStatus[] = ["PAID", "ADVANCE", "UNPAID"];

/** Calendar-day bounds for week tabs (Mon–Sun, local timezone). */
function getWeekBounds(weeksAgo = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = start.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset - weeksAgo * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function parseBookingInstant(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** This/Last Week = event date falls on a day inside the week (not rental-window overlap). */
function bookingEventInWeek(b: Booking, start: Date, end: Date): boolean {
  const event = parseBookingInstant(b.eventDate);
  if (!event) return false;
  return event >= start && event <= end;
}

export function BookingsIndex() {
  const { formatDate } = useDateFormatter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const { can } = usePermissions();
  /** Assigned-scope actors (no view_all) get the simplified assignments list. */
  const isAssignedScopeOnly =
    !can(PERMISSION.BOOKING_VIEW_ALL) && can(PERMISSION.BOOKING_VIEW_ASSIGNED);
  const canCreateBooking = can(PERMISSION.BOOKING_CREATE);
  const canCancel =
    can(PERMISSION.BOOKING_CANCEL) || can(PERMISSION.BOOKING_CANCEL_OVERRIDE);
  const canChangeStatus =
    can(PERMISSION.BOOKING_CONFIRM) ||
    can(PERMISSION.BOOKING_EDIT) ||
    canCancel;
  const searchParams = useRouterState({ select: (s) => s.location.search }) as any;
  const [query, setQuery] = useState(typeof searchParams.q === "string" ? searchParams.q : "");
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<"status" | "cancel" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BookingStatus>("CONFIRMED");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Query bookings from backend
  const { data: bookingsList = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const selectedBookings = useMemo(
    () => bookingsList.filter((b) => selected.has(b.code)),
    [bookingsList, selected],
  );

  function handleExportSelected() {
    if (selectedBookings.length === 0) {
      toast.error("Select at least one booking to export");
      return;
    }
    const headers = [
      "Code",
      "Client",
      "Assembly",
      "Event",
      "Venue",
      "Screen Type",
      "Size",
      "Arrangement",
      "Assignees",
      "Stage Hand",
      "Payment",
      "Status",
      "Amount",
    ];
    const rows = selectedBookings.map((b) => [
      b.code,
      b.client,
      b.assemblyDate,
      b.eventDate,
      b.venue,
      b.screenType,
      String(b.size),
      b.arrangement || "",
      (b.assignees || []).join("; "),
      b.stageHand || "",
      b.payment,
      b.status,
      String(b.amount ?? ""),
    ]);
    downloadCsv(
      `bookings-export-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
    toast.success(`Exported ${selectedBookings.length} booking${selectedBookings.length === 1 ? "" : "s"}`);
  }

  async function handleBulkSubmit() {
    if (!bulkModal || selectedBookings.length === 0) return;
    const reason = bulkReason.trim();
    if (reason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    const toStatus: BookingStatus = bulkModal === "cancel" ? "CANCELED" : bulkStatus;
    const override =
      bulkModal === "cancel" && can(PERMISSION.BOOKING_CANCEL_OVERRIDE);
    const codes = selectedBookings.map((b) => b.code);

    setBulkBusy(true);
    try {
      const { ok, failed } = await runBulkTransitions(codes, toStatus, reason, override);
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });

      if (ok.length > 0) {
        toast.success(
          bulkModal === "cancel"
            ? `Canceled ${ok.length} booking${ok.length === 1 ? "" : "s"}`
            : `Updated ${ok.length} booking${ok.length === 1 ? "" : "s"} to ${STATUS_LABELS[toStatus]}`,
        );
      }
      if (failed.length > 0) {
        const preview = failed
          .slice(0, 3)
          .map((f) => `${f.code}: ${f.message}`)
          .join("; ");
        toast.error(
          `${failed.length} failed${preview ? ` — ${preview}` : ""}${failed.length > 3 ? "…" : ""}`,
        );
      }
      if (failed.length === 0) {
        setSelected(new Set());
        setBulkModal(null);
        setBulkReason("");
      } else if (ok.length > 0) {
        setSelected(new Set(failed.map((f) => f.code)));
      }
    } finally {
      setBulkBusy(false);
    }
  }

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: getStaffApi,
    enabled: can(PERMISSION.USER_VIEW) || can(PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN) || can(PERMISSION.ASSIGNMENT_ASSIGN_CREW),
  });

  const ALL_ASSIGNEES = useMemo(() => {
    const fromStaff = staffList.map((s) => s.name).filter(Boolean);
    const fromBookings = bookingsList.flatMap((b) => b.assignees || []);
    return [...new Set([...fromStaff, ...fromBookings])].sort((a, b) => a.localeCompare(b));
  }, [staffList, bookingsList]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [screenFilter, setScreenFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [paymentFilter, setPaymentFilter] = useState<Set<string>>(new Set());

  // Sort — newest created first by default
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    let r: Booking[] = [...bookingsList];

    // Tab filter
    if (tab === "Onsite") r = r.filter((b) => b.status === "ONSITE");
    if (tab === "Upcoming") r = r.filter((b) => new Date(b.assemblyDate) > new Date());
    if (tab === "This Week") {
      const { start, end } = getWeekBounds(0);
      r = r.filter((b) => bookingEventInWeek(b, start, end));
    }
    if (tab === "Last Week") {
      const { start, end } = getWeekBounds(1);
      r = r.filter((b) => bookingEventInWeek(b, start, end));
    }
    if (tab === "Assigned to Me") r = r.filter((b) => b.assignees.includes(authUser?.name || ""));

    // Search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      r = r.filter((b) =>
        [
          b.code,
          b.id,
          b.client,
          b.contactPerson,
          b.contactPhone,
          b.venue,
          b.screenType,
          b.arrangement,
          b.status,
          STATUS_LABELS[b.status],
          b.payment,
          b.teamLeader,
          b.driver,
          b.stageHand,
          b.size,
          ...(b.assignees || []),
        ].some((part) => String(part ?? "").toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (statusFilter.size > 0) {
      const reverseLabels = Object.fromEntries(Object.entries(STATUS_LABELS).map(([k, v]) => [v, k]));
      const selectedStatuses = new Set([...statusFilter].map((label) => reverseLabels[label]).filter(Boolean));
      r = r.filter((b) => selectedStatuses.has(b.status));
    }

    // Screen type filter
    if (screenFilter.size > 0) {
      r = r.filter((b) => {
        const types = String(b.screenType || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        if (types.length === 0) return false;
        return types.some((t) => screenFilter.has(t as ScreenType)) || screenFilter.has(b.screenType as ScreenType);
      });
    }

    // Assignee filter
    if (assigneeFilter.size > 0) r = r.filter((b) => b.assignees.some((a) => assigneeFilter.has(a)));

    // Payment filter
    if (paymentFilter.size > 0) r = r.filter((b) => paymentFilter.has(b.payment));

    // Newest created first by default
    r.sort((a, b) => {
      const cmp = (a.createdAt || "").localeCompare(b.createdAt || "");
      return sortDir === "asc" ? cmp : -cmp;
    });

    return r;
  }, [tab, query, statusFilter, screenFilter, assigneeFilter, paymentFilter, sortDir, bookingsList, authUser?.name]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggle = (code: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  };

  const allChecked = selected.size > 0 && selected.size === rows.length;

  // Reset page when filters change
  const activeFilterCount = statusFilter.size + screenFilter.size + assigneeFilter.size + paymentFilter.size;

  if (isAssignedScopeOnly) {
    return (
      <AppShell>
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[22px] font-bold tracking-tight">My Assignments</h1>
            <span className="rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              {filtered.length} assigned
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th style={{ borderColor: "var(--border)" }} className="border-b px-4 py-3 text-left label-eyebrow">Booking Code</th>
                  <th style={{ borderColor: "var(--border)" }} className="border-b px-4 py-3 text-left label-eyebrow">Assembly Date</th>
                  <th style={{ borderColor: "var(--border)" }} className="border-b px-4 py-3 text-left label-eyebrow">Event Date</th>
                  <th style={{ borderColor: "var(--border)" }} className="border-b px-4 py-3 text-left label-eyebrow">Venue / Location</th>
                  <th style={{ borderColor: "var(--border)" }} className="border-b px-4 py-3 text-left label-eyebrow">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
                      All caught up — no assignments assigned to you.
                    </td>
                  </tr>
                ) : (
                  rows.map((b, i) => (
                    <tr
                      key={b.code}
                      className="group cursor-pointer transition hover:brightness-110"
                      style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                      onClick={() => navigate({ to: "/bookings/$code", params: { code: b.code } })}
                    >
                      <td className="border-b px-4 py-3 font-bold" style={{ borderColor: "var(--border)" }}>
                        <Link to="/bookings/$code" params={{ code: b.code }} className="hover:underline" style={{ color: "var(--accent)" }}>
                          {b.code}
                        </Link>
                      </td>
                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{formatDate(b.assemblyDate)}</td>
                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{formatDate(b.eventDate)}</td>
                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>{b.venue}</td>
                      <td className="border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              <div>Showing <span className="font-semibold text-foreground">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</span> of {filtered.length}</div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="h-7 rounded border px-2.5 disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="h-7 rounded border px-2.5 disabled:opacity-40"
                  style={{ borderColor: "var(--border)" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight">Bookings</h1>
          <span className="rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            {filtered.length} of {bookingsList.length}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setStatusFilter(new Set());
                setScreenFilter(new Set());
                setAssigneeFilter(new Set());
                setPaymentFilter(new Set());
              }}
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold transition hover:bg-[var(--surface-2)]"
              style={{ color: "var(--accent)" }}
            >
              Clear all filters
            </button>
          )}
        </div>
        {canCreateBooking && (
          <Link
            to="/bookings/new"
            className="flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-semibold transition hover:brightness-110 w-fit"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Booking
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-3 scrollable-tabs gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className="relative px-3 py-2.5 text-[12px] font-semibold transition whitespace-nowrap"
              style={{ color: active ? "var(--foreground)" : "var(--text-2)" }}
            >
              {t}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search code, client, venue…"
          className="h-9 w-full sm:w-64 rounded-md border bg-[var(--surface-2)] px-3 text-[12px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
          style={{ borderColor: "var(--border)" }}
        />
        <FilterDropdown
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Status"
          options={ALL_STATUSES}
          selected={statusFilter}
          onChange={(s) => { setStatusFilter(s); setPage(1); }}
        />
        <FilterDropdown
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Screen Type"
          options={ALL_SCREEN_TYPES}
          selected={screenFilter}
          onChange={(s) => { setScreenFilter(s); setPage(1); }}
        />
        <FilterDropdown
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Assignee"
          options={ALL_ASSIGNEES}
          selected={assigneeFilter}
          onChange={(s) => { setAssigneeFilter(s); setPage(1); }}
        />
        <FilterDropdown
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Payment"
          options={ALL_PAYMENTS}
          selected={paymentFilter}
          onChange={(s) => { setPaymentFilter(s); setPage(1); }}
        />
        <div className="ml-auto">
          <SortButton
            icon={<ArrowUpDown className="h-3.5 w-3.5" />}
            label="Created"
            direction={sortDir}
            onToggle={() => {
              setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-2 flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: "var(--accent)", background: "color-mix(in oklab, var(--accent) 8%, transparent)" }}>
          <span className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
            {selected.size} selected
          </span>
          <div className="flex gap-2 text-[12px]">
            {canChangeStatus && (
              <button
                type="button"
                onClick={() => {
                  setBulkStatus("CONFIRMED");
                  setBulkReason("");
                  setBulkModal("status");
                }}
                className="rounded-md border px-2.5 py-1"
                style={{ borderColor: "var(--border)" }}
              >
                Change Status
              </button>
            )}
            <button
              type="button"
              onClick={handleExportSelected}
              className="rounded-md border px-2.5 py-1"
              style={{ borderColor: "var(--border)" }}
            >
              Export
            </button>
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  setBulkReason("");
                  setBulkModal("cancel");
                }}
                className="rounded-md border px-2.5 py-1"
                style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
              >
                Cancel Selected
              </button>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={bulkModal !== null}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) {
            setBulkModal(null);
            setBulkReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkModal === "cancel" ? "Cancel selected bookings" : "Change status"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[12px]">
            <p style={{ color: "var(--text-2)" }}>
              {selectedBookings.length} booking{selectedBookings.length === 1 ? "" : "s"}:{" "}
              {selectedBookings
                .slice(0, 5)
                .map((b) => b.code)
                .join(", ")}
              {selectedBookings.length > 5 ? "…" : ""}
            </p>
            {bulkModal === "status" && (
              <label className="block font-semibold">
                Target status
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as BookingStatus)}
                  className="mt-1.5 h-9 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[12px] outline-none"
                  style={{ borderColor: "var(--border)" }}
                >
                  {BULK_STATUS_TARGETS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block font-semibold">
              Reason
              <textarea
                rows={3}
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Explain why (min 10 characters)…"
                className="mt-1.5 w-full rounded-md border bg-[var(--surface-2)] p-3 text-[12px] outline-none"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            {bulkModal === "status" && (
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                Only allowed transitions for each booking will succeed. Invalid ones are skipped with an error.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={bulkBusy}
              onClick={() => {
                setBulkModal(null);
                setBulkReason("");
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={bulkBusy || bulkReason.trim().length < 10}
              onClick={handleBulkSubmit}
              style={
                bulkModal === "cancel"
                  ? { background: "var(--destructive)", color: "#fff" }
                  : undefined
              }
            >
              {bulkBusy
                ? "Working…"
                : bulkModal === "cancel"
                  ? "Cancel bookings"
                  : "Update status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Table */}
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1400px] border-collapse text-[12px]">
            <thead>
              <tr className="sticky top-0 z-10" style={{ background: "var(--surface-2)" }}>
                {[
                  { k: "chk", w: 36 },
                  { k: "CODE", w: 80 },
                  { k: "CLIENT", w: 180 },
                  { k: "ASSEMBLY", w: 110 },
                  { k: "EVENT", w: 110 },
                  { k: "VENUE", w: 180 },
                  { k: "TYPE", w: 110 },
                  { k: "SIZE", w: 60 },
                  { k: "ARRANGEMENT", w: 110 },
                  { k: "ASSIGNEE", w: 130 },
                  { k: "STAGE HAND", w: 140 },
                  { k: "PAYMENT", w: 90 },
                  { k: "STATUS", w: 120 },
                  { k: "", w: 36 },
                ].map((h, i) => (
                  <th
                    key={i}
                    style={{ width: h.w, borderColor: "var(--border)" }}
                    className="border-b px-3 py-2.5 text-left label-eyebrow"
                  >
                    {h.k === "chk" ? (
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.code)))}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                    ) : h.k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
                    No bookings match your current filters.
                  </td>
                </tr>
              ) : (
                rows.map((b, i) => (
                  <tr
                    key={b.code}
                    className="group cursor-pointer transition hover:brightness-110"
                    style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}
                  >
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(b.code)}
                        onChange={() => toggle(b.code)}
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                    </td>
                    <td className="border-b px-3 py-3 font-bold" style={{ borderColor: "var(--border)" }}>
                      <Link to="/bookings/$code" params={{ code: b.code }} className="hover:underline" style={{ color: "var(--accent)" }}>
                        {b.code}
                      </Link>
                    </td>
                    <td className="border-b px-3 py-3 font-medium" style={{ borderColor: "var(--border)" }}>
                      <Link to="/bookings/$code" params={{ code: b.code }}>{b.client}</Link>
                    </td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{formatDate(b.assemblyDate)}</td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{formatDate(b.eventDate)}</td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }}>{b.venue}</td>
                    <td className="border-b px-3 py-3 font-mono text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.screenType || "—"}</td>
                    <td className="border-b px-3 py-3 font-mono font-semibold" style={{ borderColor: "var(--border)" }}>{b.size}</td>
                    <td className="border-b px-3 py-3 font-mono text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.arrangement || "—"}</td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }}>
                      <div className="flex -space-x-1.5">
                        {b.assignees.map((a, ai) => (
                          <div
                            key={ai}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-bold"
                            style={{ background: ai === 0 ? "var(--accent)" : "var(--surface-2)", color: ai === 0 ? "var(--accent-foreground)" : "var(--foreground)", borderColor: "var(--surface)" }}
                            title={a}
                          >
                            {a.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border-b px-3 py-3 text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.stageHand}</td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }}><PaymentBadge status={b.payment} /></td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }}><StatusBadge status={b.status} /></td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }}>
                      <Link to="/bookings/$code" params={{ code: b.code }} className="flex h-6 w-6 items-center justify-center rounded transition hover:bg-[var(--surface)]" style={{ color: "var(--text-2)" }}>
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t px-4 py-3 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
          <div>Showing <span className="font-semibold text-foreground">{rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</span> of {filtered.length}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="hidden sm:inline">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-7 rounded border bg-[var(--surface-2)] px-2 text-[11px]"
              style={{ borderColor: "var(--border)" }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="ml-3 flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-7 rounded border px-2.5 disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="h-7 rounded border px-2.5 font-semibold"
                  style={{
                    borderColor: safePage === p ? "var(--accent)" : "var(--border)",
                    color: safePage === p ? "var(--accent)" : undefined,
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-7 rounded border px-2.5 disabled:opacity-40"
                style={{ borderColor: "var(--border)" }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
