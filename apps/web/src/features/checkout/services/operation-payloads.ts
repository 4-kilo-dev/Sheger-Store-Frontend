export type InventoryCondition =
  | "AVAILABLE"
  | "DAMAGED"
  | "LOST"
  | "UNDER_MAINTENANCE";

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

export function isCheckinAction(action?: {
  id?: string;
  permissionKey?: string;
} | null): boolean {
  return !!(
    action &&
    (action.id === "inventory.checkin" ||
      action.id === "booking.done" ||
      action.id === "booking.partial_return" ||
      action.permissionKey === "inventory.checkin")
  );
}

export function isCheckoutReverseAction(action?: {
  id?: string;
  permissionKey?: string;
} | null): boolean {
  return !!(
    action &&
    (action.id === "booking.checkout_reverse" ||
      action.permissionKey === "inventory.checkout_reverse")
  );
}

export class IdempotencyAttempt {
  private key: string | null = null;
  private payloadFingerprint: string | null = null;

  constructor(private readonly createKey: () => string = () => crypto.randomUUID()) {}

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
