import { client } from "@/lib/api/client";
import type { CheckoutAsset, InventoryCondition } from "@vortex/utils";

export type { CheckoutAsset, InventoryCondition };

export type CustodyLine = {
  poolId: string | null;
  itemId: string | null;
  snapshotQuantity: string;
  outQuantity: string;
  inQuantity: string;
  outstandingQuantity: string;
  availableToCheckoutQuantity: string;
};

export type CheckinReturn = {
  poolId?: string;
  itemId?: string;
  quantityReturned?: string;
  condition?: InventoryCondition;
};

export type CheckinResult = {
  movements: unknown[];
  status: "PARTIALLY_RETURNED" | "DONE";
};

export async function checkoutBookingApi(
  bookingId: string,
  payload: { assets: CheckoutAsset[] },
  idempotencyKey?: string,
): Promise<{ status: string }> {
  return client.post(`/api/bookings/${bookingId}/checkout`, payload, {
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

export async function checkinBookingApi(
  bookingId: string,
  payload: { returns: CheckinReturn[] },
): Promise<CheckinResult> {
  return client.post(`/api/bookings/${bookingId}/checkin`, payload);
}

export async function getBookingCustodyApi(bookingId: string): Promise<CustodyLine[]> {
  return client.get(`/api/bookings/${bookingId}/checkout/custody`);
}
