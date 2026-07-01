import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  note?: string;
  icon?: LucideIcon;
  trend?: string;
  trendColor?: string;
}

export function StatCard({ label, value, note, icon: Icon, trend, trendColor }: StatCardProps) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">{label}</span>
        {Icon && <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />}
      </div>
      <div className="mt-2 stat-value">{value}</div>
      {note && <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>{note}</div>}
      {trend && (
        <div className="mt-1 text-[10px]" style={{ color: trendColor || "var(--text-3)" }}>
          {trend}
        </div>
      )}
    </div>
  );
}
