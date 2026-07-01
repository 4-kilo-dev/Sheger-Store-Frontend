import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCombinedInventoryApi } from "@/features/inventory/services/inventory.api";

export function EquipmentPoolWidget() {
  const { data: inventoryList = [], isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: getCombinedInventoryApi,
  });

  const stats = useMemo(() => {
    if (inventoryList.length === 0) {
      return { total: 100, available: 60, reserved: 20, onsite: 20 };
    }
    const total = inventoryList.reduce((a, i) => a + (i.total || 0), 0);
    const available = inventoryList.reduce((a, i) => a + (i.available || 0), 0);
    const onsite = inventoryList.reduce((a, i) => a + (i.onsite || 0), 0);
    const reserved = Math.max(0, total - available - onsite);
    return { total: total || 100, available, reserved, onsite };
  }, [inventoryList]);

  const percentageAvailable = Math.round((stats.available / stats.total) * 100);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-5 flex flex-col justify-center items-center h-48 animate-pulse" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading equipment stats...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="label-eyebrow mb-4">Equipment pool</div>
      <div className="flex items-center gap-6">
        <div className="relative h-24 w-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="var(--color-bom-returned)"
              strokeWidth="3"
              strokeDasharray={`${(stats.available / stats.total) * 88} 88`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[16px] font-bold">{percentageAvailable}%</div>
            <div className="text-[8px] uppercase tracking-wider font-bold" style={{ color: "var(--text-3)" }}>Available</div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {[
            { label: "Available", value: stats.available, color: "var(--color-bom-returned)" },
            { label: "Reserved", value: stats.reserved, color: "var(--color-pay-advance)" },
            { label: "Onsite", value: stats.onsite, color: "var(--color-status-accepted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--text-2)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
              <span className="font-data font-bold" style={{ color: "var(--text-1)" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <Button variant="outline" size="default" asChild className="mt-4 w-full h-9 text-[11px] font-semibold">
        <Link to="/inventory">
          View inventory <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
export default EquipmentPoolWidget;
