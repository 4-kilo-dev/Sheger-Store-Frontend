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

export async function createDamageReportApi(payload: {
  bookingId: string;
  poolId?: string;
  itemId?: string;
  reportType: "DAMAGE" | "MISSING";
  quantity?: string;
  description?: string;
}): Promise<DamageReport> {
  return client.post<DamageReport>(`/api/bookings/${payload.bookingId}/damage-reports`, payload);
}
