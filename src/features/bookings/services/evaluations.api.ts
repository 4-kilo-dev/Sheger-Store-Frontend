import { client } from "@/lib/api/client";

export interface PerformanceMetric {
  id: string;
  key: string;
  label: string;
  description: string;
  category: "internal" | "client_feedback";
  sortOrder: number;
  isActive: boolean;
  valueType: "boolean" | "rating_10" | "rating_5" | "percentage"; // New configurable value type
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
    score: number; // Float/decimal matching the valueType constraints
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
    valueType?: "boolean" | "rating_10" | "rating_5" | "percentage"; // New
  }>;
}

export interface SubmitClientEvaluationPayload {
  respondentName: string;
  submittedAt?: string;
  scores: Array<{
    metricKey: string;
    score: number; // Float/decimal matching the valueType constraints
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
    valueType?: "boolean" | "rating_10" | "rating_5" | "percentage"; // New
  }>;
}

// SSR-safe storage helpers
const isBrowser = typeof window !== "undefined";

const DEFAULT_METRICS: PerformanceMetric[] = [
  {
    id: "m-ppe",
    key: "ppe",
    label: "PPE Compliance",
    description: "Personal Protective Equipment",
    category: "internal",
    sortOrder: 1,
    isActive: true,
    valueType: "boolean",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-loadin",
    key: "load_in_efficiency",
    label: "Load-In Efficiency",
    description: "Speed and organization during load-in",
    category: "internal",
    sortOrder: 2,
    isActive: true,
    valueType: "boolean",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-cables",
    key: "cable_neatness",
    label: "Cable Neatness & Safety",
    description: "Tidy cable management, taped down paths",
    category: "internal",
    sortOrder: 3,
    isActive: true,
    valueType: "boolean",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-rigging",
    key: "rigging_safety",
    label: "Rigging & Structure Safety",
    description: "Safety pins and weight balance correct",
    category: "internal",
    sortOrder: 4,
    isActive: true,
    valueType: "boolean",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-punctuality",
    key: "punctuality_arrival",
    label: "Punctuality (Arrival)",
    description: "Ready 30 minutes before load-in",
    category: "client_feedback",
    sortOrder: 1,
    isActive: true,
    valueType: "rating_10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-behavior",
    key: "crew_behavior",
    label: "Crew Behavior & Professionalism",
    description: "Polite and helpful communication",
    category: "client_feedback",
    sortOrder: 2,
    isActive: true,
    valueType: "rating_10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m-visual",
    key: "screen_quality",
    label: "Visual Quality & Alignment",
    description: "Colors calibrated, no seam issues",
    category: "client_feedback",
    sortOrder: 3,
    isActive: true,
    valueType: "rating_10",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper to initialize and retrieve localStorage state
function getLocalDb() {
  if (!isBrowser) {
    return {
      metrics: DEFAULT_METRICS,
      internal: {} as Record<string, InternalEvaluation>,
      client: {} as Record<string, ClientEvaluation>,
    };
  }

  // Load metrics
  let metrics = DEFAULT_METRICS;
  const savedMetrics = localStorage.getItem("vortex_eval_metrics");
  if (savedMetrics) {
    try {
      const parsed = JSON.parse(savedMetrics);
      // Ensure all loaded metrics have valueType
      metrics = parsed.map((m: any) => ({
        ...m,
        valueType: m.valueType || (m.category === "internal" ? "boolean" : "rating_10"),
      }));
    } catch {
      // ignore
    }
  } else {
    localStorage.setItem("vortex_eval_metrics", JSON.stringify(DEFAULT_METRICS));
  }

  // Load internal evaluations
  let internal: Record<string, InternalEvaluation> = {};
  const savedInternal = localStorage.getItem("vortex_eval_internal");
  if (savedInternal) {
    try {
      internal = JSON.parse(savedInternal);
    } catch {
      // ignore
    }
  }

  // Load client evaluations
  let clientDb: Record<string, ClientEvaluation> = {};
  const savedClient = localStorage.getItem("vortex_eval_client");
  if (savedClient) {
    try {
      clientDb = JSON.parse(savedClient);
    } catch {
      // ignore
    }
  }

  return { metrics, internal, client: clientDb };
}

function saveLocalDb(db: ReturnType<typeof getLocalDb>) {
  if (!isBrowser) return;
  localStorage.setItem("vortex_eval_metrics", JSON.stringify(db.metrics));
  localStorage.setItem("vortex_eval_internal", JSON.stringify(db.internal));
  localStorage.setItem("vortex_eval_client", JSON.stringify(db.client));
}

// ----------------------------------------------------
// 1. Performance Metrics Catalog APIs
// ----------------------------------------------------

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
  payload: Omit<PerformanceMetric, "id" | "createdAt" | "updatedAt">
): Promise<PerformanceMetric> {
  return client.post<PerformanceMetric>("/api/performance-metrics", payload);
}

export async function updatePerformanceMetricApi(
  id: string,
  payload: Partial<Omit<PerformanceMetric, "id" | "createdAt" | "updatedAt">>
): Promise<PerformanceMetric> {
  return client.patch<PerformanceMetric>(`/api/performance-metrics/${id}`, payload);
}

// ----------------------------------------------------
// 2. Internal Evaluations APIs
// ----------------------------------------------------

export async function getInternalEvaluationApi(bookingId: string): Promise<InternalEvaluation> {
  return client.get<InternalEvaluation>(`/api/bookings/${bookingId}/evaluation`);
}

export async function submitInternalEvaluationApi(
  bookingId: string,
  payload: SubmitInternalEvaluationPayload
): Promise<InternalEvaluation> {
  return client.post<InternalEvaluation>(`/api/bookings/${bookingId}/evaluation`, payload);
}

// ----------------------------------------------------
// 3. Client Evaluations APIs (Google Forms Webhook Simulation)
// ----------------------------------------------------

export async function getClientEvaluationApi(bookingId: string): Promise<ClientEvaluation> {
  return client.get<ClientEvaluation>(`/api/bookings/${bookingId}/client-evaluation`);
}

export async function submitClientEvaluationApi(
  bookingId: string,
  payload: SubmitClientEvaluationPayload
): Promise<ClientEvaluation> {
  return client.post<ClientEvaluation>(`/api/bookings/${bookingId}/client-evaluation`, payload, {
    headers: {
      "X-Webhook-Secret": "GOOGLE_FORM_WEBHOOK_SECRET_MOCK",
    },
  });
}
