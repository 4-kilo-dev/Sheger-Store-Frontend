import { describe, expect, it } from "vitest";
import {
  CHECKIN_STATUSES,
  CHECKOUT_STATUSES,
  IdempotencyAttempt,
  buildCheckinReturns,
  buildOperationItems,
  computeConfirmPricing,
  isCheckinAction,
  isCheckoutReverseAction,
  isUpcomingThisMonth,
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

describe("shared eligibility + operation lines", () => {
  it("limits checkout to PREPARATION/ONSITE in the current calendar month", () => {
    const now = new Date(2026, 7, 13);
    expect(
      isUpcomingThisMonth(
        { status: "PREPARATION", assemblyDate: "2026-08-20", eventDate: "2026-08-21" },
        "gregorian",
        now,
      ),
    ).toBe(true);
    expect(
      isUpcomingThisMonth(
        { status: "PREPARATION", assemblyDate: "2026-07-20", eventDate: "2026-07-21" },
        "gregorian",
        now,
      ),
    ).toBe(false);
    expect(CHECKOUT_STATUSES.has("ACCEPTED")).toBe(false);
    expect(CHECKIN_STATUSES.has("PARTIALLY_RETURNED")).toBe(true);
  });

  it("builds custody-backed operation items for onsite check-in and top-up checkout", () => {
    const bomItems = [
      { id: "b1", code: "SC-1", name: "Panels", qty: 10, poolId: "pool-1" },
      { id: "b2", code: "CT-1", name: "Controller", qty: 1, itemId: "item-1" },
    ];
    const custody = [
      {
        poolId: "pool-1",
        itemId: null,
        snapshotQuantity: "10.00",
        outQuantity: "8.00",
        inQuantity: "2.00",
        outstandingQuantity: "6.00",
        availableToCheckoutQuantity: "2.00",
      },
      {
        poolId: null,
        itemId: "item-1",
        snapshotQuantity: "1.00",
        outQuantity: "1.00",
        inQuantity: "0.00",
        outstandingQuantity: "1.00",
        availableToCheckoutQuantity: "0.00",
      },
    ];

    expect(
      buildOperationItems({
        mode: "checkin",
        bookingStatus: "ONSITE",
        bomItems,
        custody,
      }),
    ).toEqual([
      {
        id: "pool:pool-1",
        code: "SC-1",
        name: "Panels",
        qty: 6,
        poolId: "pool-1",
        itemId: undefined,
        outstandingQuantity: "6.00",
      },
      {
        id: "item:item-1",
        code: "CT-1",
        name: "Controller",
        qty: 1,
        poolId: undefined,
        itemId: "item-1",
        outstandingQuantity: "1.00",
      },
    ]);

    expect(
      buildOperationItems({
        mode: "checkout",
        bookingStatus: "ONSITE",
        bomItems,
        custody,
      }).map((item) => ({ id: item.id, qty: item.qty })),
    ).toEqual([{ id: "pool:pool-1", qty: 2 }]);
  });
});

describe("computeConfirmPricing", () => {
  it("multiplies screen size × daily rate × rented days", () => {
    expect(
      computeConfirmPricing({ screenSize: 12, dailyRate: 5000, rentedDays: 2 }),
    ).toEqual({
      total: 120000,
      isValid: true,
      errors: [],
    });
  });

  it("rejects missing size, days, rate, or totals under 1000", () => {
    expect(computeConfirmPricing({ screenSize: 0, dailyRate: 5000, rentedDays: 2 }).isValid).toBe(
      false,
    );
    expect(computeConfirmPricing({ screenSize: 10, dailyRate: 0, rentedDays: 2 }).isValid).toBe(
      false,
    );
    expect(computeConfirmPricing({ screenSize: 1, dailyRate: 100, rentedDays: 1 }).errors[0]).toMatch(
      /1,000/,
    );
  });
});
