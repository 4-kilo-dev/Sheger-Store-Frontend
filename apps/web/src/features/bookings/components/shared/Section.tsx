import type { LucideIcon } from "lucide-react";

interface SectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function Section({ title, icon: Icon, children, action }: SectionProps) {
  return (
    <div
      className="rounded-lg border relative overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
          <span className="label-eyebrow">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
