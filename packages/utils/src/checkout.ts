/**
 * Custody-aware check-out / check-in rules shared by web and mobile.
 *
 * The backend tracks custody per asset (pool quantities or serialized items)
 * rather than per BOM line, so both clients must agree on:
 *  - which bookings may be checked out / checked in,
 *  - how a selection is turned into a request payload,
 *  - how retries avoid double-issuing stock.
 */

export type InventoryCondition = "AVAILABLE" | "DAMAGED" | "LOST" | "UNDER_MAINTENANCE";

export const INVENTORY_CONDITIONS: readonly InventoryCondition[] = [
  "AVAILABLE",
  "DAMAGED",
  "LOST",
  "UNDER_MAINTENANCE",
];

export type CheckoutAsset = {
  poolId?: string | null;
  itemId?: string | null;
  quantity?: string;
};

export type CheckinSelection = {
  selected: boolean;
  poolId?: string | null;
  itemId?: string | null;
  outstandingQuantity: string;
  quantity?: string;
  condition?: InventoryCondition;
};

/**
 * Collapse a UI selection into the asset list the backend expects: one entry
 * per pool (quantities summed) and one per serialized item, deterministically
 * ordered so an unchanged selection always produces an identical payload —
 * which is what makes the idempotency fingerprint below stable.
 */
export function normalizeCheckoutAssets(assets: CheckoutAsset[]): CheckoutAsset[] {
  const pools = new Map<string, number>();
  const items = new Set<string>();

  for (const asset of assets) {
    const hasPool = !!asset.poolId;
    const hasItem = !!asset.itemId;
    if (hasPool === hasItem) {
      throw new Error("Each asset must specify exactly one of poolId or itemId.");
    }
    if (asset.poolId) {
      const quantity = Number.parseFloat(asset.quantity ?? "");
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Pool quantity must be greater than zero.");
      }
      pools.set(asset.poolId, (pools.get(asset.poolId) ?? 0) + quantity);
    } else {
      items.add(asset.itemId!);
    }
  }

  return [
    ...[...pools.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([poolId, quantity]) => ({ poolId, quantity: quantity.toFixed(2) })),
    ...[...items].sort().map((itemId) => ({ itemId })),
  ];
}

/**
 * Build the `returns` payload. Pool returns are capped at outstanding custody
 * so a partial return can never over-credit stock; serialized items carry a
 * condition instead of a quantity.
 */
export function buildCheckinReturns(selections: CheckinSelection[]) {
  return selections
    .filter((selection) => selection.selected)
    .map((selection) => {
      const hasPool = !!selection.poolId;
      const hasItem = !!selection.itemId;
      if (hasPool === hasItem) {
        throw new Error("Each return must specify exactly one of poolId or itemId.");
      }

      if (selection.poolId) {
        const quantity = Number.parseFloat(selection.quantity ?? "");
        const outstanding = Number.parseFloat(selection.outstandingQuantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new Error("Return quantity must be greater than zero.");
        }
        if (!Number.isFinite(outstanding) || quantity > outstanding) {
          throw new Error("Return quantity exceeds outstanding custody.");
        }
        return {
          poolId: selection.poolId,
          quantityReturned: quantity.toFixed(2),
        };
      }

      if (!selection.condition) {
        throw new Error("A condition is required for serialized item returns.");
      }
      return {
        itemId: selection.itemId!,
        condition: selection.condition,
      };
    });
}

export function isCheckinAction(
  action?: { id?: string; permissionKey?: string } | null,
): boolean {
  return !!(
    action &&
    (action.id === "inventory.checkin" ||
      action.id === "booking.done" ||
      action.id === "booking.partial_return" ||
      action.permissionKey === "inventory.checkin")
  );
}

export function isCheckoutReverseAction(
  action?: { id?: string; permissionKey?: string } | null,
): boolean {
  return !!(
    action &&
    (action.id === "booking.checkout_reverse" ||
      action.permissionKey === "inventory.checkout_reverse")
  );
}

