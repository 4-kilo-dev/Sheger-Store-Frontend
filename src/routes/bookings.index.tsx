import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Filter, ArrowUpDown, MoreVertical, ChevronDown, Calendar } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { MOCK_BOOKINGS, type Booking } from "@/lib/mock-bookings";

export const Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings · Vortex Visual" },
      { name: "description", content: "All LED screen rental bookings, schedules, and assignments." },
    ],
  }),
  component: BookingsPage,
});

const TABS = ["All", "This Week", "Upcoming", "Onsite", "Last Week", "Assigned to Me"] as const;

function BookingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let r: Booking[] = MOCK_BOOKINGS;
    if (tab === "Onsite") r = r.filter((b) => b.status === "ONSITE");
    if (tab === "Upcoming") r = r.filter((b) => new Date(b.assemblyDate) > new Date());
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((b) => b.code.toLowerCase().includes(q) || b.client.toLowerCase().includes(q) || b.venue.toLowerCase().includes(q));
    }
    return r;
  }, [tab, query]);

  const toggle = (code: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  };

  const allChecked = selected.size > 0 && selected.size === rows.length;

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold tracking-tight">Bookings</h1>
          <span className="rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            {MOCK_BOOKINGS.length} total
          </span>
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
              onClick={() => setTab(t)}
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, client, venue…"
          className="h-9 w-64 rounded-md border bg-[var(--surface-2)] px-3 text-[12px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
          style={{ borderColor: "var(--border)" }}
        />
        {[
          { icon: Filter, label: "Status" },
          { icon: Filter, label: "Screen Type" },
          { icon: Filter, label: "Assignee" },
          { icon: Calendar, label: "Date range" },
          { icon: Filter, label: "Payment" },
        ].map(({ icon: I, label }) => (
          <button
            key={label}
            className="flex h-9 items-center gap-1.5 rounded-md border bg-[var(--surface)] px-3 text-[12px] transition hover:border-[var(--accent)]"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            <I className="h-3.5 w-3.5" />
            {label}
            <ChevronDown className="h-3 w-3" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="flex h-9 items-center gap-1.5 rounded-md border bg-[var(--surface)] px-3 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            <ArrowUpDown className="h-3.5 w-3.5" />
            Assembly Date
            <ChevronDown className="h-3 w-3" />
          </button>
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
              {rows.map((b, i) => (
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-[12px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
          <div>Showing <span className="font-semibold text-foreground">1–{rows.length}</span> of {MOCK_BOOKINGS.length}</div>
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select className="h-7 rounded border bg-[var(--surface-2)] px-2 text-[11px]" style={{ borderColor: "var(--border)" }}>
              <option>25</option><option>50</option><option>100</option>
            </select>
            <div className="ml-3 flex gap-1">
              <button className="h-7 rounded border px-2.5" style={{ borderColor: "var(--border)" }}>Prev</button>
              <button className="h-7 rounded border px-2.5 font-semibold" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>1</button>
              <button className="h-7 rounded border px-2.5" style={{ borderColor: "var(--border)" }}>2</button>
              <button className="h-7 rounded border px-2.5" style={{ borderColor: "var(--border)" }}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
