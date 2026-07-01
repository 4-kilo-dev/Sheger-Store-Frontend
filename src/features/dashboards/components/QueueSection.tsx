import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface QueueSectionProps {
  title: string;
  icon?: LucideIcon;
  count?: number;
  children: ReactNode;
}

export function QueueSection({ title, icon: Icon, count, children }: QueueSectionProps) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-bold uppercase tracking-wider" style={{ color: "var(--text-1)" }}>
          {Icon && <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />}
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
