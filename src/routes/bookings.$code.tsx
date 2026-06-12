import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Edit3, Printer, Share2, MoreHorizontal, MapPin, Calendar,
  Phone, User, Building2, DollarSign, Paperclip, MessageSquare,
  Package, Users, Clock, CheckCircle2, AlertTriangle, Download, Upload,
  Truck, Wrench, FileText,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { StatusStepper } from "@/components/status-stepper";
import { MOCK_BOOKINGS } from "@/lib/mock-bookings";

export const Route = createFileRoute("/bookings/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.code} · Booking · Vortex Visual` },
      { name: "description", content: `Booking details for ${params.code}.` },
    ],
  }),
  loader: ({ params }) => {
    const b = MOCK_BOOKINGS.find((x) => x.code === params.code);
    if (!b) throw notFound();
    return { booking: b };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8" style={{ color: "var(--accent)" }} />
        <div className="text-[15px] font-semibold">Booking not found</div>
        <Link to="/bookings" className="text-[12px]" style={{ color: "var(--accent)" }}>← Back to Bookings</Link>
      </div>
    </AppShell>
  ),
  component: BookingDetailPage,
});

const TABS = ["Overview", "Schedule", "Team", "Equipment", "Payments", "Files", "Activity"] as const;

function BookingDetailPage() {
  const { booking } = Route.useLoaderData();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <AppShell>
      {/* Top action row */}
      <div className="mb-4 flex items-center justify-between">
        <Link to="/bookings" className="flex items-center gap-2 text-[12px] font-semibold transition hover:opacity-80" style={{ color: "var(--text-2)" }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Bookings
        </Link>
        <div className="flex items-center gap-2">
          {[
            { icon: Printer, label: "Print" },
            { icon: Share2, label: "Share" },
            { icon: Edit3, label: "Edit" },
          ].map(({ icon: I, label }) => (
            <button key={label} className="flex h-8 items-center gap-1.5 rounded-md border bg-[var(--surface)] px-2.5 text-[12px] transition hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              <I className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
            Advance Status
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md border" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="mb-4 rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold tracking-tight" style={{ color: "var(--accent)" }}>{booking.code}</h1>
              <StatusBadge status={booking.status} size="lg" />
              <PaymentBadge status={booking.payment} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-[13px]" style={{ color: "var(--text-2)" }}>
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{booking.client}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{booking.venue}</span>
              <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{booking.eventDate}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="label-eyebrow">Total Contract Value</div>
            <div className="mt-1 font-mono text-[24px] font-bold">ETB {booking.amount.toLocaleString()}</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-6">
          <StatusStepper current={booking.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative px-4 py-2.5 text-[12px] font-semibold transition"
              style={{ color: active ? "var(--foreground)" : "var(--text-2)" }}
            >
              {t}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "Overview" && <OverviewTab b={booking} />}
      {tab === "Schedule" && <ScheduleTab b={booking} />}
      {tab === "Team" && <TeamTab b={booking} />}
      {tab === "Equipment" && <EquipmentTab b={booking} />}
      {tab === "Payments" && <PaymentsTab b={booking} />}
      {tab === "Files" && <FilesTab />}
      {tab === "Activity" && <ActivityTab />}
    </AppShell>
  );
}

type B = (typeof MOCK_BOOKINGS)[number];

function Section({ title, icon: I, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <I className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span className="label-eyebrow">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{k}</span>
      <span className={`text-[13px] font-medium text-right ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function OverviewTab({ b }: { b: B }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8 space-y-4">
        <Section title="Client & Contact" icon={User}>
          <div className="grid grid-cols-2 gap-x-6">
            <KV k="Client" v={b.client} />
            <KV k="Contact Person" v={b.contactPerson} />
            <KV k="Phone" v={<span className="flex items-center justify-end gap-1.5"><Phone className="h-3 w-3" />{b.contactPhone}</span>} mono />
            <KV k="Booking Code" v={b.code} mono />
          </div>
        </Section>

        <Section title="Venue & Setup" icon={MapPin}>
          <div className="grid grid-cols-2 gap-x-6">
            <KV k="Venue" v={b.venue} />
            <KV k="Arrangement" v={b.arrangement} mono />
            <KV k="Screen Type" v={b.screenType} mono />
            <KV k="Size (sqm)" v={b.size} mono />
          </div>
        </Section>

        <Section title="Notes & Special Requirements" icon={MessageSquare}>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            Client requires test run by 4PM event day. Stage left feed needs HDMI to SDI converter.
            Coordinate with venue AV at +251 911 234 567 for power distribution. Backup PSU on standby.
          </p>
        </Section>
      </div>

      <div className="col-span-4 space-y-4">
        <Section title="Schedule" icon={Calendar}>
          <KV k="Assembly" v={b.assemblyDate} mono />
          <KV k="Event" v={b.eventDate} mono />
          <KV k="Dismantle" v="—" />
        </Section>

        <Section title="Financial" icon={DollarSign}>
          <KV k="Contract" v={`ETB ${b.amount.toLocaleString()}`} mono />
          <KV k="Paid" v={b.payment === "PAID" ? `ETB ${b.amount.toLocaleString()}` : b.payment === "ADVANCE" ? `ETB ${(b.amount / 2).toLocaleString()}` : "ETB 0"} mono />
          <KV k="Balance" v={b.payment === "PAID" ? "ETB 0" : `ETB ${(b.amount / 2).toLocaleString()}`} mono />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV k="Status" v={<PaymentBadge status={b.payment} />} />
          </div>
        </Section>

        <Section title="Quick Stats" icon={CheckCircle2}>
          <KV k="Days to Event" v={Math.max(0, Math.ceil((new Date(b.eventDate).getTime() - Date.now()) / 86400000))} mono />
          <KV k="Crew Size" v={b.assignees.length + 4} mono />
          <KV k="Truck" v="MED-04" mono />
        </Section>
      </div>
    </div>
  );
}

function ScheduleTab({ b }: { b: B }) {
  const events = [
    { t: "07:00", title: "Load Out from Warehouse", who: "Storekeeper · Storeroom A", icon: Truck },
    { t: "09:30", title: "Arrive at Venue", who: b.venue, icon: MapPin },
    { t: "10:00", title: "Assembly Start", who: b.assignees.join(" · "), icon: Wrench, date: b.assemblyDate },
    { t: "16:00", title: "Test Run & Calibration", who: "Chief Technician", icon: CheckCircle2 },
    { t: "18:00", title: "Live Event", who: b.client, icon: Users, date: b.eventDate, accent: true },
    { t: "23:30", title: "Dismantle", who: b.stageHand, icon: Wrench },
  ];
  return (
    <Section title="Timeline" icon={Clock}>
      <div className="relative space-y-3">
        <div className="absolute bottom-0 left-[44px] top-2 w-px" style={{ background: "var(--border)" }} />
        {events.map((e, i) => (
          <div key={i} className="relative flex items-start gap-4">
            <div className="w-10 pt-2 text-right font-mono text-[11px] font-bold" style={{ color: e.accent ? "var(--accent)" : "var(--text-2)" }}>{e.t}</div>
            <div
              className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2"
              style={{
                borderColor: e.accent ? "var(--accent)" : "var(--border)",
                background: e.accent ? "color-mix(in oklab, var(--accent) 20%, transparent)" : "var(--surface-2)",
                color: e.accent ? "var(--accent)" : "var(--text-2)",
              }}
            >
              <e.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 rounded-md border px-3 py-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold">{e.title}</div>
                {e.date && <span className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>{e.date}</span>}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-2)" }}>{e.who}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TeamTab({ b }: { b: B }) {
  const roster = [
    { role: "Chief Technician", name: b.assignees[0], status: "ACCEPTED" },
    { role: "Technician", name: b.assignees[1], status: "ACCEPTED" },
    { role: "Operation Officer", name: "Eyob D.", status: "ASSIGNED" },
    { role: "Stage Hand Team", name: b.stageHand, status: "CONFIRMED" },
    { role: "CCR", name: "Selam M.", status: "CONFIRMED" },
  ];
  return (
    <Section title="Assigned Team" icon={Users} action={<button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>+ Assign Member</button>}>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {roster.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                {(p.name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[13px] font-semibold">{p.name}</div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{p.role}</div>
              </div>
            </div>
            <span
              className="rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: p.status === "ACCEPTED" ? "var(--color-status-accepted)" : "var(--color-status-confirmed)",
                borderColor: "var(--border)",
              }}
            >
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function EquipmentTab({ b }: { b: B }) {
  const items = [
    { id: "PNL-A124", name: `${b.screenType} Panel`, qty: b.size, status: "Reserved" },
    { id: "PSU-19", name: "Power Supply Unit", qty: 4, status: "Reserved" },
    { id: "PRC-07", name: "Video Processor (Novastar)", qty: 1, status: "Reserved" },
    { id: "TRS-12", name: "Truss Segment 2m", qty: 8, status: "Reserved" },
    { id: "CBL-44", name: "HDMI 4K Cable 15m", qty: 2, status: "Reserved" },
  ];
  return (
    <Section title="Bill of Materials" icon={Package} action={<button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>+ Add Item</button>}>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            <th className="label-eyebrow pb-2 text-left">Code</th>
            <th className="label-eyebrow pb-2 text-left">Item</th>
            <th className="label-eyebrow pb-2 text-right">Qty</th>
            <th className="label-eyebrow pb-2 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
              <td className="py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>{it.id}</td>
              <td className="py-3">{it.name}</td>
              <td className="py-3 text-right font-mono font-semibold">{it.qty}</td>
              <td className="py-3 text-right text-[11px]" style={{ color: "var(--text-2)" }}>{it.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function PaymentsTab({ b }: { b: B }) {
  const tx = b.payment === "PAID"
    ? [{ d: "2026-05-12", n: "Full payment", a: b.amount, m: "Bank Transfer" }]
    : b.payment === "ADVANCE"
    ? [{ d: "2026-05-12", n: "Advance 50%", a: b.amount / 2, m: "Bank Transfer" }]
    : [];
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">
        <Section title="Transactions" icon={DollarSign} action={<button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>+ Record Payment</button>}>
          {tx.length === 0 ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>No payments recorded yet.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="label-eyebrow pb-2 text-left">Date</th>
                  <th className="label-eyebrow pb-2 text-left">Note</th>
                  <th className="label-eyebrow pb-2 text-left">Method</th>
                  <th className="label-eyebrow pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 font-mono">{t.d}</td>
                    <td className="py-3">{t.n}</td>
                    <td className="py-3" style={{ color: "var(--text-2)" }}>{t.m}</td>
                    <td className="py-3 text-right font-mono font-semibold">ETB {t.a.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
      <div className="col-span-4">
        <Section title="Summary" icon={DollarSign}>
          <KV k="Contract" v={`ETB ${b.amount.toLocaleString()}`} mono />
          <KV k="Paid" v={`ETB ${tx.reduce((s, t) => s + t.a, 0).toLocaleString()}`} mono />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV k="Balance Due" v={`ETB ${(b.amount - tx.reduce((s, t) => s + t.a, 0)).toLocaleString()}`} mono />
          </div>
        </Section>
      </div>
    </div>
  );
}

function FilesTab() {
  const files = [
    { n: "Contract_signed.pdf", s: "1.2 MB", d: "2026-05-10" },
    { n: "Site_survey_photos.zip", s: "18 MB", d: "2026-05-11" },
    { n: "Stage_diagram.pdf", s: "640 KB", d: "2026-05-11" },
  ];
  return (
    <Section title="Files & Attachments" icon={Paperclip} action={<button className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "var(--accent)" }}><Upload className="h-3 w-3" />Upload</button>}>
      <div className="grid grid-cols-3 gap-3">
        {files.map((f) => (
          <div key={f.n} className="rounded-md border p-3 transition hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <FileText className="h-5 w-5" style={{ color: "var(--accent)" }} />
            <div className="mt-2 truncate text-[12px] font-semibold">{f.n}</div>
            <div className="mt-1 flex items-center justify-between text-[10px]" style={{ color: "var(--text-3)" }}>
              <span>{f.s} · {f.d}</span>
              <Download className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ActivityTab() {
  const log = [
    { t: "2 hours ago", who: "Nathan B.", a: "advanced status to", what: "ONSITE", accent: true },
    { t: "5 hours ago", who: "Selam M.", a: "uploaded", what: "Stage_diagram.pdf" },
    { t: "Yesterday", who: "Eyob D.", a: "assigned", what: "Bereket as Chief Technician" },
    { t: "2 days ago", who: "System", a: "auto-reserved equipment from", what: "BOM" },
    { t: "3 days ago", who: "Hanna T.", a: "created booking", what: "" },
  ];
  return (
    <Section title="Activity Log" icon={Clock}>
      <div className="space-y-3">
        {log.map((l, i) => (
          <div key={i} className="flex items-start gap-3 text-[12px]">
            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: l.accent ? "var(--accent)" : "var(--text-3)" }} />
            <div className="flex-1">
              <span className="font-semibold">{l.who}</span>{" "}
              <span style={{ color: "var(--text-2)" }}>{l.a}</span>{" "}
              {l.what && <span className="font-semibold" style={{ color: l.accent ? "var(--accent)" : "var(--foreground)" }}>{l.what}</span>}
            </div>
            <div className="font-mono text-[10px]" style={{ color: "var(--text-3)" }}>{l.t}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}
