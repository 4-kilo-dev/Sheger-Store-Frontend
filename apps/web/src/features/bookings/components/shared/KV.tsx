interface KVProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export function KV({ label, value, mono }: KVProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span
        className="text-[11px] uppercase tracking-wider"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </span>
      <span
        className={`text-[13px] font-medium text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
