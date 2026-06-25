import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Filter, ArrowUpDown, MoreVertical, Calendar } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FilterDropdown, SortButton } from "@/components/filter-dropdown";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { useQuery } from "@tanstack/react-query";
import { getBookingsApi, MOCK_BOOKINGS, STATUS_ORDER, STATUS_LABELS, type Booking, type BookingStatus, type PaymentStatus, type ScreenType } from "@/features/bookings/services/bookings.api";

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
const ALL_ASSIGNEES = [...new Set(MOCK_BOOKINGS.flatMap((b) => b.assignees))].sort();

export function BookingsIndex() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  // Query bookings from backend
  const { data: bookingsList = MOCK_BOOKINGS } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [screenFilter, setScreenFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [paymentFilter, setPaymentFilter] = useState<Set<string>>(new Set());

  // Sort
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    let r: Booking[] = [...bookingsList];

    // Tab filter
    if (tab === "Onsite") r = r.filter((b) => b.status === "ONSITE");
    if (tab === "Upcoming") r = r.filter((b) => new Date(b.assemblyDate) > new Date());
    if (tab === "This Week") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      r = r.filter((b) => {
        const d = new Date(b.eventDate);
        return d >= startOfWeek && d <= endOfWeek;
      });
    }
    if (tab === "Last Week") {
      const now = new Date();
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      r = r.filter((b) => {
        const d = new Date(b.eventDate);
        return d >= startOfLastWeek && d <= endOfLastWeek;
      });
    }
    if (tab === "Assigned to Me") r = r.filter((b) => b.assignees.includes("Nathan") || b.assignees.includes("Yeabtsega"));

    // Search
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((b) => b.code.toLowerCase().includes(q) || b.client.toLowerCase().includes(q) || b.venue.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter.size > 0) {
      const reverseLabels = Object.fromEntries(Object.entries(STATUS_LABELS).map(([k, v]) => [v, k]));
      const selectedStatuses = new Set([...statusFilter].map((label) => reverseLabels[label]).filter(Boolean));
      r = r.filter((b) => selectedStatuses.has(b.status));
    }

    // Screen type filter
    if (screenFilter.size > 0) r = r.filter((b) => screenFilter.has(b.screenType));

    // Assignee filter
    if (assigneeFilter.size > 0) r = r.filter((b) => b.assignees.some((a) => assigneeFilter.has(a)));

    // Payment filter
    if (paymentFilter.size > 0) r = r.filter((b) => paymentFilter.has(b.payment));

    // Sort by assembly date
    r.sort((a, b) => {
      const cmp = a.assemblyDate.localeCompare(b.assemblyDate);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return r;
  }, [tab, query, statusFilter, screenFilter, assigneeFilter, paymentFilter, sortDir, bookingsList]);

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

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold tracking-tight">Bookings</h1>
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
        <Link
          to="/bookings/new"
          className="flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-semibold transition hover:brightness-110"
          style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New Booking
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-3 flex items-center gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className="relative px-3 py-2.5 text-[12px] font-semibold transition"
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
          className="h-9 w-64 rounded-md border bg-[var(--surface-2)] px-3 text-[12px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
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
            label="Assembly Date"
            direction={sortDir}
            onToggle={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
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
            <button className="rounded-md border px-2.5 py-1" style={{ borderColor: "var(--border)" }}>Change Status</button>
            <button className="rounded-md border px-2.5 py-1" style={{ borderColor: "var(--border)" }}>Export</button>
            <button className="rounded-md border px-2.5 py-1" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>Cancel Selected</button>
          </div>
        </div>
      )}

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
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.assemblyDate}</td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.eventDate}</td>
                    <td className="border-b px-3 py-3" style={{ borderColor: "var(--border)" }}>{b.venue}</td>
                    <td className="border-b px-3 py-3 font-mono text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.screenType}</td>
                    <td className="border-b px-3 py-3 font-mono font-semibold" style={{ borderColor: "var(--border)" }}>{b.size}</td>
                    <td className="border-b px-3 py-3 font-mono text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.arrangement}</td>
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
        <div className="flex items-center justify-between border-t px-4 py-3 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
          <div>Showing <span className="font-semibold text-foreground">{rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}</span> of {filtered.length}</div>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
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
