import { client } from "@/lib/api/client";
import type { BomItem } from "@/types/domain";

export async function checkoutBookingApi(
  bookingId: string,
  items: BomItem[],
): Promise<{ status: string }> {
  const assets = items.map((item) => ({
    poolId: item.poolId,
    itemId: item.itemId,
    quantity: item.poolId ? String(item.qty) : undefined,
  }));
  return client.post(`/bookings/${bookingId}/checkout`, { assets });
}

export async function checkinBookingApi(
  bookingId: string,
  items: BomItem[],
  condition: "AVAILABLE" | "DAMAGED" | "LOST" | "UNDER_MAINTENANCE" = "AVAILABLE",
): Promise<{ status: string }> {
  const returns = items.map((item) => ({
    poolId: item.poolId,
    itemId: item.itemId,
    quantityReturned: item.poolId ? String(item.qty) : undefined,
    condition: item.itemId ? condition : undefined,
  }));
  return client.post(`/bookings/${bookingId}/checkin`, { returns });
}
