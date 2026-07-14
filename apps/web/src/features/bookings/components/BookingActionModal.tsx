import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthUser } from "@/hooks/use-auth-user";
import { PERMISSION } from "@/lib/auth/permission-keys";

interface BookingActionModalProps {
  booking: Booking;
  actions: ReturnType<typeof useBookingActions>;
}

export function BookingActionModal({ booking, actions }: BookingActionModalProps) {
  const { can } = usePermissions();
  const authUser = useAuthUser();
  const canManagePayment = can(PERMISSION.PAYMENT_MANAGE);
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
    fullPayment,
    setfullPayment,
    checkoutTeamLeader,
    setCheckoutTeamLeader,
    checkoutDriver,
    setCheckoutDriver,
    checkoutVehiclePlate,
    setCheckoutVehiclePlate,
    checkoutMealBudget,
    setCheckoutMealBudget,
    staff,
    performCheckout,
    isCheckingOut,
    transitionStatus,
    isTransitioning,
    isRecordingPayment,
    confirmBookingWithPayment,
    isConfirmingWithPayment,
  } = actions;

  if (!showActionModal || !selectedAction) return null;

  // Payment capture is a finance action — only surfaced to payment.manage holders.
  const showPaymentCapture =
    booking.status === "RESERVED" &&
    selectedAction.id === "booking.confirm" &&
    booking.payment === "UNPAID" &&
    canManagePayment;

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
                <div className="mt-3 grid grid-cols-4 gap-3">
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
                    Advance Payment (ETB)
                    <input
                      type="number"
                      value={advancePayment || 0}
                      onChange={(e) => setAdvancePayment(parseFloat(e.target.value))}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Total Contract Value (ETB)
                    <input
                      type="number"
                      value={fullPayment || ""}
                      onChange={(e) => setfullPayment(parseFloat(e.target.value) || 0)}
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 font-mono text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                </div>
              )}
              
            {showPaymentCapture && (
                <div className="mt-2 text-[10px]" style={{ color: "var(--text-3)" }}>
                  {paymentType === "advance" ? (
                    <span>
                      Advance payment will record{" "}
                      <strong>ETB {advancePayment}</strong> (
                      {fullPayment > 0
                        ? ((advancePayment / fullPayment) * 100).toFixed(0)
                        : 0}
                      %) as paid, leaving a balance of{" "}
                      <strong>ETB {fullPayment - advancePayment} remaining.</strong>
                    </span>
                  ) : (
                    <span>
                      Full payment will record the entire <strong>ETB {fullPayment}</strong>{" "}
                      as paid, leaving no balance.
                    </span>
                  )}
                </div>
              )}
            {showPaymentCapture &&
              fullPayment < 1000 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Minimum payment amount is ETB 1,000.</span>
                </div>
              )}
            {showPaymentCapture &&
              paymentType === "advance" &&
              advancePayment > fullPayment && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Advance Payment can't be greater than total payment.</span>
                </div>
              )}
            {showPaymentCapture &&
              paymentType === "advance" &&
              advancePayment <= 0 && (
                <div className="mt-2 text-[11px] font-semibold text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Advance Payment must be greater than ETB 0.</span>
                </div>
              )}
            {booking.status === "CONFIRMED" &&
              selectedAction.id === "assignment.assign_technician" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Assign Chief Technician
                    <select
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="">— Select —</option>
                      {staff
                        .filter(
                          (s) =>
                            s.role.toLowerCase().includes("chief") ||
                            s.role.toLowerCase() === "cto"
                        )
                        .map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--text-2)" }}
                  >
                    Assign Technician
                    <select
                      className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <option value="">— Select —</option>
                      {staff
                        .filter(
                          (s) =>
                            s.role.toLowerCase() === "technician" ||
                            s.role.toLowerCase() === "to"
                        )
                        .map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              )}

            {booking.status === "PREPARATION" && selectedAction.id === "inventory.checkout" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--text-2)" }}
                >
                  Team Leader
                  <input
                    value={checkoutTeamLeader}
                    onChange={(e) => setCheckoutTeamLeader(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
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
                  className="text-[11px] font-semibold"
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
                <div
                  className="text-[11px] font-semibold col-span-2"
                  style={{ color: "var(--text-2)" }}
                >
                  Checkout Signature
                  <div
                    className="mt-1 h-9 w-full rounded-md border bg-[var(--surface-2)] px-2.5 text-[12px] flex items-center font-medium"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {authUser?.name || "Not signed in"}
                  </div>
                  <span className="mt-1 block text-[10px] font-normal" style={{ color: "var(--text-3)" }}>
                    Signed off automatically as the logged-in user.
                  </span>
                </div>
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
              if (!authUser?.name) {
                toast.error("You must be signed in to sign off checkout.");
                return;
              }
              performCheckout();
            } else if (showPaymentCapture) {
              if (fullPayment < 1000) {
                toast.error("Minimum payment amount is ETB 1,000");
                return;
              }
              if (paymentType === "advance") {
                if (advancePayment <= 0) {
                  toast.error("Advance payment must be greater than ETB 0");
                  return;
                }
                if (advancePayment > fullPayment) {
                  toast.error("Advance payment cannot exceed the total payment amount");
                  return;
                }
                confirmBookingWithPayment({
                  toPaymentStatus: "advance",
                  amount: advancePayment,
                  totalAmount: fullPayment,
                });
              } else {
                confirmBookingWithPayment({
                  toPaymentStatus: "fully_paid",
                  amount: fullPayment,
                  totalAmount: fullPayment,
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
            (selectedAction.requiresReason && cancellationReason.trim().length < 10) ||
            (showPaymentCapture &&
              (fullPayment < 1000 ||
                (paymentType === "advance" && advancePayment > fullPayment) ||
                (paymentType === "advance" && advancePayment <= 0)))
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
          {isTransitioning || isRecordingPayment || isConfirmingWithPayment || isCheckingOut
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
