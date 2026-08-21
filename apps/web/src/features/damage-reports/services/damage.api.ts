import { client } from "@/lib/api/client";

export type DamageReportRecord = {
  id: string;
  bookingCode?: string | null;
  poolId?: string | null;
  itemId?: string | null;
  poolName?: string | null;
  itemName?: string | null;
  reportType: "DAMAGE" | "MISSING";
  quantity?: string | null;
  description?: string | null;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  createdAt: string;
};

export function getDamageReportsApi(): Promise<DamageReportRecord[]> {
  return client.get("/api/damage-reports");
}

export function resolveDamageReportApi(
  id: string,
  payload: {
    status: "RESOLVED" | "REJECTED";
    itemCondition?: "AVAILABLE" | "RETIRED" | "UNDER_MAINTENANCE" | "DAMAGED";
    resolutionAction?: "WRITE_OFF" | "REPAIRED";
  },
): Promise<DamageReportRecord> {
  return client.patch(`/api/damage-reports/${id}`, payload);
}
