import { client } from "@/lib/api/client";

export interface DamageReport {
  id: string;
  bookingId: string;
  poolId: string | null;
  itemId: string | null;
  reportType: "DAMAGE" | "MISSING";
  quantity: string | null;
  description: string | null;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  reportedBy: string;
  createdAt: string;
}

export async function createDamageReportApi(
  bookingId: string | null | undefined,
  payload: {
    poolId?: string;
    itemId?: string;
    reportType: "DAMAGE" | "MISSING";
    quantity?: string;
    description?: string;
  },
): Promise<DamageReport> {
  if (bookingId) {
    return client.post<DamageReport>(`/api/bookings/${bookingId}/damage-reports`, {
      ...payload,
      bookingId,
    });
  }
  return client.post<DamageReport>(`/api/damage-reports`, payload);
}
