import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, MapPin, Package, RotateCcw, ShieldAlert, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { MOCK_INVENTORY } from "@/lib/mock-inventory";

export const Route = createFileRoute("/inventory/$itemId")({
  head: ({ params }) => ({ meta: [{ title: `${params.itemId} · Inventory · Vortex Visual` }, { name: "description", content: `Equipment history and availability for ${params.itemId}.` }] }),
  loader: ({ params }) => {
    const item = MOCK_INVENTORY.find((candidate) => candidate.id === params.itemId);
    if (!item) throw notFound();
    return { item };
  },
  notFoundComponent: () => <AppShell><div className="flex h-[60vh] flex-col items-center justify-center gap-3"><AlertTriangle className="h-8 w-8 text-accent" /><p>Inventory item not found.</p><Link to="/inventory" className="text-accent">Back to Inventory</Link></div></AppShell>,
  component: InventoryDetail,
});

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return <div className="border-r border-border px-5 last:border-0"><div className="label-eyebrow">{label}</div><div className="mt-1 font-mono text-[22px] font-bold" style={{ color: tone }}>{value}</div></div>;
}

function InventoryDetail() {
  const { item } = Route.useLoaderData();
  const [tab, setTab] = useState<"Units" | "Movement" | "Maintenance">("Units");
  const units = Array.from({ length: Math.min(item.total, 12) }, (_, i) => ({ serial: `${item.id}-${String(i + 1).padStart(3, "0")}`, state: i < item.damaged ? "DAMAGED" : i < item.damaged + item.onsite ? "ONSITE" : i < item.damaged + item.onsite + item.reserved ? "RESERVED" : "AVAILABLE", location: i < item.onsite ? "SB047 · Sheraton" : item.location }));

  return <AppShell>
    <div className="mb-4 flex items-center justify-between"><Link to="/inventory" className="flex items-center gap-2 text-[12px] font-semibold text-text-2"><ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory</Link><div className="flex gap-2"><Button variant="outline" size="sm"><RotateCcw /> Stock Movement</Button><Button size="sm" asChild><Link to="/inventory/$itemId/damage" params={{ itemId: item.id }}><ShieldAlert /> Report Damage</Link></Button></div></div>
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex items-start justify-between border-b border-border p-5"><div className="flex gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 text-accent"><Package className="h-6 w-6" /></div><div><div className="font-mono text-[11px] font-bold text-accent">{item.id}</div><h1 className="mt-0.5 text-[24px] font-bold tracking-tight">{item.name}</h1><div className="mt-1 text-[12px] text-text-2">{item.model} · {item.category}</div></div></div><span className="rounded-md border border-border px-2.5 py-1 text-[10px] font-bold text-accent">{item.availability}</span></div>
      <div className="grid grid-cols-5 py-4"><Stat label="Total" value={item.total} /><Stat label="Available" value={item.available} tone="var(--color-bom-returned)" /><Stat label="Reserved" value={item.reserved} tone="var(--color-pay-advance)" /><Stat label="Onsite" value={item.onsite} tone="var(--color-status-accepted)" /><Stat label="Damaged" value={item.damaged} tone="var(--destructive)" /></div>
    </section>

    <div className="mt-4 grid grid-cols-12 gap-4">
      <div className="col-span-9 rounded-lg border border-border bg-surface"><div className="flex gap-1 border-b border-border px-3">{(["Units", "Movement", "Maintenance"] as const).map((name) => <button key={name} onClick={() => setTab(name)} className="relative px-3 py-3 text-[12px] font-semibold" style={{ color: tab === name ? "var(--foreground)" : "var(--text-2)" }}>{name}{tab === name && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-accent" />}</button>)}</div>
        {tab === "Units" && <table className="w-full text-[12px]"><thead><tr>{["Serial", "State", "Current location", "Last inspection"].map((h) => <th key={h} className="border-b border-border px-4 py-3 text-left label-eyebrow">{h}</th>)}</tr></thead><tbody>{units.map((unit, i) => <tr key={unit.serial} className="border-b border-border last:border-0"><td className="px-4 py-3 font-mono font-semibold">{unit.serial}</td><td className="px-4 py-3"><span className="text-[10px] font-bold" style={{ color: unit.state === "DAMAGED" ? "var(--destructive)" : unit.state === "AVAILABLE" ? "var(--color-bom-returned)" : "var(--color-pay-advance)" }}>{unit.state}</span></td><td className="px-4 py-3 text-text-2">{unit.location}</td><td className="px-4 py-3 font-mono text-text-2">2026-05-{String(28 - i).padStart(2, "0")}</td></tr>)}</tbody></table>}
        {tab === "Movement" && <div className="space-y-4 p-5">{["12 units checked out to SB047", "48 units reserved for SB052", "4 units returned and inspected"].map((event, i) => <div key={event} className="flex gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /><div><p className="text-[12px] font-semibold">{event}</p><p className="font-mono text-[10px] text-text-3">2026-06-{String(8 - i).padStart(2, "0")} · Nathan B.</p></div></div>)}</div>}
        {tab === "Maintenance" && <div className="p-5"><div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-4"><Wrench className="h-5 w-5 text-accent" /><div><p className="text-[13px] font-semibold">Next preventive service</p><p className="mt-0.5 font-mono text-[11px] text-text-2">{item.nextService} · Full power, signal, housing and connector inspection</p></div></div></div>}
      </div>
      <aside className="col-span-3 space-y-4"><div className="rounded-lg border border-border bg-surface p-4"><div className="mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /><span className="label-eyebrow">Storage</span></div><p className="text-[13px] font-semibold">{item.location}</p><p className="mt-1 text-[11px] text-text-2">Main warehouse · Bole</p></div><div className="rounded-lg border border-border bg-surface p-4"><div className="mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-accent" /><span className="label-eyebrow">Service Record</span></div><div className="space-y-2 text-[11px]"><div className="flex justify-between"><span className="text-text-2">Last service</span><span className="font-mono">{item.lastService}</span></div><div className="flex justify-between"><span className="text-text-2">Next due</span><span className="font-mono">{item.nextService}</span></div></div></div><div className="rounded-lg border border-border bg-surface p-4"><div className="mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-accent" /><span className="label-eyebrow">Custodian</span></div><p className="text-[13px] font-semibold">Mekonnen T.</p><p className="text-[11px] text-text-2">Storekeeper</p></div></aside>
    </div>
  </AppShell>;
}