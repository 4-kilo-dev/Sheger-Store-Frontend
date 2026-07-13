import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { updateBookingApi } from "@/features/bookings/services/bookings.api";
import { useStaffForBooking } from "@/features/bookings/hooks/useStaffForBooking";
import { Section } from "@/features/bookings/components/shared/Section";
import type { OverviewSectionProps } from "./types";

export function OoVehicleDriverSection({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const { staffList } = useStaffForBooking(caps.canFetchStaff);

  const [vehicleText, setVehicleText] = useState(b.driver || "");
  const [vehiclePlate, setVehiclePlate] = useState((b as any).vehiclePlate || "");
  const [driverUserId, setDriverUserId] = useState((b as any).driverUserId || "");
  const [isSavingLogistics, setIsSavingLogistics] = useState(false);

  useEffect(() => {
    setVehicleText(b.driver || "");
    setVehiclePlate((b as any).vehiclePlate || "");
    setDriverUserId((b as any).driverUserId || "");
  }, [b]);

  const handleSaveLogistics = async () => {
    setIsSavingLogistics(true);
    try {
      await updateBookingApi(b.id, {
        vehicleText,
        vehiclePlate,
        driverUserId: driverUserId || undefined,
      });
      toast.success("Vehicle & driver details saved!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save vehicle details");
    } finally {
      setIsSavingLogistics(false);
    }
  };

  return (
    <Section title="Vehicle & Driver Details" icon={Truck}>
      <div className="space-y-4">
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Record the vehicle and driver dispatched with this booking. This information will appear
          on the onsite brief.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Driver Name / Description
            <input
              type="text"
              value={vehicleText}
              onChange={(e) => setVehicleText(e.target.value)}
              placeholder="e.g. Abebe Kebede"
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Vehicle Plate Number
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="e.g. AA 3-A12345"
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] font-mono"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
          <label
            className="text-[11px] font-semibold block col-span-2"
            style={{ color: "var(--text-2)" }}
          >
            Assign Driver from Staff List
            <select
              value={driverUserId}
              onChange={(e) => setDriverUserId(e.target.value)}
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px] cursor-pointer"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="">— Select driver (optional) —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveLogistics}
            disabled={isSavingLogistics}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {isSavingLogistics ? "Saving…" : "Save Vehicle & Driver"}
          </button>
        </div>
      </div>
    </Section>
  );
}
