import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Package } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";
import {
  isAssignableTechnician,
  isChiefTechnicianRole,
} from "@/features/bookings/utils/staffRoles";
import { isDeclinedAssignment } from "@/features/bookings/utils/assignmentHelpers";
import { StaffMultiSelect } from "@/features/bookings/components/shared/StaffMultiSelect";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useSystemCurrency } from "@/hooks/use-system-currency";
import { getBookingCustodyApi } from "@/features/checkout/services/operations.api";
import { getBookingDamageReportsApi } from "@/features/bookings/services/bookings.api";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import {
  buildCheckinReturns,
  isCheckinAction as isInventoryCheckinAction,
  isCheckoutReverseAction,
  type InventoryCondition,
} from "@/features/checkout/services/operation-payloads";

interface BookingActionModalProps {
  booking: Booking;
  actions: ReturnType<typeof useBookingActions>;
}

export function BookingActionModal({ booking, actions }: BookingActionModalProps) {
  const authUser = useAuthUser();
  const { can } = usePermissions();
  const { currency, formatMoney } = useSystemCurrency();
  const {
    showActionModal,
    setShowActionModal,
    selectedAction,
    setSelectedAction,
    cancellationReason,
    setCancellationReason,
    paymentType,
    setPaymentType,
    paymentMethod,
    setPaymentMethod,
    advancePayment,
    setAdvancePayment,
    dailyRate,
    setDailyRate,
    rentedDays,
    setRentedDays,
    checkoutDriver,
    setCheckoutDriver,
    checkoutVehiclePlate,
    setCheckoutVehiclePlate,
    checkoutMealBudget,
    setCheckoutMealBudget,
    staff,
    selectedTechnicianIds,
    setSelectedTechnicianIds,
    assignTechnicians,
    isAssigningTechnicians,
    performCheckout,
    isCheckingOut,
    performCheckin,
    isCheckingIn,
    reverseCheckout,
    isReversingCheckout,
    transitionStatus,
    isTransitioning,
    forceDone,
    isForcingDone,
    isRecordingPayment,
    confirmBookingWithPayment,
    isConfirmingWithPayment,
  } = actions;

  const isCheckinAction = isInventoryCheckinAction(selectedAction);
  const isReverseAction = isCheckoutReverseAction(selectedAction);

  const [checkedCheckinItems, setCheckedCheckinItems] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnConditions, setReturnConditions] = useState<Record<string, InventoryCondition>>({});
  const [forceMissingMode, setForceMissingMode] = useState(false);
  const [forceMissingReason, setForceMissingReason] = useState("");
  const [forceUnpaidCheckout, setForceUnpaidCheckout] = useState(false);
  const [forceUnpaidReason, setForceUnpaidReason] = useState("");
  const { data: custody = [] } = useQuery({
    queryKey: ["checkoutCustody", booking.id],
    queryFn: () => getBookingCustodyApi(booking.id),
    enabled: showActionModal && isCheckinAction,
  });
  const { data: damageReports = [] } = useQuery({
    queryKey: ["booking-damage-reports", booking.id],
    queryFn: () => getBookingDamageReportsApi(booking.id),
    enabled: showActionModal && isCheckinAction,
  });
  const activeReportsByAsset = useMemo(() => {
    const result = new Map<string, { missing: boolean; damaged: number }>();
    for (const report of damageReports) {
      if (report.status !== "OPEN" && report.status !== "UNDER_REVIEW") continue;
      const key = report.poolId ? `pool:${report.poolId}` : `item:${report.itemId}`;
      const current = result.get(key) || { missing: false, damaged: 0 };
      if (report.reportType === "MISSING") current.missing = true;
      if (report.reportType === "DAMAGE") current.damaged += Number.parseFloat(report.quantity || "1") || 1;
      result.set(key, current);
    }
    return result;
  }, [damageReports]);
  const checkinItems = useMemo(
    () =>
      custody
        .filter((line) => Number.parseFloat(line.outstandingQuantity) > 0)
        .map((line) => {
          const source = booking.bomItems.find((item) =>
            line.poolId ? item.poolId === line.poolId : item.itemId === line.itemId,
          );
          return {
            id: line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`,
            poolId: line.poolId || undefined,
            itemId: line.itemId || undefined,
            name: source?.name || "Equipment",
            code: source?.code || line.poolId || line.itemId || "asset",
            outstandingQuantity: line.outstandingQuantity,
            report: activeReportsByAsset.get(line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`),
          };
        }),
    [activeReportsByAsset, booking.bomItems, custody],
  );

  useEffect(() => {
    if (!showActionModal || !isCheckinAction) {
      setCheckedCheckinItems(new Set());
      setReturnQuantities({});
      setReturnConditions({});
      setForceMissingMode(false);
      setForceMissingReason("");
    }
  }, [showActionModal, isCheckinAction, selectedAction?.id]);

  if (!showActionModal || !selectedAction) return null;

  const isAssignTechnicianAction =
    selectedAction.id === "assignment.assign_technician" ||
    selectedAction.id === "booking.assign" ||
    selectedAction.requiresForm === "assign";

  const assignableStaff = staff.filter((s) => isAssignableTechnician(s.role));
  const alreadyAssignedTechIds = new Set(
    (booking.assignments || [])
      .filter(
        (a: any) => a.roleContext === "TECHNICIAN" && !isDeclinedAssignment(a)
      )
      .map((a: any) => a.userId)
  );

  // RESERVED → CONFIRMED always needs the payment form (first confirm or after revert).
  // Backend still requires advance/full payment on file, but amounts may already exist.
  const isConfirmReserved =
    booking.status === "RESERVED" && selectedAction.id === "booking.confirm";
  const showPaymentCapture = isConfirmReserved;
  const isCheckoutAction =
    booking.status === "PREPARATION" && selectedAction.id === "inventory.checkout";

  const toggleCheckinItem = (itemId: string) => {
    setCheckedCheckinItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAllCheckinItems = () => {
    const eligibleItems = checkinItems.filter((item) => !item.report?.missing);
    if (checkedCheckinItems.size === eligibleItems.length) {
      setCheckedCheckinItems(new Set());
    } else {
      setCheckedCheckinItems(new Set(eligibleItems.map((item) => item.id)));
    }
  };

  const hasCheckinItemsSelected =
    checkedCheckinItems.size > 0 ||
    (forceMissingMode && checkinItems.some((item) => item.report?.missing));

  const stagehandLeaderName = booking.teamLeader || "— Not assigned —";
  const screenTypeLabel = booking.screenType || "—";
  const screenSize = booking.size > 0 ? booking.size : 0;
  const screenSizeLabel = screenSize > 0 ? `${screenSize} sqm` : "—";
  const computedTotal =
    dailyRate > 0 && rentedDays > 0 && screenSize > 0
      ? screenSize * dailyRate * rentedDays
      : 0;

  return (
    <div
      className="mb-4 rounded-lg border-2 p-5"
      style={{
        borderColor: selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)",
        background: `color-mix(in oklab, ${selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)"} 6%, var(--surface))`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: selectedAction.variant === "destructive" ? "var(--destructive)" : "var(--accent)",
              color: "#fff",
            }}
          >
            <selectedAction.icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold">{selectedAction.label}</h3>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>
              This will transition the booking from <strong>{booking.status}</strong> to{" "}
              <strong>{selectedAction.targetStatus}</strong>.
              <br />
              Permission required: <strong>{selectedAction.permissionKey || selectedAction.id}</strong>
            </p>

            {showPaymentCapture && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Payment Type
                    <select
                      value={paymentType}
                      onChange={(e) =>
                        setPaymentType(e.target.value as "advance" | "fully_paid")
                      }
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="advance">Advance Deposit</option>
                      <option value="fully_paid">Fully Paid</option>
                    </select>
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Payment Method
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option>Bank Transfer</option>
                      <option>Cash</option>
                      <option>Mobile Money</option>
                    </select>
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Screen Size (sqm)
                    <input
                      type="text"
                      readOnly
                      value={screenSize > 0 ? String(screenSize) : "—"}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px] opacity-80"
                      style={{ borderColor: "var(--border)" }}
                      title="Set at booking intake / technical holds"
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Number of Days
                    <input
                      type="text"
                      readOnly
                      value={rentedDays > 0 ? String(rentedDays) : "—"}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px] opacity-80"
                      style={{ borderColor: "var(--border)" }}
                      title="Set at booking intake"
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Daily Rate ({currency})
                    <input
                      type="number"
                      value={dailyRate || ""}
                      onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 5000"
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Computed Total ({currency})
                    <input
                      type="text"
                      readOnly
                      value={computedTotal > 0 ? computedTotal.toLocaleString() : "—"}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px] opacity-80"
                      style={{ borderColor: "var(--border)" }}
                      title="Screen size × days × daily rate"
                    />
                  </label>
                  {paymentType === "advance" && (
                    <label
                      className="text-[11px] font-semibold"
                      style={{ color: "var(--text-2)" }}
                    >
                      Advance Payment ({currency})
                      <input
                        type="number"
                        value={advancePayment || ""}
                        onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                        placeholder="Enter amount"
                        className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      />
                    </label>
                  )}
                </div>
              )}
              
            {showPaymentCapture && (
                <div className="mt-2 text-[10px]" style={{ color: "var(--text-3)" }}>
                  {paymentType === "advance" ? (
                    advancePayment > 0 && computedTotal >= 1000 ? (
                      <span>
                        Advance payment will record{" "}
                        <strong>{formatMoney(advancePayment)}</strong> (
                        {((advancePayment / computedTotal) * 100).toFixed(0)}
                        %) as paid, leaving a balance of{" "}
                        <strong>{formatMoney(computedTotal - advancePayment)} remaining.</strong>
                      </span>
                    ) : (
                      <span>
                        Computed total = screen size × days × daily rate. Enter the daily rate and
                        advance amount to preview the payment split.
                      </span>
                    )
                  ) : computedTotal >= 1000 ? (
                    <span>
                      Full payment will record the entire{" "}
                      <strong>{formatMoney(computedTotal)}</strong> as paid, leaving no balance.
                    </span>
                  ) : (
                    <span>Enter the daily rate to compute the contract total (size × days × rate).</span>
                  )}
                </div>
              )}
            {showPaymentCapture &&
              screenSize <= 0 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Screen size (sqm) is required — set it on the booking before confirming.</span>
                </div>
              )}
            {showPaymentCapture &&
              rentedDays <= 0 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>This booking has no number of days set — update the booking intake first.</span>
                </div>
              )}
            {showPaymentCapture &&
              screenSize > 0 &&
              rentedDays > 0 &&
              (computedTotal < 1000 || dailyRate <= 0) && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Daily rate is required (computed total min {formatMoney(1000)}).</span>
                </div>
              )}
            {showPaymentCapture &&
              paymentType === "advance" &&
              advancePayment > computedTotal &&
              computedTotal >= 1000 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Advance Payment can't be greater than total payment.</span>
                </div>
              )}
            {showPaymentCapture &&
              paymentType === "advance" &&
              computedTotal >= 1000 &&
              advancePayment <= 0 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Advance Payment must be greater than {formatMoney(0)}.</span>
                </div>
              )}
            {isAssignTechnicianAction && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px]" style={{ color: "var(--text-2)" }}>
                  Select the technician crew for this booking. Uncheck someone to remove them;
                  check someone new to add them.
                </p>
                <StaffMultiSelect
                  options={assignableStaff.map((s) => ({
                    id: s.id,
                    label: `${s.name}${isChiefTechnicianRole(s.role) ? " (Chief Technician)" : ""}${
                      alreadyAssignedTechIds.has(s.id) ? " — currently assigned" : ""
                    }`,
                  }))}
                  selectedIds={selectedTechnicianIds}
                  onChange={setSelectedTechnicianIds}
                  emptyMessage="No technicians available to assign."
                />
                {selectedTechnicianIds.length > 0 && (
                  <p className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                    {selectedTechnicianIds.length} technician
                    {selectedTechnicianIds.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>
            )}

            {isCheckoutAction && (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <span
                      className="text-[11px] font-semibold block"
                      style={{ color: "var(--text-2)" }}
                    >
                      Stagehand Team Leader
                    </span>
                    <div
                      className="mt-1 flex h-9 items-center rounded-md border bg-[var(--surface-2)] px-2.5 text-[12px] font-medium"
                      style={{
                        borderColor: "var(--border)",
                        color: booking.teamLeader ? "var(--text-1)" : "var(--text-3)",
                      }}
                    >
                      {stagehandLeaderName}
                    </div>
                    {!booking.teamLeader && (
                      <span className="mt-1 block text-[10px]" style={{ color: "var(--color-pay-advance)" }}>
                        Assign a stagehand leader on the Overview tab before checkout.
                      </span>
                    )}
                  </div>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Driver
                    <input
                      value={checkoutDriver}
                      onChange={(e) => setCheckoutDriver(e.target.value)}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Vehicle Plate
                    <input
                      value={checkoutVehiclePlate}
                      onChange={(e) => setCheckoutVehiclePlate(e.target.value)}
                      placeholder="e.g. AA 3-A12345"
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label
                    className="col-span-2 text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Meal Budget ({currency})
                    <input
                      type="number"
                      value={checkoutMealBudget || ""}
                      onChange={(e) => setCheckoutMealBudget(parseFloat(e.target.value) || 0)}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  {booking.payment !== "PAID" && (
                    <div className="col-span-2 rounded border border-destructive/50 bg-destructive/5 p-2.5">
                      <div className="text-[11px] font-semibold text-destructive">
                        Payment is {booking.payment === "ADVANCE" ? "advance only" : "unpaid"}. Full payment is required before checkout.
                      </div>
                      {can(PERMISSION.INVENTORY_FORCE_CHECKOUT) && (
                        <>
                          <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold">
                            <input
                              type="checkbox"
                              checked={forceUnpaidCheckout}
                              onChange={(event) => setForceUnpaidCheckout(event.target.checked)}
                            />
                            Force checkout as admin
                          </label>
                          {forceUnpaidCheckout && (
                            <textarea
                              value={forceUnpaidReason}
                              onChange={(event) => setForceUnpaidReason(event.target.value)}
                              placeholder="Reason for allowing an unpaid booking to proceed..."
                              className="mt-2 block h-16 w-full resize-none rounded border bg-[var(--surface-2)] p-2 text-[11px]"
                              style={{ borderColor: "var(--border)" }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className="rounded-md border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    Deployment Summary
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Screen Type</span>
                      <div className="font-semibold">{screenTypeLabel}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-3)" }}>Screen Size</span>
                      <div className="font-semibold font-mono">{screenSizeLabel}</div>
                    </div>
                  </div>
                  <div
                    className="mt-3 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    Bill of Materials
                  </div>
                  {booking.bomItems.length === 0 ? (
                    <p className="mt-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                      No BOM lines on this booking.
                    </p>
                  ) : (
                    <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                      {booking.bomItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-[11px]"
                          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                        >
                          <span className="font-mono font-bold shrink-0" style={{ color: "var(--accent)" }}>
                            {item.code}
                          </span>
                          <span className="flex-1 truncate">{item.name}</span>
                          <span className="font-mono font-semibold shrink-0">×{item.qty}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {isCheckinAction && (
              <div
                className="mt-3 rounded-md border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div
                  className="flex items-center justify-between border-b px-3 py-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" style={{ color: "var(--color-bom-returned)" }} />
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-3)" }}
                    >
                      Checked-Out Materials — Verify Returns
                    </span>
                  </div>
                  {checkinItems.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllCheckinItems}
                      className="text-[11px] font-semibold"
                      style={{ color: "var(--color-bom-returned)" }}
                    >
                      {checkedCheckinItems.size === checkinItems.filter((item) => !item.report?.missing).length
                        ? "Uncheck All"
                        : "Check All"}
                    </button>
                  )}
                </div>

                {checkinItems.length === 0 ? (
                  <p className="px-3 py-3 text-[11px]" style={{ color: "var(--text-3)" }}>
                    No inventory is currently outstanding for this booking.
                  </p>
                ) : (
                  <>
                    <ul className="max-h-48 divide-y overflow-y-auto" style={{ borderColor: "var(--border)" }}>
                      {checkinItems.map((item) => {
                        const checked = checkedCheckinItems.has(item.id);
                        const isMissing = !!item.report?.missing;
                        return (
                          <li key={item.id}>
                            <div
                              onClick={() => !isMissing && toggleCheckinItem(item.id)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]"
                              style={{ opacity: isMissing ? 0.48 : checked ? 1 : 0.75 }}
                              role="checkbox"
                              aria-checked={checked}
                              tabIndex={isMissing ? -1 : 0}
                            >
                              <div
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition"
                                style={{
                                  borderColor: checked
                                    ? "var(--color-bom-returned)"
                                    : "var(--border)",
                                  background: checked ? "var(--color-bom-returned)" : "transparent",
                                }}
                              >
                                {checked && <Check className="h-3 w-3" style={{ color: "#fff" }} />}
                              </div>
                              <span
                                className="shrink-0 font-mono text-[11px] font-bold"
                                style={{ color: "var(--accent)" }}
                              >
                                {item.code}
                              </span>
                              <span className={`min-w-0 flex-1 truncate text-[11px] ${isMissing ? "line-through" : ""}`}>{item.name}</span>
                              {isMissing ? (
                                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-destructive">MISSING</span>
                              ) : item.report?.damaged ? (
                                <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ color: "var(--color-pay-advance)", background: "color-mix(in oklab, var(--color-pay-advance) 14%, transparent)" }}>
                                  DAMAGED {item.report.damaged}
                                </span>
                              ) : null}
                              {item.poolId ? (
                                <input
                                  aria-label={`Return quantity for ${item.name}`}
                                  inputMode="decimal"
                                  value={
                                    returnQuantities[item.id] ??
                                    item.outstandingQuantity
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    setReturnQuantities((current) => ({
                                      ...current,
                                      [item.id]: event.target.value,
                                    }))
                                  }
                                  className="h-7 w-20 rounded border bg-[var(--surface-2)] px-2 text-right font-mono text-[11px]"
                                  style={{ borderColor: "var(--border)" }}
                                />
                              ) : (
                                <select
                                  aria-label={`Condition for ${item.name}`}
                                  value={returnConditions[item.id] ?? "AVAILABLE"}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    setReturnConditions((current) => ({
                                      ...current,
                                      [item.id]: event.target.value as InventoryCondition,
                                    }))
                                  }
                                  className="h-7 rounded border bg-[var(--surface-2)] px-2 text-[10px]"
                                  style={{ borderColor: "var(--border)" }}
                                >
                                  <option value="AVAILABLE">Available</option>
                                  <option value="DAMAGED">Damaged</option>
                                  <option value="LOST">Lost</option>
                                  <option value="UNDER_MAINTENANCE">Maintenance</option>
                                </select>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {checkinItems.some((item) => item.report?.missing) && can(PERMISSION.INVENTORY_FORCE_CHECKIN) && (
                      <div className="border-t px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
                        <label className="block text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>
                          Admin force check-in reason (minimum 10 characters)
                          <textarea
                            value={forceMissingReason}
                            onChange={(event) => setForceMissingReason(event.target.value)}
                            placeholder="Explain why the missing materials are being force checked in..."
                            className="mt-1 block h-16 w-full resize-none rounded border bg-[var(--surface-2)] p-2 text-[11px]"
                            style={{ borderColor: "var(--border)" }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setForceMissingMode((enabled) => !enabled)}
                          disabled={forceMissingReason.trim().length < 10}
                          className="mt-2 text-[11px] font-bold text-destructive disabled:opacity-50"
                        >
                          {forceMissingMode ? "Force check-in enabled" : "Enable force check-in for missing materials"}
                        </button>
                      </div>
                    )}
                    <div
                      className="flex items-center justify-between border-t px-3 py-2"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                        {checkedCheckinItems.size} of {checkinItems.length} assets selected
                      </span>
                      <div
                        className="h-1.5 w-28 overflow-hidden rounded-full"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${checkinItems.length > 0 ? (checkedCheckinItems.size / checkinItems.length) * 100 : 0}%`,
                            background: "var(--color-bom-returned)",
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedAction.requiresReason && (
              <div className="mt-3">
                <label
                  className="text-[11px] font-semibold block"
                  style={{ color: "var(--text-2)" }}
                >
                  Reason for action / override (minimum 10 characters)
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please write the operational reason..."
                    className="mt-1 w-full rounded-md border bg-[var(--surface-2)] p-2 text-[12px] h-20 block resize-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setShowActionModal(false);
            setSelectedAction(null);
          }}
          className="text-[12px] font-semibold"
          style={{ color: "var(--text-3)" }}
        >
          ✕
        </button>
      </div>
      <div
        className="mt-4 flex items-center gap-2 border-t pt-3"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          onClick={() => {
            if (selectedAction.id === "inventory.checkout") {
              if (!authUser?.id) {
                toast.error("You must be signed in to check out gear.");
                return;
              }
              performCheckout(
                forceUnpaidCheckout
                  ? { override: true, reason: forceUnpaidReason.trim() }
                  : undefined,
              );
            } else if (isCheckinAction) {
              try {
                performCheckin({
                  returns: buildCheckinReturns(
                    checkinItems.map((item) => ({
                      selected: checkedCheckinItems.has(item.id) || (forceMissingMode && item.report?.missing),
                      poolId: item.poolId,
                      itemId: item.itemId,
                      outstandingQuantity: item.outstandingQuantity,
                      quantity:
                        returnQuantities[item.id] ?? item.outstandingQuantity,
                      condition: returnConditions[item.id] ?? "AVAILABLE",
                    })),
                  ),
                  forceMissing: forceMissingMode,
                  forceReason: forceMissingReason.trim() || undefined,
                });
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Invalid check-in selection",
                );
              }
            } else if (isReverseAction) {
              reverseCheckout(cancellationReason.trim());
            } else if (isAssignTechnicianAction) {
              if (selectedTechnicianIds.length === 0) {
                toast.error("Please select at least one technician");
                return;
              }
              assignTechnicians(selectedTechnicianIds);
            } else if (showPaymentCapture) {
              if (screenSize <= 0) {
                toast.error("Screen size (sqm) is required before confirming.");
                return;
              }
              if (rentedDays <= 0) {
                toast.error("This booking has no number of days set — update the booking intake first.");
                return;
              }
              if (computedTotal < 1000 || dailyRate <= 0) {
                toast.error(`Daily rate is required (computed total min ${formatMoney(1000)}).`);
                return;
              }
              if (paymentType === "advance") {
                if (advancePayment <= 0) {
                  toast.error(`Advance payment must be greater than ${formatMoney(0)}`);
                  return;
                }
                if (advancePayment > computedTotal) {
                  toast.error("Advance payment cannot exceed the total payment amount");
                  return;
                }
                confirmBookingWithPayment({
                  toPaymentStatus: "advance",
                  amount: advancePayment,
                  totalAmount: computedTotal,
                  pricingDailyRate: dailyRate,
                  pricingRentedDays: rentedDays,
                  pricingScreenSize: screenSize,
                });
              } else {
                confirmBookingWithPayment({
                  toPaymentStatus: "fully_paid",
                  amount: computedTotal,
                  totalAmount: computedTotal,
                  pricingDailyRate: dailyRate,
                  pricingRentedDays: rentedDays,
                  pricingScreenSize: screenSize,
                });
              }
            } else if (selectedAction.id === "booking.force_done") {
              forceDone(cancellationReason.trim());
            } else {
              transitionStatus({
                toStatus: selectedAction.targetStatus,
                reason: cancellationReason || undefined,
                override: selectedAction.id === "booking.cancel_override",
              });
            }
          }}
          disabled={
            isTransitioning ||
            isForcingDone ||
            isRecordingPayment ||
            isConfirmingWithPayment ||
            isCheckingOut ||
            isCheckingIn ||
            isReversingCheckout ||
            isAssigningTechnicians ||
            (isCheckoutAction && booking.payment !== "PAID" &&
              (!forceUnpaidCheckout || forceUnpaidReason.trim().length < 10)) ||
            (selectedAction.requiresReason && cancellationReason.trim().length < 10) ||
            (isAssignTechnicianAction && selectedTechnicianIds.length === 0) ||
            (showPaymentCapture &&
              (screenSize <= 0 ||
                dailyRate <= 0 ||
                rentedDays <= 0 ||
                computedTotal < 1000 ||
                (paymentType === "advance" && advancePayment > computedTotal) ||
                (paymentType === "advance" && advancePayment <= 0))) ||
            (isCheckinAction && !hasCheckinItemsSelected)
          }
          className="rounded-md px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
          style={{
            background:
              selectedAction.variant === "destructive"
                ? "var(--destructive)"
                : "var(--accent)",
            color: selectedAction.variant === "destructive" ? "#fff" : "var(--accent-foreground)",
          }}
        >
          {isTransitioning ||
          isForcingDone ||
          isRecordingPayment ||
          isConfirmingWithPayment ||
          isCheckingOut ||
          isCheckingIn ||
          isReversingCheckout ||
          isAssigningTechnicians
            ? "Processing..."
            : `Confirm: ${selectedAction.label}`}
        </button>
        <button
          onClick={() => {
            setShowActionModal(false);
            setSelectedAction(null);
          }}
          className="rounded-md border px-4 py-2 text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
