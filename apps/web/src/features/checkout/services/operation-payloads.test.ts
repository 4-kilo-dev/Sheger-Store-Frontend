import { describe, expect, it } from "vitest";
import {
  IdempotencyAttempt,
  buildCheckinReturns,
  isCheckinAction,
  isCheckoutReverseAction,
  normalizeCheckoutAssets,
} from "./operation-payloads";

describe("normalizeCheckoutAssets", () => {
  it("aggregates duplicate pool rows and de-duplicates serialized items", () => {
    expect(
      normalizeCheckoutAssets([
        { poolId: "pool-1", quantity: "2.25" },
        { itemId: "item-1" },
        { poolId: "pool-1", quantity: "1.75" },
        { itemId: "item-1" },
      ]),
    ).toEqual([
      { poolId: "pool-1", quantity: "4.00" },
      { itemId: "item-1" },
    ]);
  });

  it("rejects malformed or non-positive pool quantities", () => {
    expect(() =>
      normalizeCheckoutAssets([{ poolId: "pool-1", quantity: "0" }]),
    ).toThrow("greater than zero");
    expect(() =>
      normalizeCheckoutAssets([{ poolId: "pool-1", itemId: "item-1", quantity: "1" }]),
    ).toThrow("exactly one");
  });
});

describe("buildCheckinReturns", () => {
  it("builds only selected outstanding returns and preserves partial pool quantities", () => {
    expect(
      buildCheckinReturns([
        {
          selected: true,
          poolId: "pool-1",
          outstandingQuantity: "3.00",
          quantity: "1.25",
        },
        {
          selected: false,
          poolId: "pool-2",
          outstandingQuantity: "4.00",
          quantity: "4.00",
        },
        {
          selected: true,
          itemId: "item-1",
          outstandingQuantity: "1.00",
          condition: "DAMAGED",
        },
      ]),
    ).toEqual([
      { poolId: "pool-1", quantityReturned: "1.25" },
      { itemId: "item-1", condition: "DAMAGED" },
    ]);
  });

  it("rejects pool over-return and serialized returns without a condition", () => {
    expect(() =>
      buildCheckinReturns([
        {
          selected: true,
          poolId: "pool-1",
          outstandingQuantity: "2.00",
          quantity: "2.01",
        },
      ]),
    ).toThrow("exceeds");

    expect(() =>
      buildCheckinReturns([
        {
          selected: true,
          itemId: "item-1",
          outstandingQuantity: "1.00",
        },
      ]),
    ).toThrow("condition");
  });
});

describe("IdempotencyAttempt", () => {
  it("reuses a key for the same payload after a transient failure", () => {
    let sequence = 0;
    const attempt = new IdempotencyAttempt(() => `key-${++sequence}`);
    const payload = { assets: [{ poolId: "pool-1", quantity: "1.00" }] };

    expect(attempt.keyFor(payload)).toBe("key-1");
    expect(attempt.keyFor(payload)).toBe("key-1");
  });

  it("rotates after success, a definitive failure, or a payload change", () => {
    let sequence = 0;
    const attempt = new IdempotencyAttempt(() => `key-${++sequence}`);
    const firstPayload = { assets: [{ poolId: "pool-1", quantity: "1.00" }] };
    const secondPayload = { assets: [{ poolId: "pool-1", quantity: "2.00" }] };

    expect(attempt.keyFor(firstPayload)).toBe("key-1");
    expect(attempt.keyFor(secondPayload)).toBe("key-2");
    attempt.complete();
    expect(attempt.keyFor(secondPayload)).toBe("key-3");
    attempt.failDefinitively();
    expect(attempt.keyFor(secondPayload)).toBe("key-4");
  });
});

describe("inventory action routing", () => {
  it("routes DONE and partial-return inventory actions through check-in", () => {
    expect(isCheckinAction({ id: "booking.done", permissionKey: "inventory.checkin" })).toBe(true);
    expect(
      isCheckinAction({ id: "booking.partial_return", permissionKey: "inventory.checkin" }),
    ).toBe(true);
    expect(isCheckinAction({ id: "booking.complete", permissionKey: "eval.submit_internal" })).toBe(
      false,
    );
  });

  it("routes checkout reversal through its dedicated endpoint", () => {
    expect(
      isCheckoutReverseAction({
        id: "booking.checkout_reverse",
        permissionKey: "inventory.checkout_reverse",
      }),
    ).toBe(true);
    expect(
      isCheckoutReverseAction({ id: "booking.checkout", permissionKey: "inventory.checkout" }),
    ).toBe(false);
  });
});
