import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getInventoryCategoriesApi,
  getInventoryPoolsApi,
  getPoolAvailabilityApi,
} from "@/features/inventory/services/inventory.api";

function readStock(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function nearTermWindow(): { from: string; to: string } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function ScreenAvailabilityWidget() {
  const window = useMemo(() => nearTermWindow(), []);

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: getInventoryCategoriesApi,
  });

  const { data: pools = [], isLoading: loadingPools } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
  });

  const screenPools = useMemo(() => {
    const screenCat = categories.find(
      (c) =>
        c.key === "screen" ||
        /led\s*screen/i.test(c.name) ||
        c.name.toLowerCase() === "led panels",
    );
    const filtered = screenCat
      ? pools.filter((p: any) => p.categoryId === screenCat.id && p.isActive !== false)
      : pools.filter((p: any) => {
          const name = String(p.name || "");
          return /p\d|screen|led|panel/i.test(name) && p.isActive !== false;
        });
    return [...filtered].sort((a: any, b: any) =>
      String(a.name || "").localeCompare(String(b.name || "")),
    );
  }, [categories, pools]);

  const availabilityQueries = useQueries({
    queries: screenPools.map((pool: any) => ({
      queryKey: ["pool-availability", pool.id, window.from, window.to],
      queryFn: () => getPoolAvailabilityApi(pool.id, window.from, window.to),
      enabled: !!pool.id,
      staleTime: 60_000,
    })),
  });

  const isLoading = loadingCats || loadingPools;
  const unit =
    categories.find((c) => c.key === "screen")?.unit ||
    screenPools[0]?.unit ||
    screenPools[0]?.category?.unit ||
    "m²";

  if (isLoading) {
    return (
      <div
        className="rounded-lg border p-4 animate-pulse"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>
          Loading screen availability…
        </div>
      </div>
    );
  }

  if (screenPools.length === 0) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="label-eyebrow mb-2">Screen availability</div>
        <p className="text-[12px]" style={{ color: "var(--text-3)" }}>
          No LED screen pools found in inventory. Add screen stock under the LED Screen category.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="label-eyebrow">Screen availability</div>
        <div className="text-[10px] font-semibold" style={{ color: "var(--text-3)" }}>
          Next 7 days · from inventory
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {screenPools.map((pool: any, idx: number) => {
          const stock = readStock(pool.totalQuantity);
          const availQuery = availabilityQueries[idx];
          const available =
            availQuery?.data?.available != null
              ? Number(availQuery.data.available)
              : null;
          const hardReserved =
            availQuery?.data?.hardReserved != null
              ? Number(availQuery.data.hardReserved)
              : null;
          const displayAvail = available != null && Number.isFinite(available) ? available : stock;
          const tight = displayAvail <= 0;
          const low = !tight && stock > 0 && displayAvail / stock < 0.25;

          return (
            <div
              key={pool.id}
              className="rounded-md border p-3"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div className="font-data text-[12px] font-bold" style={{ color: "var(--text-1)" }}>
                {pool.name || pool.sku || "Screen pool"}
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div>
                  <div
                    className="font-mono text-[18px] font-bold leading-none"
                    style={{
                      color: tight
                        ? "var(--destructive)"
                        : low
                          ? "var(--color-pay-advance)"
                          : "var(--color-bom-returned)",
                    }}
                  >
                    {availQuery?.isLoading ? "…" : displayAvail}
                    <span className="ml-1 text-[11px] font-semibold opacity-80">{unit}</span>
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                    available
                  </div>
                </div>
                <div className="text-right text-[10px]" style={{ color: "var(--text-2)" }}>
                  <div>
                    Stock <span className="font-mono font-semibold">{stock}</span> {unit}
                  </div>
                  {hardReserved != null && hardReserved > 0 && (
                    <div className="mt-0.5">
                      Held <span className="font-mono font-semibold">{hardReserved}</span> {unit}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScreenAvailabilityWidget;
