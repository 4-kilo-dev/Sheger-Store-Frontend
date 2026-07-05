import { client } from "@/lib/api/client";
import type { PerformanceMetric } from "@/types/domain";

export async function getPerformanceMetricsApi(): Promise<PerformanceMetric[]> {
  return client.get<PerformanceMetric[]>("/performance-metrics");
}

export async function toggleMetricActiveApi(
  id: string,
  isActive: boolean,
): Promise<PerformanceMetric> {
  return client.patch<PerformanceMetric>(`/performance-metrics/${id}`, { isActive });
}
