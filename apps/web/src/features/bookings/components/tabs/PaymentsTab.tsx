import { DollarSign } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { Booking } from "@/features/bookings/services/bookings.api";

export function PaymentsTab({ b }: { b: Booking }) {
  const tx =
    b.payment === "PAID"
      ? [{ d: "2026-05-12", n: "Full payment", a: b.amount, m: "Bank Transfer" }]
      : b.payment === "ADVANCE"
        ? [{ d: "2026-05-12", n: "Advance 50%", a: b.amount / 2, m: "Bank Transfer" }]
        : [];

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-8">
        <Section
          title="Transactions"
          icon={DollarSign}
          action={
            <button className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
              + Record Payment
            </button>
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
          <KV label="Contract" value={`ETB ${b.amount.toLocaleString()}`} mono />
          <KV label="Paid" value={`ETB ${tx.reduce((s, t) => s + t.a, 0).toLocaleString()}`} mono />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV
              label="Balance Due"
              value={`ETB ${(b.amount - tx.reduce((s, t) => s + t.a, 0)).toLocaleString()}`}
              mono
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
