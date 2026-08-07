export type BookingStatus =
  | "RESERVED" | "CONFIRMED" | "ASSIGNED" | "ACCEPTED"
  | "PREPARATION" | "ONSITE" | "COMPLETED" | "DONE"
  | "CANCELED" | "PARTIALLY_RETURNED";

export type PaymentStatus = "PAID" | "ADVANCE" | "UNPAID";

export type ScreenType = "P2.97" | "P4" | "P5" | "P2.97-New" | "P3.91 INDOOR" | "P3.91 OUTDOOR" | string;

const KNOWN_SCREEN_TYPES = [
  "P3.91 OUTDOOR",
  "P3.91 INDOOR",
  "P2.97-New",
  "P2.97",
  "P4",
  "P5",
] as const;

function parseSqm(value: string): number {
  const parsed = Number.parseFloat(value.replace(/sqm/i, "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const MOUNT_STYLE_RE = /^(hanging|sitting)$/i;
const DIMENSION_RE =
  /(\d+(?:\.\d+)?)\s*[wW]\s*[x×]\s*(\d+(?:\.\d+)?)\s*[hH]?/i;

function isMountStyle(value?: string | null): boolean {
  return MOUNT_STYLE_RE.test(String(value ?? "").trim());
}

/** Normalize layout to `(4wx3h)`. Returns "" for empty / mount-style enums. */
function formatArrangementLabel(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!raw || isMountStyle(raw)) return "";

  const dim = raw.match(
    /^\(?\s*(\d+(?:\.\d+)?)\s*[wW]\s*[x×]\s*(\d+(?:\.\d+)?)\s*[hH]?\s*\)?$/,
  );
  if (dim) return `(${dim[1]}wx${dim[2]}h)`;

  const loose = raw.match(DIMENSION_RE);
  if (loose) return `(${loose[1]}wx${loose[2]}h)`;

  return raw;
}

function formatMountStyleLabel(value?: string | null): string {
  const raw = String(value ?? "").trim();
  if (!isMountStyle(raw)) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function looksLikeDimension(value?: string | null): boolean {
  return DIMENSION_RE.test(String(value ?? "").trim());
}

function isScreenTypeToken(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (KNOWN_SCREEN_TYPES.some((k) => k.toUpperCase() === text.toUpperCase())) return true;
  return Boolean(extractPitchLabel(text));
}

/** Pull a displayable screen type from free-text intake / CTO hold specs. */
function extractScreenType(spec: string): string {
  const text = spec.trim();
  if (!text) return "";

  for (const known of KNOWN_SCREEN_TYPES) {
    if (text.toUpperCase().includes(known.toUpperCase())) return known;
  }

  // "45sqm of P3.9 Outdoor LED Panel" (CTO technical holds)
  const ofMatch = text.match(/\d+(?:\.\d+)?\s*sqm\s+of\s+(.+)$/i);
  if (ofMatch) {
    const name = ofMatch[1].trim();
    for (const known of KNOWN_SCREEN_TYPES) {
      if (name.toUpperCase().includes(known.toUpperCase())) return known;
    }
    const fromName = extractPitchLabel(name);
    if (fromName) return fromName;
    if (!looksLikeDimension(name) && !isMountStyle(name)) return name;
  }

  const fromSpec = extractPitchLabel(text);
  if (fromSpec) return fromSpec;

  const firstPart = text.split(" - ")[0]?.trim() || "";
  if (
    firstPart &&
    !/sqm/i.test(firstPart) &&
    !/^intake:/i.test(firstPart) &&
    !looksLikeDimension(firstPart) &&
    !isMountStyle(firstPart)
  ) {
    return firstPart;
  }
  return "";
}

function extractPitchLabel(text: string): string {
  const m = text.match(
    /P\s*(\d+(?:\.\d+)?)\s*(?:-\s*)?(New)?\s*(Indoor|Outdoor)?/i,
  );
  if (!m) return "";
  let pitch = m[1];
  // Common warehouse naming: P3.9 ↔ P3.91
  if (pitch === "3.9") pitch = "3.91";
  if (pitch === "2.9") pitch = "2.97";
  const isNew = Boolean(m[2]);
  const env = m[3] ? m[3].toUpperCase() : "";

  if (pitch === "2.97" && isNew) return "P2.97-New";
  if (pitch === "3.91" && env) return `P3.91 ${env}`;
  if (pitch === "2.97") return "P2.97";
  if (pitch === "4") return "P4";
  if (pitch === "5") return "P5";
  return `P${pitch}${env ? ` ${env}` : ""}`;
}

/** Derive display fields from backend spec without inventing CTO defaults at intake. */
function parseBookingScreenFields(b: {
  itemServiceSpec?: string | null;
  arrangementDetails?: string | null;
  arrangement_details?: string | null;
  screenAreaSqm?: number | string | null;
  customFields?: Record<string, any> | null;
}) {
  const spec = (b.itemServiceSpec || "").trim();
  const specParts = spec ? spec.split(" - ").map((part) => part.trim()) : [];
  const custom = b.customFields || {};

  let size = 0;
  const sqmPart = specParts.find((part) => /sqm/i.test(part));
  if (sqmPart) size = parseSqm(sqmPart);
  // Also handle "45sqm of …" without " - " separators
  if (!size) {
    const inlineSqm = spec.match(/(\d+(?:\.\d+)?)\s*sqm/i);
    if (inlineSqm) size = parseSqm(inlineSqm[1]);
  }

  const backendSize = Number(b.screenAreaSqm);
  if (Number.isFinite(backendSize) && backendSize > 0) size = backendSize;

  const screenType = extractScreenType(spec);

  // Layout text candidates (preferred). Mount style is a separate fallback.
  const layoutCandidates: Array<string | null | undefined> = [
    b.arrangementDetails,
    b.arrangement_details,
    typeof custom.arrangement_details === "string" ? custom.arrangement_details : null,
    typeof custom.screen_arrangement === "string" ? custom.screen_arrangement : null,
    typeof custom.screen_specification === "string" ? custom.screen_specification : null,
    typeof custom.arrangement === "string" && !isMountStyle(custom.arrangement)
      ? custom.arrangement
      : null,
    // Full intake/CTO text may embed "4wx3h" alongside other tokens
    spec,
    ...specParts.filter(
      (part) =>
        !isMountStyle(part) &&
        !/sqm/i.test(part) &&
        !isScreenTypeToken(part),
    ),
  ];

  let arrangement = "";
  // 1) Prefer explicit WxH dimensions wherever they appear
  for (const candidate of layoutCandidates) {
    if (!looksLikeDimension(candidate)) continue;
    const formatted = formatArrangementLabel(candidate);
    if (formatted) {
      arrangement = formatted;
      break;
    }
  }
  // 2) Otherwise use free-text layout fields (not screen type / mount style)
  if (!arrangement) {
    for (const candidate of layoutCandidates) {
      if (candidate == null || candidate === spec) continue; // avoid dumping full CTO hold blurbs
      const formatted = formatArrangementLabel(candidate);
      if (formatted && !isScreenTypeToken(formatted)) {
        arrangement = formatted;
        break;
      }
    }
  }
  // 3) Legacy rows only stored hanging/sitting — still surface that so the column isn't blank
  if (!arrangement) {
    arrangement =
      formatMountStyleLabel(custom.hanging_or_sitting) ||
      formatMountStyleLabel(custom.arrangement) ||
      formatMountStyleLabel(specParts[specParts.length - 1]);
  }

  return {
    screenType: screenType as ScreenType | "",
    size,
    arrangement,
    intakeSpec: spec,
  };
}

export interface BomItem {
  id: string;
  /** Human-readable line code, e.g. SC-001 (derived from material category). */
  code: string;
  name: string;
  qty: number;
  status: "Reserved" | "Checked Out" | "Returned";
  poolId?: string;
  itemId?: string;
  categoryKey?: string;
}

export interface Booking {
  id: string;
  code: string;
  client: string;
  contactPerson: string;
  contactPhone: string;
  assemblyDate: string;
  eventDate: string;
  dismantleDate: string;
  rentalStart?: string;
  rentalEnd?: string;
  venue: string;
  screenType: ScreenType | "";
  size: number;
  arrangement: string;
  assignees: string[];
  stageHand: string;
  status: BookingStatus;
  payment: PaymentStatus;
  amount: number;
  paymentAmount?: number;
  dailyRate?: number;
  rentedDays?: number;
  advanceAmount?: number;
  ctoNotes: string;
  bomItems: BomItem[];
  teamLeader: string;
  driver: string;
  driverUserId?: string;
  vehicleText?: string;
  vehiclePlate?: string;
  mealBudget: number;
  createdAt: string;
  statusHistory?: StatusHistoryItem[];
  itemServiceSpec?: string;
  assignments?: any[];
  customFields: Record<string, any>;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: "boolean" | "number" | "string" | "date" | "enum" | "multi_select";
  options?: string[];
  required?: boolean;
  isActive?: boolean;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorName: string;
  reason: string | null;
  createdAt: string;
}

function makeBom(screenType: ScreenType, size: number, idx: number): BomItem[] {
  const statusPick = (i: number): BomItem["status"] =>
    idx >= 5 ? (i < 2 ? "Checked Out" : "Reserved") : idx >= 7 ? "Returned" : "Reserved";
  const raw = [
    { id: `PNL-${screenType.replace(/\s/g, "").replace(".", "")}-${String(idx).padStart(2, "0")}`, name: `${screenType} Panel`, qty: size, status: statusPick(0), categoryKey: "screen" },
    { id: `PSU-${10 + idx}`, name: "Power Supply Unit", qty: Math.ceil(size / 10), status: statusPick(1), categoryKey: "power_box" },
    { id: `PRC-${idx % 2 === 0 ? "NVX" : "BRM"}-${String(idx).padStart(2, "0")}`, name: idx % 2 === 0 ? "Novastar VX1000" : "Brompton Tessera S8", qty: 1, status: statusPick(2), categoryKey: "controller" },
    { id: `TRS-2M-${String(idx).padStart(2, "0")}`, name: "Truss Segment 2m", qty: Math.ceil(size / 6), status: statusPick(3), categoryKey: "stage_truss" },
    { id: `CBL-HDM-${String(idx).padStart(2, "0")}`, name: "HDMI 4K Cable 15m", qty: 2, status: statusPick(4), categoryKey: "cable" },
    { id: `CBL-PWR-${String(idx).padStart(2, "0")}`, name: "Power Cable 30A", qty: Math.ceil(size / 8), status: statusPick(5), categoryKey: "cable" },
  ];
  return assignBomLineCodes(raw);
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  RESERVED: "Reserved", CONFIRMED: "Confirmed", ASSIGNED: "Assigned",
  ACCEPTED: "Accepted", PREPARATION: "Preparation", ONSITE: "Onsite",
  COMPLETED: "Completed", DONE: "Done", CANCELED: "Canceled",
  PARTIALLY_RETURNED: "Partially Returned",
};

export const STATUS_ORDER: BookingStatus[] = [
  "RESERVED","CONFIRMED","ASSIGNED","ACCEPTED","PREPARATION","ONSITE","COMPLETED","DONE",
];

import { client } from "@/lib/api/client";
import { assignBomLineCodes } from "@/features/bookings/utils/bomLineCodes";

function parseNumericField(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Format an instant as local `YYYY-MM-DDTHH:mm` (not UTC-sliced ISO). */
function normalizeBookingDateTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Using UTC slice(0,16) strips the Z and re-parses as local, shifting the
  // calendar day in UTC+ offsets (e.g. EAT) and breaking week filters.
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function mapBackendBookingToFrontend(b: any): Booking {
  const customerName = b.customer?.name || "Client";
  const customerPhone = b.customer?.phone || "";
  
  // Format BOM lines with material-type shorthand codes (SC-001, CB-002, …)
  const sortedBomLines = [...(b.bomLines || [])].sort((a: any, c: any) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tc = c.createdAt ? new Date(c.createdAt).getTime() : 0;
    if (ta !== tc) return ta - tc;
    return String(a.id).localeCompare(String(c.id));
  });

  const bomItems: BomItem[] = assignBomLineCodes(
    sortedBomLines.map((line: any) => ({
      id: line.id,
      name: line.item?.name || line.pool?.name || "Equipment Line",
      qty: parseFloat(line.quantity),
      status: (line.acceptedShortfall ? "Checked Out" : "Reserved") as BomItem["status"],
      poolId: line.poolId || undefined,
      itemId: line.itemId || undefined,
      categoryKey: line.pool?.category?.key || line.item?.category?.key || undefined,
    }))
  );

  // Extract assignees (active assignments only)
  const assignees = (b.assignments || [])
    .filter((a: any) => a.status !== "DECLINED")
    .map((a: any) => a.user?.name)
    .filter(Boolean);
  
  // Stagehand team leader (CREW + isTeamLead) takes precedence for logistics/checkout.
  const stagehandLeaderAssignee = (b.assignments || []).find(
    (a: any) =>
      a.roleContext === "CREW" && a.isTeamLead && a.status !== "DECLINED"
  );
  const otherLeadAssignee = (b.assignments || []).find(
    (a: any) =>
      a.isTeamLead &&
      a.roleContext !== "CREW" &&
      a.status !== "DECLINED"
  );
  const teamLeader =
    stagehandLeaderAssignee?.user?.name || otherLeadAssignee?.user?.name || "";

  const crewNames = (b.assignments || [])
    .filter((a: any) => a.roleContext === "CREW" && a.status !== "DECLINED")
    .map((a: any) => a.user?.name)
    .filter(Boolean);
  const stageHand = crewNames.length > 0 ? `TEAM · ${crewNames.join(", ")}` : "None Assigned";

  const driver = b.driver?.name || (b.assignments || []).find((a: any) => a.roleContext === "OO")?.user?.name || "None Assigned";
  const mealBudget = parseFloat(b.mealProvision) || 0;

  let payment: PaymentStatus = "UNPAID";
  const rawPayment = b.paymentStatus?.toLowerCase();
  if (rawPayment === "fully_paid" || rawPayment === "paid") {
    payment = "PAID";
  } else if (rawPayment === "advance") {
    payment = "ADVANCE";
  }

  // Intake / CTO spec — do not default screen type or arrangement before explicit allocation
  const { screenType, size, arrangement, intakeSpec } = parseBookingScreenFields(b);

  const statusHistory = (b.statusHistory || []).map((h: any) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    actorName: h.actor?.name || "System",
    reason: h.reason,
    createdAt: h.createdAt,
  }));

  return {
    id: b.id,
    code: b.bookingCode || b.id, // Use human-readable bookingCode if available, fallback to id
    client: customerName,
    contactPerson: customerName,
    contactPhone: customerPhone,
    assemblyDate: normalizeBookingDateTime(b.assemblyStart || b.deliveryDate || b.rentalStart),
    eventDate: normalizeBookingDateTime(b.eventDate),
    dismantleDate: normalizeBookingDateTime(b.disassemblyEnd || b.rentalEnd),
    rentalStart: b.rentalStart || b.deliveryDate || b.assemblyStart || b.eventDate || "",
    rentalEnd: b.rentalEnd || b.disassemblyEnd || b.eventDate || "",
    venue: b.eventLocation || "",
    screenType,
    size,
    arrangement,
    assignees: assignees,
    stageHand,
    status: (b.status || "RESERVED") as BookingStatus,
    payment,
    amount: typeof b.paymentAmount === "number" ? b.paymentAmount : parseFloat(b.paymentAmount || "0"),
    paymentAmount: parseNumericField(b.paymentAmount),
    dailyRate: parseNumericField(b.dailyRate),
    rentedDays: b.rentedDays ?? undefined,
    advanceAmount: parseNumericField(b.advanceAmount),
    ctoNotes: b.ctoConsultationNotes || "",
    bomItems: bomItems,
    teamLeader: teamLeader,
    driver,
    driverUserId: b.driverUserId || "",
    vehicleText: b.vehicleText || "",
    vehiclePlate: b.vehiclePlate || "",
    mealBudget,
    createdAt: b.createdAt || new Date().toISOString(),
    statusHistory,
    itemServiceSpec: intakeSpec,
    assignments: b.assignments || [],
    customFields: b.customFields || {},
  };
}

export async function getBookingsApi(): Promise<Booking[]> {
  const data = await client.get<any[]>("/api/bookings");
  return (data || []).map((b) => mapBackendBookingToFrontend(b));
}

export async function getBookingDetailApi(id: string): Promise<Booking> {
  const b = await client.get<any>(`/api/bookings/${id}`);
  return mapBackendBookingToFrontend(b);
}

export async function createBookingApi(form: any): Promise<any> {
  // 1. Search or create customer by phone
  const customer = await client.post<any>("/api/customers", {
    name: form.client,
    phone: form.contactPhone || "+251 900 000 000",
    notes: form.contactPerson || "Client contact",
  });

  // 2. Prepare event dates
  const eventDateStr = form.eventDate
    ? (form.eventDate.includes("T") ? new Date(form.eventDate).toISOString() : `${form.eventDate}T18:00:00.000Z`)
    : new Date().toISOString();

  const assemblyStartStr = form.assemblyDate
    ? (form.assemblyDate.includes("T") ? new Date(form.assemblyDate).toISOString() : `${form.assemblyDate}T12:00:00.000Z`)
    : new Date().toISOString();

  const assemblyEndStr = form.assemblyDate
    ? (form.assemblyDate.includes("T") ? new Date(new Date(form.assemblyDate).getTime() + 3 * 3600000).toISOString() : `${form.assemblyDate}T15:00:00.000Z`)
    : new Date().toISOString();

  const dismantleDateStr = form.dismantleDate
    ? (form.dismantleDate.includes("T") ? new Date(form.dismantleDate).toISOString() : `${form.dismantleDate}T23:59:59.000Z`)
    : (form.eventDate
        ? (form.eventDate.includes("T") ? new Date(new Date(form.eventDate).getTime() + 6 * 3600000).toISOString() : `${form.eventDate}T23:59:00.000Z`)
        : new Date().toISOString());

  const screenSize = form.size !== "" && form.size != null ? Number(form.size) : undefined;
  const hasValidSize = screenSize !== undefined && Number.isFinite(screenSize) && screenSize >= 0;
  const arrangementText = String(form.arrangement ?? form.itemServiceSpec ?? "").trim();

  const bookingPayload: Record<string, unknown> = {
    customerId: customer.id,
    eventDate: eventDateStr,
    eventLocation: form.venue || "TBD",
    deliveryDate: assemblyStartStr,
    rentalStart: eventDateStr,
    rentalEnd: dismantleDateStr,
    assemblyStart: assemblyStartStr,
    assemblyEnd: assemblyEndStr,
    disassemblyStart: dismantleDateStr,
    disassemblyEnd: dismantleDateStr,
    itemServiceType: "Rental",
    notes: form.notes || form.ctoNotes || "",
    customFields: form.customFields || {},
  };

  if (arrangementText) {
    bookingPayload.arrangementDetails = arrangementText;
  }

  if (form.rentedDays != null && form.rentedDays > 0) {
    bookingPayload.rentedDays = form.rentedDays;
  }
  if (hasValidSize) {
    bookingPayload.screenAreaSqm = String(screenSize);
  }

  // 3. Create booking — daily rate / payment are set later at RESERVED → CONFIRMED
  const booking = await client.post<any>("/api/bookings", bookingPayload);

  return booking;
}

export async function transitionBookingStatusApi(bookingId: string, toStatus: BookingStatus, reason?: string, override = false): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/transition`, {
    toStatus,
    reason: reason || `Transitioning to ${toStatus}`,
    override,
  });
}

export interface AllowedTransition {
  fromStatus: BookingStatus;
  toStatus: BookingStatus;
  permissionKey: string;
  reasonRequired?: boolean;
  viaBypass?: boolean;
  actionId?: string;
}

export interface AllowedTransitionsResponse {
  bookingId: string;
  status: BookingStatus;
  transitions: AllowedTransition[];
}

export async function getBookingAllowedTransitionsApi(
  bookingId: string
): Promise<AllowedTransitionsResponse> {
  return client.get<AllowedTransitionsResponse>(
    `/api/bookings/${bookingId}/allowed-transitions`
  );
}

export async function recordBookingPaymentApi(bookingId: string, toStatus: string, amount: number): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/payment`, {
    toStatus, // 'advance' or 'fully_paid'
    amount: String(amount),
  });
}

