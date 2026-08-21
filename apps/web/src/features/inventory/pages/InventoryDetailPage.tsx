import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Package,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getInventoryItemDetailApi } from "@/features/inventory/services/inventory.api";
import { EditInventoryModal } from "@/features/inventory/components/EditInventoryModal";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { useDateFormatter } from "@/context/CalendarSystemContext";

const _Route = createFileRoute("/inventory/$itemId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.itemId} · Inventory · Vortex Visual` },
      { name: "description", content: `Equipment history and availability for ${params.itemId}.` },
    ],
  }),
  loader: ({ params }) => {
    return { itemId: params.itemId };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-accent" />
        <p>Inventory item not found.</p>
        <Link to="/inventory" className="text-accent">
          Back to Inventory
        </Link>
      </div>
    </AppShell>
  ),
  component: InventoryDetail,
});

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="border-r border-border px-5 last:border-0">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-1 font-mono text-[22px] font-bold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}

export function InventoryDetail() {
  const { itemId } = _Route.useParams();
  const { formatDate } = useDateFormatter();
  const { can } = usePermissions();
  const canManage = can(PERMISSION.INVENTORY_MANAGE);
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState<"Units" | "Allocation" | "Maintenance">("Units");

  const serviceDateLabel = (value?: string | null) => {
    if (!value) return "Not recorded";
    const formatted = formatDate(value);
    return formatted === "—" ? "Not recorded" : formatted;
  };

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["inventoryItem", itemId],
    queryFn: () => getInventoryItemDetailApi(itemId),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <p className="text-[14px] font-semibold text-text-2">Loading item details...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !item) {
    return (
      <AppShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8 text-accent" />
          <p className="text-[14px] font-semibold text-text-2">
            Inventory item not found or failed to load.
          </p>
          <Link to="/inventory" className="text-accent">
            Back to Inventory
          </Link>
        </div>
      </AppShell>
    );
  }

  const unitRows =
    item.entityKind === "item"
      ? [
          {
            serial: item.serialNumber || item.assetTag || item.id,
            state: item.availability === "ONSITE"
              ? "CHECKED OUT"
              : item.itemCondition || (item.damaged ? "DAMAGED" : "AVAILABLE"),
            location: item.location,
            inspected: item.lastService,
          },
        ]
      : [
          {
            serial: item.sku || item.id,
            state: `${item.available} available / ${item.total} total`,
            location: item.location,
            inspected: item.lastService,
          },
        ];

  const movementSummary = [
    { label: "Available in warehouse", value: item.available, tone: "var(--color-bom-returned)" },
    { label: "Reserved for bookings", value: item.reserved, tone: "var(--color-pay-advance)" },
    { label: "Currently onsite", value: item.onsite, tone: "var(--color-status-accepted)" },
    { label: "Damaged / out of service", value: item.damaged, tone: "var(--destructive)" },
  ].filter((row) => row.value > 0 || ["Available in warehouse"].includes(row.label));

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/inventory"
          className="flex items-center gap-2 text-[12px] font-semibold text-text-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
        </Link>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setTab("Allocation")}>
            <RotateCcw /> Stock Allocation
          </Button>
          <Button size="sm" asChild>
            <Link
              to="/damage-report"
              search={{
                poolId: item.entityKind === "pool" ? item.entityId : undefined,
                itemId: item.entityKind === "item" ? item.entityId : undefined,
                booking: undefined,
              }}
            >
              <ShieldAlert /> Report Damage
            </Link>
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-surface">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 text-accent">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="font-mono text-[11px] font-bold text-accent">{item.id}</div>
              <h1 className="mt-0.5 text-[24px] font-bold tracking-tight">{item.name}</h1>
              <div className="mt-1 text-[12px] text-text-2">
                {item.model} · {item.category}
              </div>
            </div>
          </div>
          <span className="rounded-md border border-border px-2.5 py-1 text-[10px] font-bold text-accent">
            {item.availability}
          </span>
        </div>
        <div className="grid grid-cols-5 py-4">
          <Stat label="Total" value={item.total} />
          <Stat label="Available" value={item.available} tone="var(--color-bom-returned)" />
          <Stat label="Reserved" value={item.reserved} tone="var(--color-pay-advance)" />
          <Stat label="Onsite" value={item.onsite} tone="var(--color-status-accepted)" />
          <Stat label="Damaged" value={item.damaged} tone="var(--destructive)" />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-12 gap-4">
        <div className="col-span-9 rounded-lg border border-border bg-surface">
          <div className="flex gap-1 border-b border-border px-3">
            {(["Units", "Allocation", "Maintenance"] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className="relative px-3 py-3 text-[12px] font-semibold"
                style={{ color: tab === name ? "var(--foreground)" : "var(--text-2)" }}
              >
                {name}
                {tab === name && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-accent" />}
              </button>
            ))}
          </div>

          {tab === "Units" && (
            <table className="w-full text-[12px]">
              <thead>
                <tr>
                  {(item.entityKind === "item"
                    ? ["Serial / Asset", "State", "Location", "Last service"]
                    : ["SKU / Pool", "Quantity", "Location", "Last service"]
                  ).map((h) => (
                    <th key={h} className="border-b border-border px-4 py-3 text-left label-eyebrow">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unitRows.map((unit) => (
                  <tr key={unit.serial} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold">{unit.serial}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold"
                        style={{
                          color:
                            String(unit.state).includes("DAMAGED")
                              ? "var(--destructive)"
                              : "var(--color-bom-returned)",
                        }}
                      >
                        {unit.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-2">{unit.location}</td>
                    <td className="px-4 py-3 font-mono text-text-2">
                      {serviceDateLabel(unit.inspected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "Allocation" && (
            <div className="space-y-4 p-5">
              <p className="text-[12px] text-text-2">
                Live allocation snapshot for this {item.entityKind === "pool" ? "pool" : "asset"} — not a
                movement history. Checkout / check-in trails live on each booking.
              </p>
              {movementSummary.map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4" style={{ color: row.tone }} />
                  <div className="flex flex-1 items-center justify-between">
                    <p className="text-[12px] font-semibold">{row.label}</p>
                    <p className="font-mono text-[12px] font-bold" style={{ color: row.tone }}>
                      {row.value}
                    </p>
                  </div>
                </div>
              ))}
              {item.reserved === 0 && item.onsite === 0 && item.damaged === 0 && (
                <p className="text-[11px] text-text-3">No active reservations or onsite units.</p>
              )}
            </div>
          )}

          {tab === "Maintenance" && (
            <div className="p-5">
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-4">
                <Wrench className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-[13px] font-semibold">Service schedule</p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-2">
                    Last: {serviceDateLabel(item.lastService)} · Next:{" "}
                    {serviceDateLabel(item.nextService)}
                  </p>
                  {!item.lastService && !item.nextService && (
                    <p className="mt-2 text-[11px] text-text-3">
                      Maintenance dates are not tracked for this item yet.
                    </p>
                  )}
                  {item.notes ? (
                    <p className="mt-2 text-[11px] text-text-2">{item.notes}</p>
                  ) : (
                    <p className="mt-2 text-[11px] text-text-3">No maintenance notes on file.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="col-span-3 space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="label-eyebrow">Storage</span>
            </div>
            <p className="text-[13px] font-semibold">{item.location}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-accent" />
              <span className="label-eyebrow">Service Record</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-text-2">Last service</span>
                <span className="font-mono">{serviceDateLabel(item.lastService)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-2">Next due</span>
                <span className="font-mono">{serviceDateLabel(item.nextService)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent" />
              <span className="label-eyebrow">Tracking</span>
            </div>
            <p className="text-[13px] font-semibold">
              {item.entityKind === "pool" ? "Bulk pool" : "Serialized item"}
            </p>
            <p className="text-[11px] text-text-2">
              {item.entityKind === "pool"
                ? "Quantity managed as a pool"
                : item.serialNumber || item.assetTag || "No serial on file"}
            </p>
          </div>
        </aside>
      </div>
      <EditInventoryModal open={showEdit} item={item} onClose={() => setShowEdit(false)} />
    </AppShell>
  );
}
