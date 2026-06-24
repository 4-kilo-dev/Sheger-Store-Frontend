import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { MOCK_INVENTORY } from "@/features/inventory/services/inventory.api";

const _Route = createFileRoute("/damage-report")({
  head: () => ({ meta: [{ title: "Damage Report · Vortex Visual" }, { name: "description", content: "Log damaged rental equipment for warehouse inspection and repair." }] }),
  component: DamageReportPage,
});

export function DamageReportPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [itemId, setItemId] = useState(MOCK_INVENTORY[0]?.id ?? "");
  const fieldClass = "mt-1.5 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-[12px] outline-none focus:border-accent";

  if (submitted) return <AppShell><div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border border-border bg-surface px-10 py-14 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2"><CheckCircle2 className="h-6 w-6 text-[var(--color-bom-returned)]" /></div><h1 className="mt-4 text-[20px] font-bold">Damage report submitted</h1><p className="mt-2 text-[12px] leading-relaxed text-text-2">The affected units are now marked for inspection. The Storekeeper and Chief Technician have been notified.</p><Button className="mt-6" onClick={() => navigate({ to: "/inventory" })}>Return to Inventory</Button></div></AppShell>;

  return <AppShell>
    <div className="mx-auto max-w-4xl">
      <Link to="/inventory" className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-text-2"><ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory</Link>
      <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-destructive"><ShieldAlert className="h-5 w-5" /></div><div><div className="label-eyebrow">Warehouse Incident</div><h1 className="text-[24px] font-bold tracking-tight">Report Equipment Damage</h1></div></div>
      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="grid grid-cols-12 gap-4">
        <div className="col-span-8 space-y-4">
          <section className="rounded-lg border border-border bg-surface p-5"><div className="mb-4 label-eyebrow">Equipment identification</div><div className="grid grid-cols-2 gap-4"><label className="text-[12px] font-semibold">Inventory item<select value={itemId} onChange={(e) => setItemId(e.target.value)} className={fieldClass}>{MOCK_INVENTORY.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label><label className="text-[12px] font-semibold">Affected quantity<input type="number" required min="1" defaultValue="1" className={fieldClass} /></label><label className="col-span-2 text-[12px] font-semibold">Serial numbers / unit references<input required placeholder="e.g. PNL-P297-01-004, -008" className={fieldClass} /></label></div></section>
          <section className="rounded-lg border border-border bg-surface p-5"><div className="mb-4 label-eyebrow">Incident details</div><div className="grid grid-cols-2 gap-4"><label className="text-[12px] font-semibold">Damage severity<select className={fieldClass}><option>Minor · usable with caution</option><option>Major · remove from service</option><option>Critical · safety hazard</option></select></label><label className="text-[12px] font-semibold">Where discovered?<select className={fieldClass}><option>Warehouse inspection</option><option>Venue / onsite</option><option>During transport</option><option>On return</option></select></label><label className="col-span-2 text-[12px] font-semibold">Description<textarea required rows={5} placeholder="Describe visible damage, symptoms, and circumstances…" className="mt-1.5 w-full rounded-md border border-border bg-surface-2 p-3 text-[12px] outline-none focus:border-accent" /></label></div></section>
          <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center"><Camera className="mx-auto h-6 w-6 text-text-3" /><p className="mt-2 text-[12px] font-semibold">Attach damage photos</p><p className="mt-1 text-[10px] text-text-3">JPG or PNG · up to 10 MB each</p><Button type="button" variant="outline" size="sm" className="mt-3">Choose Files</Button></section>
        </div>
        <aside className="col-span-4"><div className="sticky top-20 rounded-lg border border-border bg-surface p-5"><div className="flex items-center gap-2 text-[12px] font-bold"><AlertTriangle className="h-4 w-4 text-[var(--color-pay-advance)]" /> Submission impact</div><ul className="mt-4 space-y-3 text-[11px] leading-relaxed text-text-2"><li>• Units will be placed on inspection hold.</li><li>• Available stock will update immediately.</li><li>• Storekeeper and Chief Technician will be notified.</li><li>• A repair task will be opened for major damage.</li></ul><div className="mt-5 border-t border-border pt-4"><Button type="submit" className="w-full"><ShieldAlert /> Submit Damage Report</Button><Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => navigate({ to: "/inventory" })}>Cancel</Button></div></div></aside>
      </form>
    </div>
  </AppShell>;
}