export interface PaymentSummary {
  /** Amount paid so far (advance deposit or full total). */
  paid: number;
  /** Contract total from screen size × days × daily rate (`paymentAmount`). */
  total: number | null;
  /** Remaining balance, or `null` when total is unknown. */
  remaining: number | null;
}

/** Payment figures from paymentAmount (total), advanceAmount (deposit), and payment status. */
export function getPaymentSummary(b: Booking): PaymentSummary {
  const totalRaw = b.paymentAmount ?? b.amount;
  const total = totalRaw != null && totalRaw > 0 ? totalRaw : null;

  if (b.payment === "PAID") {
    return { paid: total ?? 0, total, remaining: 0 };
  }
  if (b.payment === "ADVANCE") {
    const paid = b.advanceAmount ?? 0;
    return {
      paid,
      total,
      remaining: total != null ? Math.max(0, total - paid) : null,
    };
  }
  return { paid: 0, total, remaining: total };
}

export async function updateBookingApi(bookingId: string, payload: any): Promise<any> {
  return client.patch(`/api/bookings/${bookingId}`, payload);
}

export async function createReservationApi(bookingId: string, payload: { poolId?: string; itemId?: string; quantity?: string }): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/reservations`, payload);
}

export async function createAssignmentApi(bookingId: string, payload: { userId: string; roleContext: string; isTeamLead?: boolean; phase?: string }): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/assignments`, payload);
}

