import { useEffect, useState } from "react";
import { DollarSign, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import {
  getPaymentSummary,
  recordBookingPaymentApi,
  updateBookingApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { useSystemCurrency } from "@/hooks/use-system-currency";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";

type PaymentType = "advance" | "fully_paid";

export function PaymentsTab({ b, caps }: { b: Booking; caps: BookingCapabilities }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { formatDate } = useDateFormatter();
  const { currency, formatMoney } = useSystemCurrency();
  const canManagePayment = can(PERMISSION.PAYMENT_MANAGE) && !caps.isBookingUpdateLocked;

  const summary = getPaymentSummary(b);
  const paymentMethod = b.customFields?.paymentMethod || "Bank Transfer";
  const dateStr = b.createdAt || new Date().toISOString();

  const tx =
    b.payment === "PAID"
      ? [{ d: dateStr, n: "Full payment", a: summary.paid, m: paymentMethod }]
      : b.payment === "ADVANCE" && (b.advanceAmount ?? 0) > 0
        ? [{ d: dateStr, n: "Advance Deposit", a: b.advanceAmount ?? 0, m: paymentMethod }]
        : [];

  const fullyPaid = b.payment === "PAID";

  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<PaymentType>(b.payment === "ADVANCE" ? "fully_paid" : "advance");
  const [amount, setAmount] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Bank Transfer");

  const [dailyRate, setDailyRate] = useState(b.dailyRate ?? 0);
  const [rentedDays, setRentedDays] = useState(b.rentedDays ?? 0);

  useEffect(() => {
    setDailyRate(b.dailyRate ?? 0);
    setRentedDays(b.rentedDays ?? 0);
  }, [b.dailyRate, b.rentedDays]);

  const screenSize = b.size > 0 ? b.size : 0;
  const computedTotal =
    dailyRate > 0 && rentedDays > 0
      ? screenSize > 0
        ? screenSize * dailyRate * rentedDays
        : dailyRate * rentedDays
      : null;

  const alreadyPaid = summary.paid;
  const activeTotal = computedTotal ?? summary.total ?? 0;
  const remainingAmount =
    summary.remaining != null
      ? summary.remaining
      : activeTotal > 0
        ? Math.max(0, activeTotal - alreadyPaid)
        : null;

  const isExceedingRemaining =
    remainingAmount != null && remainingAmount > 0 && amount > remainingAmount;
  const isSettlingFully =
    remainingAmount != null && remainingAmount > 0
      ? amount >= remainingAmount
      : type === "fully_paid";

  const targetToStatus: "advance" | "fully_paid" = isSettlingFully ? "fully_paid" : "advance";
  const apiAmount = targetToStatus === "advance" ? alreadyPaid + amount : amount;

  const { mutate: recordPayment, isPending } = useMutation({
    mutationFn: () => recordBookingPaymentApi(b.id, targetToStatus, apiAmount),
    onSuccess: () => {
      toast.success(
        targetToStatus === "fully_paid"
          ? "Booking marked as Fully Paid."
          : "Advance payment updated.",
      );
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowModal(false);
      setAmount(0);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record payment.");
    },
  });

  const { mutate: savePricing, isPending: isSavingPricing } = useMutation({
    mutationFn: () =>
      updateBookingApi(b.id, {
        dailyRate: String(dailyRate),
        rentedDays,
      }),
    onSuccess: () => {
      toast.success("Pricing updated.");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update pricing.");
    },
  });

  const openModal = () => {
    setType(b.payment === "ADVANCE" ? "fully_paid" : "advance");
    setAmount(b.payment === "ADVANCE" && summary.remaining != null ? summary.remaining : 0);
    setShowModal(true);
  };

  const amountValid = amount >= 1000 && !isExceedingRemaining;
  const pricingValid = dailyRate > 0 && rentedDays > 0;

  return (
    <div className="grid grid-cols-12 gap-4">
      {canManagePayment && (
        <div className="col-span-12">
          <Section title="Pricing" icon={DollarSign}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Screen Size (sqm)
                <input
                  type="text"
                  readOnly
                  value={screenSize > 0 ? `${screenSize} sqm` : "—"}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px] opacity-80"
                  style={{ borderColor: "var(--border)" }}
                  title="Set at booking intake / technical holds"
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Number of Days
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={rentedDays || ""}
                  onChange={(e) => setRentedDays(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Daily Rate ({currency})
                <input
                  type="number"
                  min={0}
                  value={dailyRate || ""}
                  onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Computed Total ({currency})
                <input
                  type="text"
                  readOnly
                  value={computedTotal != null ? computedTotal.toLocaleString() : "—"}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px] opacity-80"
                  style={{ borderColor: "var(--border)" }}
                  title="Screen size × days × daily rate"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  if (!pricingValid) {
                    toast.error("Daily rate and number of days must be greater than zero.");
                    return;
                  }
                  savePricing();
                }}
                disabled={isSavingPricing || !pricingValid}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {isSavingPricing ? "Saving..." : "Save Pricing"}
              </button>
            </div>
          </Section>
        </div>
      )}

      <div className="col-span-8">
        <Section
          title="Transactions"
          icon={DollarSign}
          action={
            canManagePayment && !fullyPaid ? (
              <button
                onClick={openModal}
                className="text-[11px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                + Record Payment
              </button>
            ) : undefined
          }
        >
          {tx.length === 0 ? (
            <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              No payments recorded yet.
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="label-eyebrow pb-2 text-left">Date</th>
                  <th className="label-eyebrow pb-2 text-left">Note</th>
                  <th className="label-eyebrow pb-2 text-left">Method</th>
                  <th className="label-eyebrow pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="py-3 font-mono">{formatDate(t.d)}</td>
                    <td className="py-3">{t.n}</td>
                    <td className="py-3" style={{ color: "var(--text-2)" }}>
                      {t.m}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold">{formatMoney(t.a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
      <div className="col-span-4">
        <Section title="Summary" icon={DollarSign}>
          {b.dailyRate != null && b.dailyRate > 0 && (
            <KV label="Daily Rate" value={formatMoney(b.dailyRate)} mono />
          )}
          {b.rentedDays != null && b.rentedDays > 0 && (
            <KV label="Number of Days" value={String(b.rentedDays)} mono />
          )}
          <KV label="Paid" value={formatMoney(summary.paid)} mono />
          <KV
            label="Total"
            value={summary.total === null ? "—" : formatMoney(summary.total)}
            mono
          />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV
              label="Balance Due"
              value={summary.remaining === null ? "Pending" : formatMoney(summary.remaining)}
              mono
            />
          </div>
        </Section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div
              className="flex items-center justify-between border-b pb-3 mb-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="text-[15px] font-bold">Record Payment</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[12px] font-semibold hover:opacity-80"
                style={{ color: "var(--text-3)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label
                  className="text-[11px] font-semibold block"
                  style={{ color: "var(--text-2)" }}
                >
                  Payment Mode
                  <input
                    type="text"
                    readOnly
                    value={
                      targetToStatus === "fully_paid"
                        ? "Fully Paid (Final Settlement)"
                        : "Advance Payment (Partial)"
                    }
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[11px] opacity-80"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>

                <label
                  className="text-[11px] font-semibold block"
                  style={{ color: "var(--text-2)" }}
                >
                  Payment Method
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option>Bank Transfer</option>
                    <option>Cash</option>
                    <option>Mobile Money</option>
                  </select>
                </label>
              </div>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Payment Amount ({currency})
                <input
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder={remainingAmount != null ? `e.g. ${remainingAmount}` : "e.g. 50000"}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>

              <div className="text-[10px]" style={{ color: "var(--text-3)" }}>
                {amount > 0 ? (
                  targetToStatus === "fully_paid" ? (
                    <span>
                      Payment of <strong>{formatMoney(amount)}</strong> satisfies the remaining
                      balance and will mark the booking as <strong>Fully Paid</strong>.
                    </span>
                  ) : (
                    <span>
                      Partial payment of <strong>{formatMoney(amount)}</strong> will be added to
                      previous deposit ({formatMoney(alreadyPaid)}), updating total advance to{" "}
                      <strong>{formatMoney(alreadyPaid + amount)}</strong>. Remaining balance:{" "}
                      <strong>
                        {formatMoney(Math.max(0, (remainingAmount ?? activeTotal) - amount))}
                      </strong>
                      .
                    </span>
                  )
                ) : (
                  <span>
                    Enter the payment amount. Partial payments will keep the booking in Advance
                    status.
                  </span>
                )}
              </div>

              {isExceedingRemaining && (
                <div className="text-[11px] font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>
                    Payment amount ({formatMoney(amount)}) cannot exceed remaining balance due (
                    {formatMoney(remainingAmount ?? 0)}).
                  </span>
                </div>
              )}

              {!amountValid && amount > 0 && !isExceedingRemaining && (
                <div className="text-[11px] font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Minimum payment amount is {currency} 1,000.</span>
                </div>
              )}
            </div>

            <div
              className="mt-5 flex items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => {
                  if (isExceedingRemaining) {
                    toast.error(
                      `Amount cannot exceed remaining balance of ${formatMoney(remainingAmount ?? 0)}`,
                    );
                    return;
                  }
                  if (!amountValid) {
                    toast.error(`Minimum payment amount is ${currency} 1,000`);
                    return;
                  }
                  recordPayment();
                }}
                disabled={isPending || !amountValid}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {isPending
                  ? "Recording..."
                  : targetToStatus === "fully_paid"
                    ? "Record Final Payment"
                    : "Record Partial Payment"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="rounded border px-4 py-2 text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