function defaultKeyFactory(): string {
  const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof globalCrypto?.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  // React Native's Hermes runtime has no crypto.randomUUID; any value that is
  // unique per attempt and stable across retries satisfies the header.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Holds one Idempotency-Key per distinct payload. Retrying the *same* checkout
 * reuses the key so the backend collapses the duplicate; changing the selection
 * mints a new key so the second, different checkout is genuinely applied.
 */
export class IdempotencyAttempt {
  private key: string | null = null;
  private payloadFingerprint: string | null = null;

  constructor(private readonly createKey: () => string = defaultKeyFactory) {}

  keyFor(payload: unknown): string {
    const fingerprint = JSON.stringify(payload);
    if (!this.key || this.payloadFingerprint !== fingerprint) {
      this.key = this.createKey();
      this.payloadFingerprint = fingerprint;
    }
    return this.key;
  }

  complete(): void {
    this.reset();
  }

  failDefinitively(): void {
    this.reset();
  }

  private reset(): void {
    this.key = null;
    this.payloadFingerprint = null;
  }
}

/* ------------------------------------------------------------------ *
 * Booking eligibility
 * ------------------------------------------------------------------ */

/** Backend checkout only allows PREPARATION (→ ONSITE) or additional ONSITE out. */
export const CHECKOUT_STATUSES: ReadonlySet<string> = new Set(["PREPARATION", "ONSITE"]);

/** Gear is out / partially returned — eligible for warehouse check-in. */
export const CHECKIN_STATUSES: ReadonlySet<string> = new Set([
  "ONSITE",
  "COMPLETED",
  "PARTIALLY_RETURNED",
]);

export type EligibilityBooking = {
  status: string;
  assemblyDate?: string | null;
  eventDate?: string | null;
  dismantleDate?: string | null;
};

export type CalendarSystem = "gregorian" | "ethiopic";

export function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calendarYearMonth(
  date: Date,
  calendarSystem: CalendarSystem,
): { year: number; month: number } {
  const locale = calendarSystem === "ethiopic" ? "en-US-u-ca-ethiopic-nu-latn" : "en-US";
  const parts = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

export function compareYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

/** Check-out list: today→end of current calendar month (excludes past + next month). */
export function isUpcomingThisMonth(
  booking: EligibilityBooking,
  calendarSystem: CalendarSystem,
  now = new Date(),
): boolean {
  const day = parseDay(booking.assemblyDate) || parseDay(booking.eventDate);
  if (!day) return false;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day < today) return false;

  const nowYm = calendarYearMonth(now, calendarSystem);
  const bookingYm = calendarYearMonth(day, calendarSystem);
  return nowYm.year === bookingYm.year && nowYm.month === bookingYm.month;
}

/**
 * Check-in list: materials due back this month or overdue (past months),
 * excluding jobs that only start next month+.
 */
export function isDueForCheckinThisMonth(
  booking: EligibilityBooking,
  calendarSystem: CalendarSystem,
  now = new Date(),
): boolean {
  const day =
    parseDay(booking.dismantleDate) ||
    parseDay(booking.eventDate) ||
    parseDay(booking.assemblyDate);
  if (!day) return false;

  const nowYm = calendarYearMonth(now, calendarSystem);
  const bookingYm = calendarYearMonth(day, calendarSystem);
  return compareYearMonth(bookingYm, nowYm) <= 0;
}

export function isEventPassedOrComplete(
  booking: EligibilityBooking,
  now = new Date(),
): boolean {
  if (booking.status === "COMPLETED" || booking.status === "PARTIALLY_RETURNED") {
    return true;
  }
  const day =
    parseDay(booking.eventDate) ||
    parseDay(booking.dismantleDate) ||
    parseDay(booking.assemblyDate);
  if (!day) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return day <= today;
}

/* ------------------------------------------------------------------ *
 * Operation line building
 * ------------------------------------------------------------------ */

export type CustodyLine = {
  poolId: string | null;
  itemId: string | null;
  snapshotQuantity: string;
  outQuantity: string;
  inQuantity: string;
  outstandingQuantity: string;
  availableToCheckoutQuantity: string;
};

export type OperationSourceItem = {
  id: string;
  code?: string;
  name: string;
  qty: number;
  poolId?: string | null;
  itemId?: string | null;
};

export type OperationItem = {
  id: string;
  code: string;
  name: string;
  qty: number;
  poolId?: string;
  itemId?: string;
  outstandingQuantity: string;
};

export function assetKey(line: { poolId?: string | null; itemId?: string | null }): string {
  return line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`;
}

/**
 * Decide what the operator may actually act on.
 *
 * Once gear is ONSITE the BOM is no longer the truth — custody is: a top-up
 * checkout may only take what is still available, and a check-in may only
 * return what is still outstanding. Before that, the BOM drives the list, with
 * duplicate pool lines aggregated into a single row.
 */
export function buildOperationItems({
  mode,
  bookingStatus,
  bomItems,
  custody,
}: {
  mode: "checkout" | "checkin";
  bookingStatus: string;
  bomItems: OperationSourceItem[];
  custody: CustodyLine[];
}): OperationItem[] {
  const bomByAsset = new Map<string, OperationSourceItem>();
  for (const item of bomItems) {
    const key = assetKey(item);
    if (!bomByAsset.has(key)) bomByAsset.set(key, item);
  }

  if (mode === "checkin" || bookingStatus === "ONSITE") {
    return custody
      .map((line) => {
        const key = assetKey(line);
        const source = bomByAsset.get(key);
        const quantity = Number.parseFloat(
          mode === "checkin" ? line.outstandingQuantity : line.availableToCheckoutQuantity,
        );
        return {
          id: key,
          code: source?.code || key,
          name: source?.name || "Equipment",
          qty: Number.isFinite(quantity) ? quantity : 0,
          poolId: line.poolId || undefined,
          itemId: line.itemId || undefined,
          outstandingQuantity: line.outstandingQuantity,
        };
      })
      .filter((item) => item.qty > 0);
  }

  const aggregated = new Map<string, OperationItem>();
  for (const item of bomItems) {
    const key = assetKey(item);
    const existing = aggregated.get(key);
    if (existing && existing.poolId) {
      existing.qty += item.qty;
      existing.outstandingQuantity = String(existing.qty);
    } else if (!existing) {
      aggregated.set(key, {
        id: key,
        code: item.code || key,
        name: item.name,
        qty: item.qty,
        poolId: item.poolId || undefined,
        itemId: item.itemId || undefined,
        outstandingQuantity: String(item.qty),
      });
    }
  }
  return [...aggregated.values()];
}
