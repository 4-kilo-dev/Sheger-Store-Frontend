import { useEffect, useState } from "react";
import { AlertCircle, Check, Package } from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";
import {
  isAssignableTechnician,
  isChiefTechnicianRole,
} from "@/features/bookings/utils/staffRoles";
import { isDeclinedAssignment } from "@/features/bookings/utils/assignmentHelpers";
import { StaffMultiSelect } from "@/features/bookings/components/shared/StaffMultiSelect";
import { useAuthUser } from "@/hooks/use-auth-user";

interface BookingActionModalProps {
  booking: Booking;
  actions: ReturnType<typeof useBookingActions>;
}

export function BookingActionModal({ booking, actions }: BookingActionModalProps) {
  const authUser = useAuthUser();
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
    transitionStatus,
    isTransitioning,
    isRecordingPayment,
    confirmBookingWithPayment,
    isConfirmingWithPayment,
  } = actions;

  const isCheckinAction =
    !!selectedAction &&
    (selectedAction.id === "inventory.checkin" ||
      selectedAction.id === "booking.done" ||
      selectedAction.id === "booking.partial_return" ||
      selectedAction.permissionKey === "inventory.checkin");

  const [checkedCheckinItems, setCheckedCheckinItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!showActionModal || !isCheckinAction) {
      setCheckedCheckinItems(new Set());
    }
  }, [showActionModal, isCheckinAction, selectedAction?.id]);

  if (!showActionModal || !selectedAction) return null;

  const isAssignTechnicianAction =
    selectedAction.id === "assignment.assign_technician" ||
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
    if (checkedCheckinItems.size === booking.bomItems.length) {
      setCheckedCheckinItems(new Set());
    } else {
      setCheckedCheckinItems(new Set(booking.bomItems.map((item) => item.id)));
    }
  };

  const allCheckinItemsVerified =
    booking.bomItems.length === 0 ||
    checkedCheckinItems.size === booking.bomItems.length;

  const stagehandLeaderName = booking.teamLeader || "— Not assigned —";
  const screenTypeLabel = booking.screenType || "—";
  const screenSizeLabel = booking.size > 0 ? `${booking.size} sqm` : "—";
  const computedTotal = dailyRate > 0 && rentedDays > 0 ? dailyRate * rentedDays : 0;

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
                    Number of Days
                    <input
                      type="text"
                      readOnly
                      value={rentedDays > 0 ? String(rentedDays) : "—"}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px] opacity-80"
                      style={{ borderColor: "var(--border)" }}
                      title="Set at booking intake with event dates"
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Daily Rate (ETB)
                    <input
                      type="number"
                      value={dailyRate || ""}
                      onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 60000"
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Computed Total (ETB)
                    <input
                      type="text"
                      readOnly
                      value={computedTotal > 0 ? computedTotal.toLocaleString() : "—"}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px] opacity-80"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  {paymentType === "advance" && (
                    <label
                      className="text-[11px] font-semibold"
                      style={{ color: "var(--text-2)" }}
                    >
                      Advance Payment (ETB)
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
                        <strong>ETB {advancePayment.toLocaleString()}</strong> (
                        {((advancePayment / computedTotal) * 100).toFixed(0)}
                        %) as paid, leaving a balance of{" "}
                        <strong>ETB {(computedTotal - advancePayment).toLocaleString()} remaining.</strong>
                      </span>
                    ) : (
                      <span>Enter the daily rate (after materials are confirmed) and advance amount to preview the payment split.</span>
                    )
                  ) : computedTotal >= 1000 ? (
                    <span>
                      Full payment will record the entire{" "}
                      <strong>ETB {computedTotal.toLocaleString()}</strong> as paid, leaving no balance.
                    </span>
                  ) : (
                    <span>Enter the daily rate to compute the contract total (days × rate).</span>
                  )}
                </div>
              )}
            {showPaymentCapture &&
              rentedDays <= 0 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>This booking has no number of days set — update the booking schedule first.</span>
                </div>
              )}
            {showPaymentCapture &&
              rentedDays > 0 &&
              (computedTotal < 1000 || dailyRate <= 0) && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Daily rate is required (computed total min ETB 1,000).</span>
                </div>
              )}
            {showPaymentCapture &&
              paymentType === "advance" &&
              advancePayment > computedTotal && computedTotal >= 1000 && (
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
                  <span>Advance Payment must be greater than ETB 0.</span>
                </div>
              )}
            {isAssignTechnicianAction && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px]" style={{ color: "var(--text-2)" }}>
                  Select one or more technicians. Chief technicians are included in this list.
                </p>
                <StaffMultiSelect
                  options={assignableStaff.map((s) => ({
                    id: s.id,
                    label: `${s.name}${isChiefTechnicianRole(s.role) ? " (Chief Technician)" : ""}${
                      alreadyAssignedTechIds.has(s.id) ? " — already assigned" : ""
                    }`,
                    disabled: alreadyAssignedTechIds.has(s.id),
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
                    Meal Budget (ETB)
                    <input
                      type="number"
                      value={checkoutMealBudget || ""}
                      onChange={(e) => setCheckoutMealBudget(parseFloat(e.target.value) || 0)}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
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
                  {booking.bomItems.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllCheckinItems}
                      className="text-[11px] font-semibold"
                      style={{ color: "var(--color-bom-returned)" }}
                    >
                      {checkedCheckinItems.size === booking.bomItems.length
                        ? "Uncheck All"
                        : "Check All"}
                    </button>
                  )}
                </div>

                {booking.bomItems.length === 0 ? (
                  <p className="px-3 py-3 text-[11px]" style={{ color: "var(--text-3)" }}>
                    No BOM lines on this booking.
                  </p>
                ) : (
                  <>
                    <ul className="max-h-48 divide-y overflow-y-auto" style={{ borderColor: "var(--border)" }}>
                      {booking.bomItems.map((item) => {
                        const checked = checkedCheckinItems.has(item.id);
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => toggleCheckinItem(item.id)}
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]"
                              style={{ opacity: checked ? 1 : 0.75 }}
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
                              <span className="min-w-0 flex-1 truncate text-[11px]">{item.name}</span>
                              <span className="shrink-0 font-mono text-[11px] font-semibold">
                                ×{item.qty}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div
                      className="flex items-center justify-between border-t px-3 py-2"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                        {checkedCheckinItems.size} of {booking.bomItems.length} items verified
                      </span>
                      <div
                        className="h-1.5 w-28 overflow-hidden rounded-full"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${booking.bomItems.length > 0 ? (checkedCheckinItems.size / booking.bomItems.length) * 100 : 0}%`,
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
              performCheckout();
            } else if (isAssignTechnicianAction) {
              if (selectedTechnicianIds.length === 0) {
                toast.error("Please select at least one technician");
                return;
              }
              assignTechnicians(selectedTechnicianIds);
            } else if (showPaymentCapture) {
              if (rentedDays <= 0) {
                toast.error("This booking has no number of days set — update the booking schedule first.");
                return;
              }
              if (computedTotal < 1000 || dailyRate <= 0) {
                toast.error("Daily rate is required (computed total min ETB 1,000).");
                return;
              }
              if (paymentType === "advance") {
                if (advancePayment <= 0) {
                  toast.error("Advance payment must be greater than ETB 0");
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
                });
              } else {
                confirmBookingWithPayment({
                  toPaymentStatus: "fully_paid",
                  amount: computedTotal,
                  totalAmount: computedTotal,
                  pricingDailyRate: dailyRate,
                  pricingRentedDays: rentedDays,
                });
              }
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
            isRecordingPayment ||
            isConfirmingWithPayment ||
            isCheckingOut ||
            isAssigningTechnicians ||
            (selectedAction.requiresReason && cancellationReason.trim().length < 10) ||
            (isAssignTechnicianAction && selectedTechnicianIds.length === 0) ||
            (showPaymentCapture &&
              (computedTotal < 1000 ||
                dailyRate <= 0 ||
                rentedDays <= 0 ||
                (paymentType === "advance" && advancePayment > computedTotal) ||
                (paymentType === "advance" && advancePayment <= 0))) ||
            (isCheckinAction && !allCheckinItemsVerified)
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
          isRecordingPayment ||
          isConfirmingWithPayment ||
          isCheckingOut ||
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
