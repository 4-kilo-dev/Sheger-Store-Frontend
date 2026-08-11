import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type EquipmentPoolOption = {
  id: string;
  name?: string;
  unit?: string;
  category?: { name?: string; unit?: string; trackingType?: string };
};

type Props = {
  pools: EquipmentPoolOption[];
  value: string;
  onChange: (poolId: string) => void;
  /** Optional stock label for each pool id (e.g. totalQuantity). */
  getStockLabel?: (poolId: string) => number | null | undefined;
  disabled?: boolean;
  placeholder?: string;
};

function poolSearchText(pool: EquipmentPoolOption, stock?: number | null): string {
  const unit = pool.unit || pool.category?.unit || "";
  const stockPart =
    stock != null ? `stock ${stock}${unit ? ` ${unit}` : ""}` : "";
  return [pool.name, pool.category?.name, stockPart].filter(Boolean).join(" ").toLowerCase();
}

export function EquipmentPoolCombobox({
  pools,
  value,
  onChange,
  getStockLabel,
  disabled,
  placeholder = "-- Choose Equipment --",
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => pools.find((p) => p.id === value),
    [pools, value],
  );

  const selectedLabel = selected
    ? `${selected.name || "Equipment"} (${selected.category?.name || "General"})`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Select equipment pool"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded border bg-[var(--surface-2)] px-2.5 text-left text-[12px] outline-none transition",
            "hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60",
          )}
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <span className={cn("truncate", !selected && "opacity-60")}>{selectedLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          color: "var(--foreground)",
        }}
      >
        <Command
          filter={(value, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return 1;
            return value.includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search equipment, category, stock…" className="text-[12px]" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              No equipment matches.
            </CommandEmpty>
            <CommandGroup>
              {pools.map((pool) => {
                const stock = getStockLabel?.(pool.id);
                const unit = pool.unit || pool.category?.unit || "";
                const stockLabel =
                  stock != null ? ` — stock ${stock}${unit ? ` ${unit}` : ""}` : "";
                const label = `${pool.name || "Equipment"} (${pool.category?.name || "General"})${stockLabel}`;
                const searchValue = poolSearchText(pool, stock);

                return (
                  <CommandItem
                    key={pool.id}
                    value={searchValue}
                    onSelect={() => {
                      onChange(pool.id === value ? "" : pool.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer text-[12px]"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5 shrink-0",
                        value === pool.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
