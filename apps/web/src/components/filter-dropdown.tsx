import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

interface FilterDropdownProps {
  icon?: ReactNode;
  label: string;
  options: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  multi?: boolean;
}

export function FilterDropdown({ icon, label, options, selected, onChange, multi = true }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (opt: string) => {
    const next = new Set(selected);
    if (multi) {
      next.has(opt) ? next.delete(opt) : next.add(opt);
    } else {
      if (next.has(opt)) {
        next.clear();
      } else {
        next.clear();
        next.add(opt);
      }
    }
    onChange(next);
  };

  const clearAll = () => onChange(new Set());

  const hasSelection = selected.size > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] transition hover:border-[var(--accent)]"
        style={{
          borderColor: hasSelection ? "var(--accent)" : "var(--border)",
          color: hasSelection ? "var(--accent)" : "var(--text-2)",
          background: hasSelection ? "color-mix(in oklab, var(--accent) 6%, var(--surface))" : "var(--surface)",
        }}
      >
        {icon}
        {label}
        {hasSelection && (
          <span
            className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {selected.size}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border p-1 shadow-xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {hasSelection && (
            <button
              onClick={clearAll}
              className="mb-1 w-full rounded-md px-3 py-1.5 text-left text-[11px] font-semibold transition hover:bg-[var(--surface-2)]"
              style={{ color: "var(--text-3)" }}
            >
              Clear filters
            </button>
          )}
          <div className="max-h-52 overflow-y-auto scrollbar-thin">
            {options.map((opt) => {
              const isSelected = selected.has(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] transition hover:bg-[var(--surface-2)]"
                  style={{ color: isSelected ? "var(--accent)" : "var(--foreground)" }}
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition"
                    style={{
                      borderColor: isSelected ? "var(--accent)" : "var(--border)",
                      background: isSelected ? "var(--accent)" : "transparent",
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3" style={{ color: "var(--accent-foreground)" }} />}
                  </div>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SortButtonProps {
  icon?: ReactNode;
  label: string;
  direction: "asc" | "desc";
  onToggle: () => void;
}

export function SortButton({ icon, label, direction, onToggle }: SortButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12px] transition hover:border-[var(--accent)]"
      style={{ borderColor: "var(--border)", color: "var(--text-2)", background: "var(--surface)" }}
    >
      {icon}
      {label}
      <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>
        {direction === "asc" ? "↑" : "↓"}
      </span>
    </button>
  );
}
