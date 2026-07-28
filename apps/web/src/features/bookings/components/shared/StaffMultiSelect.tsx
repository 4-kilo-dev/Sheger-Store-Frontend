interface StaffMultiSelectOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface StaffMultiSelectProps {
  options: StaffMultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}

export function StaffMultiSelect({
  options,
  selectedIds,
  onChange,
  emptyMessage = "No staff available.",
}: StaffMultiSelectProps) {
  const selectable = options.filter((o) => !o.disabled);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (options.length === 0) {
    return (
      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className="max-h-52 overflow-y-auto rounded-md border"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-2.5 border-b px-3 py-2.5 text-[12px] last:border-b-0 hover:brightness-95"
          style={{
            borderColor: "var(--border)",
            opacity: option.disabled ? 0.5 : 1,
            cursor: option.disabled ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(option.id)}
            disabled={option.disabled}
            onChange={() => !option.disabled && toggle(option.id)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          <span style={{ color: "var(--text-1)" }}>{option.label}</span>
        </label>
      ))}
      {selectable.length === 0 && (
        <p className="px-3 py-2 text-[11px]" style={{ color: "var(--text-3)" }}>
          All technicians are already assigned.
        </p>
      )}
    </div>
  );
}
