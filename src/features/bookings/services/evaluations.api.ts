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
  try {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.isActive !== undefined) query.append("isActive", String(params.isActive));
    
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return await client.get<PerformanceMetric[]>(`/api/performance-metrics${queryString}`);
  } catch (error) {
    console.warn("Failed to fetch performance metrics from server, returning mock fallback.", error);
    
    const db = getLocalDb();
    let result = db.metrics;
    
    if (params?.category) {
      result = result.filter((m) => m.category === params.category);
    }
    if (params?.isActive !== undefined) {
      result = result.filter((m) => m.isActive === params.isActive);
    }
    
    return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

export async function createPerformanceMetricApi(
  payload: Omit<PerformanceMetric, "id" | "createdAt" | "updatedAt">
): Promise<PerformanceMetric> {
  try {
    return await client.post<PerformanceMetric>("/api/performance-metrics", payload);
  } catch (error) {
    console.warn("Failed to create metric on server, saving mock fallback.", error);
    
    const db = getLocalDb();
    const newMetric: PerformanceMetric = {
      ...payload,
      id: `metric-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    db.metrics.push(newMetric);
    saveLocalDb(db);
    return newMetric;
  }
}

export async function updatePerformanceMetricApi(
  id: string,
  payload: Partial<Omit<PerformanceMetric, "id" | "createdAt" | "updatedAt">>
): Promise<PerformanceMetric> {
  try {
    return await client.patch<PerformanceMetric>(`/api/performance-metrics/${id}`, payload);
  } catch (error) {
    console.warn(`Failed to update metric ${id} on server, updating mock fallback.`, error);
    
    const db = getLocalDb();
    const index = db.metrics.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error(`Metric not found: ${id}`);
    }
    
    const updatedMetric: PerformanceMetric = {
      ...db.metrics[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    
    db.metrics[index] = updatedMetric;
    saveLocalDb(db);
    return updatedMetric;
  }
}

// ----------------------------------------------------
// 2. Internal Evaluations APIs
// ----------------------------------------------------

export async function getInternalEvaluationApi(bookingId: string): Promise<InternalEvaluation> {
  try {
    return await client.get<InternalEvaluation>(`/api/bookings/${bookingId}/evaluation`);
  } catch (error) {
    console.warn(`Failed to get internal evaluation for ${bookingId} from server, returning mock.`, error);
    
    const db = getLocalDb();
    const evaluation = db.internal[bookingId];
    if (!evaluation) {
      throw new Error(`Internal evaluation not found for booking: ${bookingId}`);
    }
    return evaluation;
  }
}

export async function submitInternalEvaluationApi(
  bookingId: string,
  payload: SubmitInternalEvaluationPayload
): Promise<InternalEvaluation> {
  try {
    return await client.post<InternalEvaluation>(`/api/bookings/${bookingId}/evaluation`, payload);
  } catch (error) {
    console.warn(`Failed to submit internal evaluation for ${bookingId} on server, saving mock.`, error);
    
    const db = getLocalDb();
    
    // Enrich internal scores with key/label/description/valueType for display
    const enrichedScores = payload.scores.map((s) => {
      const metric = db.metrics.find((m) => m.id === s.metricId);
      return {
        metricId: s.metricId,
        score: s.score,
        key: metric?.key || "unknown",
        label: metric?.label || "Unknown Metric",
        description: metric?.description || "",
        valueType: metric?.valueType || "boolean",
      };
    });

    const activeProfile = isBrowser ? localStorage.getItem("vortex_active_profile") : null;
    const evaluatorName = activeProfile ? JSON.parse(activeProfile).name : "Technician";

    const newEvaluation: InternalEvaluation = {
      id: `eval-int-${Math.random().toString(36).substr(2, 9)}`,
      bookingId,
      assignmentId: payload.assignmentId,
      clientNameVenue: payload.clientNameVenue,
      eventDate: payload.eventDate,
      teamSize: payload.teamSize,
      notes: payload.notes,
      evaluatorId: evaluatorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scores: enrichedScores,
    };

    db.internal[bookingId] = newEvaluation;
    saveLocalDb(db);
    return newEvaluation;
  }
}

// ----------------------------------------------------
// 3. Client Evaluations APIs (Google Forms Webhook Simulation)
// ----------------------------------------------------

export async function getClientEvaluationApi(bookingId: string): Promise<ClientEvaluation> {
  try {
    return await client.get<ClientEvaluation>(`/api/bookings/${bookingId}/client-evaluation`);
  } catch (error) {
    console.warn(`Failed to get client evaluation for ${bookingId} from server, returning mock.`, error);
    
    const db = getLocalDb();
    const evaluation = db.client[bookingId];
    if (!evaluation) {
      throw new Error(`Client evaluation not found for booking: ${bookingId}`);
    }
    return evaluation;
  }
}

export async function submitClientEvaluationApi(
  bookingId: string,
  payload: SubmitClientEvaluationPayload
): Promise<ClientEvaluation> {
  try {
    return await client.post<ClientEvaluation>(`/api/bookings/${bookingId}/client-evaluation`, payload, {
      headers: {
        "X-Webhook-Secret": "GOOGLE_FORM_WEBHOOK_SECRET_MOCK",
      },
    });
  } catch (error) {
    console.warn(`Failed to post client evaluation for ${bookingId} webhook on server, saving mock.`, error);
    
    const db = getLocalDb();
    
    // Enrich scores
    const enrichedScores = payload.scores.map((s) => {
      const metric = db.metrics.find((m) => m.key === s.metricKey);
      return {
        metricId: metric?.id || `metric-${s.metricKey}`,
        score: s.score,
        key: s.metricKey,
        label: metric?.label || s.metricKey.replace(/_/g, " "),
        description: metric?.description || "",
        valueType: metric?.valueType || "rating_10",
      };
    });

    const newEvaluation: ClientEvaluation = {
      id: `eval-cli-${Math.random().toString(36).substr(2, 9)}`,
      bookingId,
      respondentName: payload.respondentName,
      submittedAt: payload.submittedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      scores: enrichedScores,
    };

    db.client[bookingId] = newEvaluation;
    saveLocalDb(db);
    return newEvaluation;
  }
}
