import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div><div className="label-eyebrow mb-1">{eyebrow}</div><h1 className="text-[24px] font-bold tracking-tight">{title}</h1><p className="mt-1 text-[12px] text-text-2">{description}</p></div>
      {action ? <Button>{action}</Button> : null}
    </div>
  );
}

export function StatStrip({ items }: { items: Array<{ label: string; value: string; note: string; icon: LucideIcon }> }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{items.map(({ label, value, note, icon: Icon }) => <div key={label} className="border border-border bg-surface p-4"><div className="flex items-center justify-between"><span className="label-eyebrow">{label}</span><Icon className="h-4 w-4 text-accent" /></div><div className="mt-3 text-[22px] font-bold">{value}</div><div className="mt-1 text-[11px] text-text-2">{note}</div></div>)}</div>;
}

export function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return <section className="border border-border bg-surface"><header className="flex h-11 items-center justify-between border-b border-border px-4"><h2 className="text-[13px] font-bold">{title}</h2>{aside ? <span className="text-[10px] font-semibold uppercase tracking-wider text-text-2">{aside}</span> : null}</header><div className="p-4">{children}</div></section>;
}

export function Meter({ value, tone = "accent" }: { value: number; tone?: "accent" | "destructive" }) {
  return <div className="h-1.5 overflow-hidden bg-surface-2"><div className={tone === "accent" ? "h-full bg-accent" : "h-full bg-destructive"} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}