export async function getBookingReservationsApi(bookingId: string): Promise<any> {
  return client.get(`/api/bookings/${bookingId}/reservations`);
}

export async function deleteReservationApi(bookingId: string, id: string): Promise<any> {
  return client.delete(`/api/bookings/${bookingId}/reservations/${id}`);
}

export async function acceptAssignmentApi(assignmentId: string): Promise<any> {
  return client.patch(`/api/assignments/${assignmentId}/accept`, {});
}

export async function declineAssignmentApi(assignmentId: string, reason: string): Promise<any> {
  return client.patch(`/api/assignments/${assignmentId}/decline`, { declineReason: reason });
}

export async function createBomLineApi(bookingId: string, payload: { poolId: string; quantity: string }): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/bom/lines`, payload);
}

export async function updateBomLineApi(bookingId: string, lineId: string, payload: { quantity: string }): Promise<any> {
  return client.patch(`/api/bookings/${bookingId}/bom/lines/${lineId}`, payload);
}

export async function deleteBomLineApi(bookingId: string, lineId: string): Promise<any> {
  return client.delete(`/api/bookings/${bookingId}/bom/lines/${lineId}`);
}

export async function createHandoffSnapshotApi(bookingId: string): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/bom/snapshots`, { kind: "HANDOFF" });
}

