import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Boxes, ChevronDown, Filter, PackageCheck, Search, ShieldAlert, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { INVENTORY_CATEGORIES, MOCK_INVENTORY, type InventoryCondition } from "@/lib/mock-inventory";

export const Route = createFileRoute("/inventory/")({
  head: () => ({ meta: [{ title: "Inventory · Vortex Visual" }, { name: "description", content: "LED equipment stock, allocation, service, and damage tracking." }] }),
  component: InventoryPage,
});

const conditionColor: Record<InventoryCondition, string> = { GOOD: "var(--color-bom-returned)", "SERVICE DUE": "var(--color-pay-advance)", DAMAGED: "var(--destructive)" };

function InventoryPage() {
  const [category, setCategory] = useState<(typeof INVENTORY_CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => MOCK_INVENTORY.filter((item) => (category === "All" || item.category === category) && `${item.id} ${item.name} ${item.model}`.toLowerCase().includes(query.toLowerCase())), [category, query]);
  const totals = MOCK_INVENTORY.reduce((a, i) => ({ units: a.units + i.total, available: a.available + i.available, onsite: a.onsite + i.onsite, attention: a.attention + i.damaged }), { units: 0, available: 0, onsite: 0, attention: 0 });

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between">
        <div><div className="label-eyebrow mb-1">Warehouse Control</div><h1 className="text-[24px] font-bold tracking-tight">Inventory</h1></div>
        <Button size="sm"><Boxes /> Add Inventory Item</Button>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-3">
        {[
          { label: "Total Units", value: totals.units, icon: Boxes, tone: "var(--foreground)" },
          { label: "Available Now", value: totals.available, icon: PackageCheck, tone: "var(--color-bom-returned)" },
          { label: "Currently Onsite", value: totals.onsite, icon: Wrench, tone: "var(--color-status-accepted)" },
          { label: "Damaged / Hold", value: totals.attention, icon: ShieldAlert, tone: "var(--destructive)" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center justify-between rounded-lg border bg-surface p-4">
            <div><div className="label-eyebrow">{label}</div><div className="mt-1.5 font-mono text-[24px] font-bold">{value}</div></div>
            <Icon className="h-5 w-5" style={{ color: tone }} />
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-1 border-b border-border">
        {INVENTORY_CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className="relative px-3 py-2.5 text-[12px] font-semibold" style={{ color: category === item ? "var(--foreground)" : "var(--text-2)" }}>{item}{category === item && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent" />}</button>)}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, asset code, model…" className="h-9 w-72 rounded-md border border-border bg-surface-2 pl-8 pr-3 text-[12px] outline-none focus:border-accent" /></div>
        <Button variant="outline" size="sm"><Filter /> Condition <ChevronDown /></Button>
        <Button variant="outline" size="sm"><Filter /> Location <ChevronDown /></Button>
        <Button variant="outline" size="sm" className="ml-auto"><ArrowUpDown /> Availability <ChevronDown /></Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-[12px]">
          <thead className="bg-surface-2"><tr>{["Asset / Item", "Category", "Location", "Stock allocation", "Available", "Condition", "Next service"].map((h) => <th key={h} className="border-b border-border px-4 py-3 text-left label-eyebrow">{h}</th>)}</tr></thead>
          <tbody>{rows.map((item) => {
            const utilized = ((item.reserved + item.onsite) / item.total) * 100;
            return <tr key={item.id} className="border-b border-border transition hover:bg-surface-2 last:border-0">
              <td className="px-4 py-3"><Link to="/inventory/$itemId" params={{ itemId: item.id }} className="font-semibold hover:text-accent">{item.name}</Link><div className="mt-0.5 font-mono text-[10px] text-text-3">{item.id} · {item.model}</div></td>
              <td className="px-4 py-3 text-text-2">{item.category}</td><td className="px-4 py-3 text-text-2">{item.location}</td>
              <td className="w-56 px-4 py-3"><div className="mb-1.5 flex justify-between font-mono text-[10px] text-text-2"><span>{item.reserved} reserved · {item.onsite} onsite</span><span>{item.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${utilized}%` }} /></div></td>
              <td className="px-4 py-3 font-mono text-[14px] font-bold">{item.available}</td>
              <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[10px] font-bold" style={{ color: conditionColor[item.condition] }}>{item.condition !== "GOOD" && <AlertTriangle className="h-3 w-3" />}{item.condition}</span></td>
              <td className="px-4 py-3 font-mono text-[11px] text-text-2">{item.nextService}</td>
            </tr>;
          })}</tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-text-2"><span>Showing {rows.length} equipment groups</span><span>{totals.units} serialized and pooled units tracked</span></div>
      </div>
    </AppShell>
  );
}