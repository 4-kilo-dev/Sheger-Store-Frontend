import { client } from "@/lib/api/client";

export async function createDamageReportApi(payload: {
  bookingId: string;
  poolId?: string;
  itemId?: string;
  reportType: "DAMAGE" | "MISSING";
  quantity?: string;
  description?: string;
}): Promise<any> {
  return client.post(`/bookings/${payload.bookingId}/damage-reports`, payload);
}