export async function createDamageReportApi(bookingId: string, payload: { description?: string; poolId?: string; itemId?: string; reportType: "DAMAGE" | "MISSING"; quantity?: string }): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/damage-reports`, payload);
}

export async function submitEvaluationApi(bookingId: string, payload: any): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/evaluation`, payload);
}

export async function getBookingSnapshotsApi(bookingId: string, params?: { kind?: string }): Promise<any[]> {
  const query = params?.kind ? `?kind=${encodeURIComponent(params.kind)}` : "";
  return client.get<any[]>(`/api/bookings/${bookingId}/bom/snapshots${query}`);
}

export async function deleteAssignmentApi(assignmentId: string): Promise<any> {
  return client.delete(`/api/assignments/${assignmentId}`);
}

export async function checkoutReverseApi(bookingId: string, reason: string): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/checkout-reverse`, { reason });
}

export async function getCustomFieldDefinitionsApi(): Promise<CustomFieldDefinition[]> {
  return client.get<CustomFieldDefinition[]>("/api/custom-field-definitions");
}

export async function createCustomFieldDefinitionApi(
  payload: Omit<CustomFieldDefinition, "id" | "isActive">
): Promise<CustomFieldDefinition> {
  return client.post<CustomFieldDefinition>("/api/custom-field-definitions", payload);
}

export async function deleteCustomFieldDefinitionApi(id: string): Promise<void> {
  return client.delete<void>(`/api/custom-field-definitions/${id}`);
}
