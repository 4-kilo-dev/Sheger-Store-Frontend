import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Boxes, Filter, PackageCheck, Search, ShieldAlert, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { FilterDropdown, SortButton } from "@/components/filter-dropdown";
import { useQuery } from "@tanstack/react-query";
import {
  INVENTORY_CATEGORIES,
  type InventoryCondition,
  getCombinedInventoryApi,
} from "@/features/inventory/services/inventory.api";
import { AddInventoryModal } from "@/features/inventory/components/AddInventoryModal";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";

const _Route = createFileRoute("/inventory/")({
  head: () => ({
    meta: [
      { title: "Inventory · Vortex Visual" },
      { name: "description", content: "LED equipment stock, allocation, service, and damage tracking." },
    ],
  }),
  component: InventoryPage,
});

const conditionColor: Record<InventoryCondition, string> = {
  GOOD: "var(--color-bom-returned)",
  "SERVICE DUE": "var(--color-pay-advance)",
  DAMAGED: "var(--destructive)",
};

const ALL_CONDITIONS: InventoryCondition[] = ["GOOD", "SERVICE DUE", "DAMAGED"];

export function InventoryPage() {
  const { can } = usePermissions();
  const canManage = can(PERMISSION.INVENTORY_MANAGE);
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const { data: inventoryList = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: getCombinedInventoryApi,
  });

  const [conditionFilter, setConditionFilter] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState<Set<string>>(new Set());
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const ALL_LOCATIONS = useMemo(
    () => [...new Set(inventoryList.map((i) => i.location))].sort(),
    [inventoryList]
  );

  const categoryTabs = useMemo(() => {
    const live = [...new Set(inventoryList.map((i) => i.category).filter(Boolean))].sort();
    const staticWithoutAll = INVENTORY_CATEGORIES.filter((c) => c !== "All") as string[];
    const merged = ["All", ...new Set([...staticWithoutAll, ...live])];
    return merged;
  }, [inventoryList]);

  const rows = useMemo(() => {
    let items = inventoryList.filter(
      (item) =>
        (category === "All" || item.category === category) &&
        `${item.id} ${item.name} ${item.model}`.toLowerCase().includes(query.toLowerCase())
    );

    if (conditionFilter.size > 0) items = items.filter((item) => conditionFilter.has(item.condition));
    if (locationFilter.size > 0) items = items.filter((item) => locationFilter.has(item.location));

    items = [...items].sort((a, b) => {
      const cmp = a.available - b.available;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [category, query, conditionFilter, locationFilter, sortDir, inventoryList]);

  const totals = inventoryList.reduce(
    (a, i) => ({
      units: a.units + i.total,
      available: a.available + i.available,
      onsite: a.onsite + i.onsite,
      attention: a.attention + i.damaged,
    }),
    { units: 0, available: 0, onsite: 0, attention: 0 }
  );

  const activeFilterCount = conditionFilter.size + locationFilter.size;

  return (
    <AppShell>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="label-eyebrow mb-1">Warehouse Control</div>
          <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight">Inventory</h1>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Boxes /> Add Inventory Item
          </Button>
        )}
      </div>

      <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Total Units", value: totals.units, icon: Boxes, tone: "var(--foreground)" },
          { label: "Available Now", value: totals.available, icon: PackageCheck, tone: "var(--color-bom-returned)" },
          { label: "Currently Onsite", value: totals.onsite, icon: Wrench, tone: "var(--color-status-accepted)" },
          { label: "Damaged / Hold", value: totals.attention, icon: ShieldAlert, tone: "var(--destructive)" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="flex items-center justify-between rounded-lg border bg-surface p-4">
            <div>
              <div className="label-eyebrow">{label}</div>
              <div className="mt-1.5 font-mono text-[24px] font-bold">{value}</div>
            </div>
            <Icon className="h-5 w-5" style={{ color: tone }} />
          </div>
        ))}
      </div>

      <div className="mb-3 scrollable-tabs gap-1 border-b border-border">
        {categoryTabs.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className="relative px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap"
            style={{ color: category === item ? "var(--foreground)" : "var(--text-2)" }}
          >
            {item}
            {category === item && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-auto sm:flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search item, asset code, model…"
            className="h-9 w-full rounded-md border border-border bg-surface-2 pl-8 pr-3 text-[12px] outline-none focus:border-accent"
          />
        </div>
        <FilterDropdown
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Condition"
          options={ALL_CONDITIONS}
          selected={conditionFilter}
          onChange={setConditionFilter}
        />
        <FilterDropdown
          icon={<Filter className="h-3.5 w-3.5" />}
          label="Location"
          options={ALL_LOCATIONS}
          selected={locationFilter}
          onChange={setLocationFilter}
        />
        <div className="ml-auto flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setConditionFilter(new Set());
                setLocationFilter(new Set());
              }}
              className="text-[11px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              Clear filters
            </button>
          )}
          <SortButton
            icon={<ArrowUpDown className="h-3.5 w-3.5" />}
            label="Availability"
            direction={sortDir}
            onToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-[12px]">
          <thead className="bg-surface-2">
            <tr>
              {["Asset / Item", "Category", "Location", "Stock allocation", "Available", "Condition", "Next service"].map(
                (h) => (
                  <th key={h} className="border-b border-border px-4 py-3 text-left label-eyebrow">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
                  No items match your current filters.
                </td>
              </tr>
            ) : (
              rows.map((item) => {
                const utilized = item.total > 0 ? ((item.reserved + item.onsite) / item.total) * 100 : 0;
                return (
                  <tr key={item.id} className="border-b border-border transition hover:bg-surface-2 last:border-0">
                    <td className="px-4 py-3">
                      <Link to="/inventory/$itemId" params={{ itemId: item.id }} className="font-semibold hover:text-accent">
                        {item.name}
                      </Link>
                      <div className="mt-0.5 font-mono text-[10px] text-text-3">
                        {item.id} · {item.model}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-2">{item.category}</td>
                    <td className="px-4 py-3 text-text-2">{item.location}</td>
                    <td className="w-56 px-4 py-3">
                      <div className="mb-1.5 flex justify-between font-mono text-[10px] text-text-2">
                        <span>
                          {item.reserved} reserved · {item.onsite} onsite
                        </span>
                        <span>{item.total}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${utilized}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[14px] font-bold">{item.available}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[10px] font-bold"
                        style={{ color: conditionColor[item.condition] }}
                      >
                        {item.condition !== "GOOD" && <AlertTriangle className="h-3 w-3" />}
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-text-2">{item.nextService}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-text-2">
          <span>Showing {rows.length} equipment groups</span>
          <span>{totals.units} serialized and pooled units tracked</span>
        </div>
      </div>

      <AddInventoryModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </AppShell>
  );
}
