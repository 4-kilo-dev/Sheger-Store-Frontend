import { client } from "@/lib/api/client";

export interface CheckoutAsset {
  poolId?: string | null;
  itemId?: string | null;
  quantity?: string;
}

export interface CheckinReturn {
  poolId?: string | null;
  itemId?: string | null;
  quantityReturned?: string;
  condition?: "AVAILABLE" | "DAMAGED" | "LOST" | "UNDER_MAINTENANCE";
}

export async function checkoutBookingApi(
  bookingId: string,
  assets: CheckoutAsset[],
): Promise<{ status: string }> {
  return client.post(`/api/bookings/${bookingId}/checkout`, { assets });
}

export async function checkinBookingApi(
  bookingId: string,
  returns: CheckinReturn[],
): Promise<{ status: string }> {
  return client.post(`/api/bookings/${bookingId}/checkin`, { returns });
}
