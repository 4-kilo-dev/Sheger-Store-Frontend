import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Trash2, Wrench } from "lucide-react";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import {
  createReservationApi,
  deleteReservationApi,
  getBookingReservationsApi,
  updateBookingApi,
} from "@/features/bookings/services/bookings.api";
import {
  getInventoryCategoriesApi,
  getInventoryPoolsApi,
  getPoolAvailabilityApi,
} from "@/features/inventory/services/inventory.api";
import { Section } from "@/features/bookings/components/shared/Section";
import { AccessLockOverlay } from "@/features/bookings/components/shared/AccessLockOverlay";
import { PERMISSION } from "@/lib/auth/permission-keys";
import type { OverviewSectionProps } from "./types";

export function TechnicalHoldsSection({ b, code, caps }: OverviewSectionProps) {
  const { formatDate } = useDateFormatter();
  const queryClient = useQueryClient();
  const canWrite = caps.canWriteTechnicalHolds;

  const [screenPools, setScreenPools] = useState<any[]>([]);
  const [screenAvailabilities, setScreenAvailabilities] = useState<Record<string, number>>({});
  const [allocations, setAllocations] = useState<any[]>([{ poolId: "", quantity: 0 }]);
  const [ctoNotes, setCtoNotes] = useState(b.ctoNotes || "");
  const [isSavingTechnical, setIsSavingTechnical] = useState(false);
  const [isPoolsRestricted, setIsPoolsRestricted] = useState(false);

  useEffect(() => {
    setCtoNotes(b.ctoNotes || "");
  }, [b.ctoNotes]);

  const { data: reservationsRes } = useQuery({
    queryKey: ["booking-reservations", b.id],
    queryFn: () => getBookingReservationsApi(b.id),
    enabled: !!b.id,
  });

  const hasTechnicalHolds =
    !!b.ctoNotes || (reservationsRes?.reservations && reservationsRes.reservations.length > 0);
  const [isEditingHolds, setIsEditingHolds] = useState(!hasTechnicalHolds);

  useEffect(() => {
    const loadPools = async () => {
      try {
        const [cats, pools] = await Promise.all([
          getInventoryCategoriesApi(),
          getInventoryPoolsApi(),
        ]);
        const screenCat = cats.find((c) => c.key === "screen" || c.name === "LED Screen Modules");
        if (screenCat) {
          setScreenPools(pools.filter((p) => p.categoryId === screenCat.id));
        } else {
          setScreenPools(pools);
        }
      } catch (e: any) {
        console.error("Failed to load screen pools", e);
        if (e.status === 403) {
          setIsPoolsRestricted(true);
        }
      }
    };
    loadPools();
  }, []);

  useEffect(() => {
    if (reservationsRes) {
      const mapped = (reservationsRes.reservations || []).map((r: any) => ({
        poolId: r.poolId || "",
        quantity: parseFloat(r.quantity) || 0,
      }));
      setAllocations(mapped.length > 0 ? mapped : [{ poolId: "", quantity: 0 }]);
      if (mapped.length > 0 || !!b.ctoNotes) {
        setIsEditingHolds(false);
      } else {
        setIsEditingHolds(true);
      }
    }
  }, [reservationsRes, b.ctoNotes]);

  useEffect(() => {
    if (!b.assemblyDate || !b.eventDate || screenPools.length === 0) {
      setScreenAvailabilities({});
      return;
    }
    let active = true;
    const fetchAvailabilities = async () => {
      try {
        const results = await Promise.all(
          screenPools.map(async (p) => {
            try {
              const res = await getPoolAvailabilityApi(p.id, b.assemblyDate, b.eventDate);
              return { sku: p.sku || p.name, available: res.available ?? res.total ?? 0 };
            } catch {
              return { sku: p.sku || p.name, available: parseInt(p.totalQuantity) || 0 };
            }
          })
        );
        if (active) {
          const mapping: Record<string, number> = {};
          results.forEach((r) => {
            mapping[r.sku] = r.available;
          });
          setScreenAvailabilities(mapping);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchAvailabilities();
    return () => {
      active = false;
    };
  }, [b.assemblyDate, b.eventDate, screenPools]);

  const handleSaveTechnical = async () => {
    const validAllocations = allocations.filter((a) => a.poolId && a.quantity > 0);
    const hasNotes = ctoNotes.trim() !== "";
    if (validAllocations.length === 0 && !hasNotes) {
      toast.error("Please add at least one screen type and quantity or provide CTO notes.");
      return;
    }
    setIsSavingTechnical(true);
    try {
      const res = await getBookingReservationsApi(b.id);
      if (res?.reservations) {
        await Promise.all(res.reservations.map((r: any) => deleteReservationApi(b.id, r.id)));
      }

      await Promise.all(
        validAllocations.map((a) =>
          createReservationApi(b.id, { poolId: a.poolId, quantity: String(a.quantity) })
        )
      );

      const bookingPayload: Record<string, string> = {
        ctoConsultationNotes: ctoNotes,
      };
      if (validAllocations.length > 0) {
        bookingPayload.itemServiceSpec = validAllocations
          .map((a) => {
            const p = screenPools.find((sp) => sp.id === a.poolId);
            return `${a.quantity}sqm of ${p ? p.name : "LED Screen"}`;
          })
          .join(", ");
      }
      await updateBookingApi(b.code, bookingPayload);

      toast.success("Technical allocation holds saved!");
      setIsEditingHolds(false);
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["booking-reservations", b.id] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save technical allocation");
    } finally {
      setIsSavingTechnical(false);
    }
  };

  const readOnlyHolds = (
    <Section title="Technical Hold Specifications (Chief Tech Review)" icon={Wrench}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
            Allocated Equipment
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allocations
              .filter((a) => a.poolId)
              .map((alloc, idx) => {
                const p = screenPools.find((sp) => sp.id === alloc.poolId);
                return (
                  <div
                    key={idx}
                    className="flex justify-between border-b py-1 text-[13px]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span>{p ? p.name : "LED Screen"}</span>
                    <span className="font-mono font-semibold">{alloc.quantity} sqm</span>
                  </div>
                );
              })}
          </div>
        </div>

        {b.ctoNotes && (
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
              CTO Consultation Notes
            </div>
            <p
              className="mt-1 rounded bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed border"
              style={{ borderColor: "var(--border)" }}
            >
              {b.ctoNotes}
            </p>
          </div>
        )}
      </div>
    </Section>
  );

  if (!canWrite) {
    if (hasTechnicalHolds) return readOnlyHolds;
    return (
      <Section title="Technical Hold Allocation" icon={Wrench}>
        <div
          className="flex items-center gap-2.5 rounded border border-amber-500/20 bg-amber-500/10 p-3 text-[12px]"
          style={{ color: "var(--color-pay-advance)" }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Awaiting technical hold allocation and notes by Chief Technical Officer.</span>
        </div>
      </Section>
    );
  }

  if (!isEditingHolds) {
    return (
      <Section
        title="Technical Hold Specifications (Chief Tech Review)"
        icon={Wrench}
        action={
          <button
            onClick={() => setIsEditingHolds(true)}
            className="text-[11px] font-semibold hover:underline"
            style={{ color: "var(--accent)" }}
          >
            Edit holds
          </button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
              Allocated Equipment
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allocations
                .filter((a) => a.poolId)
                .map((alloc, idx) => {
                  const p = screenPools.find((sp) => sp.id === alloc.poolId);
                  return (
                    <div
                      key={idx}
                      className="flex justify-between border-b py-1 text-[13px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span>{p ? p.name : "LED Screen"}</span>
                      <span className="font-mono font-semibold">{alloc.quantity} sqm</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {b.ctoNotes && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                CTO Consultation Notes
              </div>
              <p
                className="mt-1 rounded bg-[var(--surface-2)] p-3 text-[13px] leading-relaxed border"
                style={{ borderColor: "var(--border)" }}
              >
                {b.ctoNotes}
              </p>
            </div>
          )}
        </div>
      </Section>
    );
  }

  return (
    <Section title="Technical Hold Allocation (Chief Tech Review)" icon={Wrench}>
      {isPoolsRestricted && (
        <AccessLockOverlay
          sectionName="Technical Holds Allocation"
          permissionKey={PERMISSION.INVENTORY_RESERVE}
        />
      )}
      <div className="space-y-4">
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Specify screen type holds and check live warehouse availability for this event. Dates:{" "}
          <strong className="font-mono text-xs">
            {formatDate(b.assemblyDate)} to {formatDate(b.dismantleDate)}
          </strong>
          .
        </p>

        <div className="space-y-3">
          {allocations.map((alloc, idx) => {
            const selectedPool = screenPools.find((p) => p.id === alloc.poolId);
            const avail = selectedPool
              ? screenAvailabilities[selectedPool.sku || selectedPool.name] ?? 0
              : null;
            return (
              <div
                key={idx}
                className="flex items-end gap-3 rounded border p-3"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <label className="flex-1 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                  Screen Type
                  <select
                    value={alloc.poolId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllocations((prev) =>
                        prev.map((a, i) => (i === idx ? { ...a, poolId: val } : a))
                      );
                    }}
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="">— Select Screen —</option>
                    {screenPools
                      .filter((p) => {
                        if (p.id === alloc.poolId) return true;
                        return !allocations.some((a, i) => {
                          if (i === idx) return false;
                          const otherPool = screenPools.find((sp) => sp.id === a.poolId);
                          return otherPool && (otherPool.id === p.id || otherPool.name === p.name);
                        });
                      })
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="w-28 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                  Quantity (sqm)
                  <input
                    type="number"
                    value={alloc.quantity || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setAllocations((prev) =>
                        prev.map((a, i) => (i === idx ? { ...a, quantity: val } : a))
                      );
                    }}
                    placeholder="qty"
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>

                {alloc.poolId && (
                  <div className="mb-2 text-[11px] text-right shrink-0">
                    <span style={{ color: "var(--text-3)" }}>Avail: </span>
                    <strong
                      style={{
                        color:
                          avail && avail > 10
                            ? "var(--color-bom-returned)"
                            : "var(--color-pay-advance)",
                      }}
                    >
                      {avail !== null ? `${avail} sqm` : "Checking..."}
                    </strong>
                  </div>
                )}

                {allocations.length > 1 && (
                  <button
                    onClick={() => setAllocations((prev) => prev.filter((_, i) => i !== idx))}
                    className="mb-1 rounded border p-2 text-destructive transition hover:bg-destructive hover:text-white"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setAllocations((prev) => [...prev, { poolId: "", quantity: 0 }])}
          className="text-[12px] font-semibold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          + Add another screen
        </button>

        <label className="block text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
          CTO Technical Arrangement Notes
          <textarea
            value={ctoNotes}
            onChange={(e) => setCtoNotes(e.target.value)}
            placeholder="e.g. curve truss mounting, requires NovaStar processor, main power from generator..."
            rows={3}
            className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px]"
            style={{ borderColor: "var(--border)" }}
          />
        </label>

        <button
          onClick={handleSaveTechnical}
          disabled={isSavingTechnical}
          className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:brightness-110"
          style={{ background: "var(--accent)" }}
        >
          {isSavingTechnical ? "Saving..." : "Save Screens & Holds"}
        </button>
      </div>
    </Section>
  );
}
