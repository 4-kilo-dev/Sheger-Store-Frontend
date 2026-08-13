import type { BomItem, Booking } from "@/types/domain";
import { STATUS_LABELS } from "@/types/domain";

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PackingSlipInput = {
  code: string;
  client: string;
  venue: string;
  assemblyDate?: string;
  eventDate?: string;
  dismantleDate?: string;
  screenType?: string;
  size?: number | string;
  arrangement?: string;
  status?: string;
  assignees?: string[];
  stageHand?: string;
  bomItems: Array<
    | Pick<BomItem, "code" | "name" | "qty" | "status">
    | { code?: string; name: string; qty: number; status?: string }
  >;
};

export function bookingToPackingSlip(b: Booking): PackingSlipInput {
  return {
    code: b.code,
    client: b.client,
    venue: b.venue,
    assemblyDate: b.assemblyDate,
    eventDate: b.eventDate,
    dismantleDate: b.dismantleDate,
    screenType: b.screenType || undefined,
    size: b.size,
    arrangement: b.arrangement || undefined,
    status: STATUS_LABELS[b.status] || b.status,
    assignees: b.assignees,
    stageHand: b.stageHand,
    bomItems: b.bomItems,
  };
}

/** Build the same packing-slip HTML as web `printPackingSlip` (for Share on mobile). */
export function buildPackingSlipHtml(
  booking: PackingSlipInput,
  options?: { formatDate?: (value?: string | null) => string },
): string {
  if (!booking.bomItems.length) {
    throw new Error("Add at least one BOM item before printing a packing slip");
  }

  const fmt =
    options?.formatDate ??
    ((v?: string | null) => (v ? String(v).slice(0, 16).replace("T", " ") : "—"));
  const totalUnits = booking.bomItems.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const printedAt = new Date().toLocaleString();

  const rows = booking.bomItems
    .map(
      (item, idx) => `
      <tr>
        <td>${escapeHtml(item.code || String(idx + 1).padStart(3, "0"))}</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="qty">${escapeHtml(item.qty)}</td>
        <td>${escapeHtml(item.status || "Reserved")}</td>
        <td class="check">&nbsp;</td>
      </tr>`,
    )
    .join("");

  const screenLine =
    [booking.screenType, booking.size ? `${booking.size} sqm` : "", booking.arrangement]
      .filter(Boolean)
      .join(" · ") || "—";
  const crewLine =
    [...(booking.assignees || []), booking.stageHand ? `Stage: ${booking.stageHand}` : ""]
      .filter(Boolean)
      .join(", ") || "—";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Packing Slip · ${escapeHtml(booking.code)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "IBM Plex Sans", "Segoe UI", Helvetica, Arial, sans-serif;
      color: #111;
      margin: 0;
      padding: 24px;
      font-size: 12px;
    }
    h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.02em; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; color: #666; font-weight: 700; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 16px 0 20px; }
    .meta div span { display: block; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
    .meta div strong { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #555; }
    td.qty { font-variant-numeric: tabular-nums; font-weight: 700; }
    td.check { width: 48px; border: 1px solid #ccc; height: 28px; }
    tfoot td { border: none; padding-top: 14px; font-weight: 600; }
    .footer { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .sign { border-top: 1px solid #111; padding-top: 6px; margin-top: 36px; color: #555; font-size: 11px; }
  </style>
</head>
<body>
  <div class="eyebrow">Vortex Visual · Packing Slip</div>
  <h1>${escapeHtml(booking.code)}</h1>
  <div style="color:#555;margin-bottom:4px">${escapeHtml(booking.client)} · ${escapeHtml(booking.venue)}</div>

  <div class="meta">
    <div><span>Assembly</span><strong>${escapeHtml(fmt(booking.assemblyDate))}</strong></div>
    <div><span>Event</span><strong>${escapeHtml(fmt(booking.eventDate))}</strong></div>
    <div><span>Dismantle</span><strong>${escapeHtml(fmt(booking.dismantleDate))}</strong></div>
    <div><span>Status</span><strong>${escapeHtml(booking.status || "—")}</strong></div>
    <div><span>Screen</span><strong>${escapeHtml(screenLine)}</strong></div>
    <div><span>Crew</span><strong>${escapeHtml(crewLine)}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Line</th>
        <th>Item</th>
        <th>Qty</th>
        <th>Status</th>
        <th>Packed</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">${booking.bomItems.length} lines</td>
        <td class="qty">${escapeHtml(totalUnits)}</td>
        <td colspan="2">total units</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <div class="sign">Warehouse / Packer signature</div>
    <div class="sign">Driver / Receiver signature</div>
  </div>
  <p style="margin-top:20px;color:#888;font-size:10px">Printed ${escapeHtml(printedAt)}</p>
</body>
</html>`;
}

/** Plain-text packing slip for Share when HTML is less useful. */
export function buildPackingSlipText(booking: PackingSlipInput): string {
  if (!booking.bomItems.length) {
    throw new Error("Add at least one BOM item before printing a packing slip");
  }
  const lines = [
    `Packing Slip · ${booking.code}`,
    `${booking.client} · ${booking.venue}`,
    `Assembly: ${booking.assemblyDate || "—"}`,
    `Event: ${booking.eventDate || "—"}`,
    `Dismantle: ${booking.dismantleDate || "—"}`,
    `Status: ${booking.status || "—"}`,
    `Screen: ${[booking.screenType, booking.size ? `${booking.size} sqm` : "", booking.arrangement].filter(Boolean).join(" · ") || "—"}`,
    `Crew: ${[...(booking.assignees || []), booking.stageHand ? `Stage: ${booking.stageHand}` : ""].filter(Boolean).join(", ") || "—"}`,
    "",
    "BOM:",
    ...booking.bomItems.map(
      (item, idx) =>
        `${item.code || String(idx + 1).padStart(3, "0")}  ${item.name}  ×${item.qty}  ${item.status || "Reserved"}`,
    ),
  ];
  return lines.join("\n");
}
