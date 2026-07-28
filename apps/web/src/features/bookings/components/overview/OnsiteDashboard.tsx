import { useQuery } from "@tanstack/react-query";
import { Package, Truck } from "lucide-react";
import { getBookingSnapshotsApi } from "@/features/bookings/services/bookings.api";
import { Section } from "@/features/bookings/components/shared/Section";
import type { OverviewSectionProps } from "./types";

export function OnsiteDashboard({ b }: OverviewSectionProps) {
  const { data: checkoutSnapshots = [] } = useQuery({
    queryKey: ["booking-checkout-snapshots", b.id],
    queryFn: () => getBookingSnapshotsApi(b.id, { kind: "CHECKOUT" }),
    enabled:
      !!b.id &&
      (b.status === "ONSITE" ||
        b.status === "COMPLETED" ||
        b.status === "DONE" ||
        b.status === "PARTIALLY_RETURNED"),
  });
  const checkoutSnapshot = checkoutSnapshots?.[0] || null;

  return (
    <>
      <div
        className="rounded-lg border p-4 flex items-center gap-3"
        style={{
          borderColor: "color-mix(in oklab, var(--color-status-onsite) 30%, transparent)",
          background: "color-mix(in oklab, var(--color-status-onsite) 8%, var(--surface))",
        }}
      >
        <div
          className="h-2 w-2 rounded-full animate-ping"
          style={{ background: "var(--color-status-onsite)" }}
        />
        <div className="flex-1">
          <span
            className="text-[12px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--color-status-onsite)" }}
          >
            ONSITE (Active Job)
          </span>
          <span className="text-[11px] text-[var(--text-2)] leading-normal mt-0.5 block">
            Equipment has been checked out from the warehouse and dispatched to the venue. The crew
            is currently executing onsite setup.
          </span>
        </div>
      </div>

      <Section title="Dispatched Equipment (Checked-out Snapshot)" icon={Package}>
        {checkoutSnapshot ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="label-eyebrow pb-2 text-left">Item Name</th>
                  <th className="label-eyebrow pb-2 text-right w-28">Checked Out Qty</th>
                  <th className="label-eyebrow pb-2 text-right w-24">Type</th>
                </tr>
              </thead>
              <tbody>
                {checkoutSnapshot.lines?.map((line: any) => {
                  const name = line.item?.name || line.pool?.name || "Equipment Item";
                  const isPool = !!line.poolId;
                  return (
                    <tr
                      key={line.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2.5 font-medium">{name}</td>
                      <td className="py-2.5 text-right font-mono font-bold">{line.quantity}</td>
                      <td
                        className="py-2.5 text-right text-[10px] uppercase font-bold"
                        style={{ color: "var(--text-3)" }}
                      >
                        {isPool ? "Bulk" : "Serialized"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
            No checkout snapshot found. Gear check-out signature is pending in the warehouse.
          </div>
        )}
      </Section>

      <Section title="Onsite Logistics & Team Brief" icon={Truck}>
        <div className="grid grid-cols-2 gap-4 text-[12px]">
          <div
            className="rounded border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
              Driver & Vehicle
            </div>
            <div className="font-semibold">{b.driver || "No driver assigned"}</div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
              Plate: {(b as any).vehiclePlate || "—"}
            </div>
          </div>
          <div
            className="rounded border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
              Onsite Crew
            </div>
            <div className="font-semibold">Lead: {b.teamLeader || "—"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>
              {b.stageHand}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
