import { client } from "@/lib/api/client";

export interface PerformanceMetric {
  id: string;
  key: string;
  label: string;
  description: string;
  category: "internal" | "client_feedback";
  sortOrder: number;
  isActive: boolean;
  valueType: "boolean" | "rating_10" | "rating_5" | "percentage";
  createdAt: string;
  updatedAt: string;
}

export interface SubmitInternalEvaluationPayload {
  assignmentId?: string;
  clientNameVenue?: string;
  eventDate?: string;
  teamSize?: number;
  notes?: string;
  scores: Array<{
    metricId: string;
    score: number;
  }>;
}

export interface InternalEvaluation {
  id: string;
  bookingId: string;
  assignmentId?: string;
  clientNameVenue?: string;
  eventDate?: string;
  teamSize?: number;
  notes?: string;
  evaluatorId: string;
  createdAt: string;
  updatedAt: string;
  scores: Array<{
    metricId: string;
    score: number;
    key?: string;
    label?: string;
    description?: string;
    valueType?: "boolean" | "rating_10" | "rating_5" | "percentage";
  }>;
}

export interface SubmitClientEvaluationPayload {
  respondentName: string;
  submittedAt?: string;
  scores: Array<{
    metricKey: string;
    score: number;
  }>;
}

export interface ClientEvaluation {
  id: string;
  bookingId: string;
  respondentName: string;
  submittedAt: string;
  createdAt: string;
  scores: Array<{
    metricId: string;
    score: number;
    key?: string;
    label?: string;
    description?: string;
    valueType?: "boolean" | "rating_10" | "rating_5" | "percentage";
  }>;
}

export async function listPerformanceMetricsApi(params?: {
  category?: "internal" | "client_feedback";
  isActive?: boolean;
}): Promise<PerformanceMetric[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", params.category);
  if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return client.get<PerformanceMetric[]>(`/api/performance-metrics${queryString}`);
}

export async function createPerformanceMetricApi(
  payload: Omit<PerformanceMetric, "id" | "createdAt" | "updatedAt">,
): Promise<PerformanceMetric> {
  return client.post<PerformanceMetric>("/api/performance-metrics", payload);
}

export async function updatePerformanceMetricApi(
  id: string,
  payload: Partial<Omit<PerformanceMetric, "id" | "createdAt" | "updatedAt">>,
): Promise<PerformanceMetric> {
  return client.patch<PerformanceMetric>(`/api/performance-metrics/${id}`, payload);
}

export async function getInternalEvaluationApi(bookingId: string): Promise<InternalEvaluation> {
  return client.get<InternalEvaluation>(`/api/bookings/${bookingId}/evaluation`);
}

export async function submitInternalEvaluationApi(
  bookingId: string,
  payload: SubmitInternalEvaluationPayload,
): Promise<InternalEvaluation> {
  return client.post<InternalEvaluation>(`/api/bookings/${bookingId}/evaluation`, payload);
}

export async function getClientEvaluationApi(bookingId: string): Promise<ClientEvaluation> {
  return client.get<ClientEvaluation>(`/api/bookings/${bookingId}/client-evaluation`);
}

export async function submitClientEvaluationApi(
  bookingId: string,
  payload: SubmitClientEvaluationPayload,
): Promise<ClientEvaluation> {
  return client.post<ClientEvaluation>(`/api/bookings/${bookingId}/client-evaluation`, payload, {
    headers: {
      "X-Webhook-Secret": "GOOGLE_FORM_WEBHOOK_SECRET_MOCK",
    },
  });
}
