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
  bookingCode?: string | null;
  poolName?: string | null;
  itemName?: string | null;
}

export type DamageReportResolution = {
  status: "RESOLVED" | "REJECTED";
  itemCondition?: "AVAILABLE" | "RETIRED" | "UNDER_MAINTENANCE" | "DAMAGED";
  resolutionAction?: "WRITE_OFF" | "REPAIRED";
};

export function getDamageReportsApi(): Promise<DamageReport[]> {
  return client.get<DamageReport[]>("/api/damage-reports");
}

export function resolveDamageReportApi(
  id: string,
  payload: DamageReportResolution,
): Promise<DamageReport> {
  return client.patch<DamageReport>(`/api/damage-reports/${id}`, payload);
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
