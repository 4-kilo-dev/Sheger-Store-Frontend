import { useState } from "react";
import { DollarSign, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import {
  getPaymentSummary,
  recordBookingPaymentApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";

type PaymentType = "advance" | "fully_paid";

export function PaymentsTab({ b }: { b: Booking }) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManagePayment = can(PERMISSION.PAYMENT_MANAGE);

  const summary = getPaymentSummary(b);
  const paymentMethod = b.customFields?.paymentMethod || "Bank Transfer";
  const dateStr = b.createdAt || new Date().toISOString().slice(0, 10);

  const tx =
    b.payment === "PAID"
      ? [{ d: dateStr, n: "Full payment", a: summary.paid, m: paymentMethod }]
      : b.payment === "ADVANCE"
        ? [{ d: dateStr, n: "Advance Deposit", a: summary.paid, m: paymentMethod }]
        : [];

  const fullyPaid = b.payment === "PAID";

  const [showModal, setShowModal] = useState(false);
  // From UNPAID either advance or full is allowed; from ADVANCE only full remains.
  const [type, setType] = useState<PaymentType>(
    b.payment === "ADVANCE" ? "fully_paid" : "advance"
  );
  const [amount, setAmount] = useState<number>(0);

  const { mutate: recordPayment, isPending } = useMutation({
    mutationFn: () => recordBookingPaymentApi(b.id, type, amount),
    onSuccess: () => {
      toast.success("Payment recorded.");
      queryClient.invalidateQueries({ queryKey: ["booking", b.code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowModal(false);
      setAmount(0);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to record payment.");
    },
  });

  const openModal = () => {
    setType(b.payment === "ADVANCE" ? "fully_paid" : "advance");
    setAmount(0);
    setShowModal(true);
  };

  const amountValid = amount >= 1000;

  return (
    <div className="grid grid-cols-12 gap-4">
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
                    <td className="py-3 font-mono">{t.d}</td>
                    <td className="py-3">{t.n}</td>
                    <td className="py-3" style={{ color: "var(--text-2)" }}>
                      {t.m}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold">
                      ETB {t.a.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
      <div className="col-span-4">
        <Section title="Summary" icon={DollarSign}>
          <KV label="Paid" value={`ETB ${summary.paid.toLocaleString()}`} mono />
          <KV
            label="Total"
            value={summary.total === null ? "—" : `ETB ${summary.total.toLocaleString()}`}
            mono
          />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV
              label="Balance Due"
              value={summary.remaining === null ? "Pending" : `ETB ${summary.remaining.toLocaleString()}`}
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
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
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
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Payment Type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PaymentType)}
                  disabled={b.payment === "ADVANCE"}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] disabled:opacity-60"
                  style={{ borderColor: "var(--border)" }}
                >
                  {b.payment !== "ADVANCE" && <option value="advance">Advance Deposit</option>}
                  <option value="fully_paid">Fully Paid</option>
                </select>
                {b.payment === "ADVANCE" && (
                  <span className="mt-1 block text-[10px]" style={{ color: "var(--text-3)" }}>
                    An advance is already recorded; the remaining balance settles the booking in full.
                  </span>
                )}
              </label>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Amount (ETB)
                <input
                  type="number"
                  value={amount || ""}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>

              {!amountValid && (
                <div className="text-[11px] font-semibold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Minimum payment amount is ETB 1,000.</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => {
                  if (!amountValid) {
                    toast.error("Minimum payment amount is ETB 1,000");
                    return;
                  }
                  recordPayment();
                }}
                disabled={isPending || !amountValid}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {isPending ? "Recording..." : "Record Payment"}
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
