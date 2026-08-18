import { client } from "@/lib/api/client";
import { assignBomLineCodes } from "@/utils/bomLineCodes";
import type {
  Booking,
  BookingAssignment,
  BomItem,
  BookingStatus,
  PaymentStatus,
  ScreenType,
  StatusHistoryItem,
} from "@/types/domain";

interface RawPerson {
  id?: string;
  name?: string;
  phone?: string;
  notes?: string;
}

interface RawBomLine {
  id: string;
  quantity: string;
  poolId?: string;
  itemId?: string;
  acceptedShortfall?: boolean;
  item?: RawPerson & { name?: string };
  pool?: { name?: string };
}

interface RawAssignment {
  id: string;
  userId?: string;
  isTeamLead?: boolean;
  roleContext?: string;
  phase?: string;
  respondedAt?: string | null;
  declineReason?: string | null;
  user?: RawPerson & { id?: string };
}

interface RawBooking {
  id: string;
  bookingCode?: string;
  code?: string;
  customerId?: string;
  customerName?: string;
  client?: string;
  status?: string;
  eventDate?: string;
  eventLocation?: string;
  venue?: string;
  location?: string;
  assemblyStart?: string;
  disassemblyEnd?: string;
  itemServiceSpec?: string;
  screenAreaSqm?: number;
  rentedDays?: number;
  rentalStart?: string;
  rentalEnd?: string;
  paymentStatus?: string;
  paymentAmount?: string | number;
  dailyRate?: string | number;
  advanceAmount?: string | number;
  amount?: string;
  mealProvision?: string;
  notes?: string;
  ctoConsultationNotes?: string;
  createdAt?: string;
  customer?: RawPerson;
  driver?: RawPerson;
  driverUserId?: string;
  vehicleText?: string;
  vehiclePlate?: string;
  bomLines?: RawBomLine[];
  assignments?: RawAssignment[];
  statusHistory?: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actor?: { name?: string };
    reason: string | null;
    createdAt: string;
  }>;
  customFields?: Record<string, unknown>;
}

function parseNumericField(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

const KNOWN_SCREEN_TYPES = new Set<string>([
  "P2.97",
  "P4",
  "P5",
  "P2.97-New",
  "P3.91 INDOOR",
  "P3.91 OUTDOOR",
]);

function parseSqm(value: string): number {
  const parsed = Number.parseFloat(value.replace(/sqm/i, "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const MOUNT_STYLE_RE = /^(hanging|sitting)$/i;

function isMountStyle(value?: string | null): boolean {
  return MOUNT_STYLE_RE.test(String(value ?? "").trim());
}

/** multi_select: ["hanging", "sitting"] → "Hanging & Sitting" */
function formatMountStyleLabel(value?: string | string[] | null): string {
  if (Array.isArray(value)) {
    const labels = value
      .map((v) => String(v).trim())
      .filter((v) => isMountStyle(v))
      .map((v) => v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
    return labels.length > 0 ? labels.join(" & ") : "";
  }
  const raw = String(value ?? "").trim();
  if (!isMountStyle(raw)) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function normalizeCustomFieldPayload(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === "true") {
      out[key] = true;
      continue;
    }
    if (value === "false") {
      out[key] = false;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((v) => String(v).trim()).filter(Boolean);
      continue;
    }
    if (typeof value === "string") {
      const parts = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allMount = parts.length > 1 && parts.every((p) => isMountStyle(p));
      out[key] = allMount ? parts : value;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Derive display fields from backend spec without inventing defaults for new (spec-less) bookings. */
function parseBookingScreenFields(b: {
  itemServiceSpec?: string | null;
  screenAreaSqm?: number | string | null;
  customFields?: Record<string, unknown>;
}): { screenType: ScreenType | ""; size: number; arrangement: string } {
  const spec = (b.itemServiceSpec || "").trim();
  const specParts = spec ? spec.split(" - ").map((part) => part.trim()) : [];
  const custom = b.customFields || {};

  let screenType: ScreenType | "" = "";
  let size = 0;

  const sqmPart = specParts.find((part) => /sqm/i.test(part));
  if (sqmPart) size = parseSqm(sqmPart);

  const firstPart = specParts[0] || "";
  if (KNOWN_SCREEN_TYPES.has(firstPart)) {
    screenType = firstPart as ScreenType;
    if (!size && specParts[1]) size = parseSqm(specParts[1]);
  }

  const backendSize = Number(b.screenAreaSqm);
  if (Number.isFinite(backendSize) && backendSize > 0) size = backendSize;

  const hangingOrSitting = custom.hanging_or_sitting;
  const arrangementFromMount =
    formatMountStyleLabel(
      Array.isArray(hangingOrSitting)
        ? hangingOrSitting.map((v) => String(v))
        : typeof hangingOrSitting === "string"
          ? hangingOrSitting
          : null,
    ) ||
    formatMountStyleLabel(
      typeof custom.arrangement === "string" ? custom.arrangement : null,
    ) ||
    formatMountStyleLabel(specParts[specParts.length - 1]);

  const specLooksLikeLayout = /\d/.test(spec) && !isMountStyle(spec);
  const arrangement = specLooksLikeLayout ? spec : arrangementFromMount || spec;

  return { screenType, size, arrangement };
}

function mapBackendBookingToFrontend(b: RawBooking): Booking {
  const customerName = b.customer?.name || b.customerName || b.client || "Client";
  const customerPhone = b.customer?.phone || "";
  const contactPerson =
    typeof b.customer?.notes === "string" && b.customer.notes.trim()
      ? b.customer.notes.trim()
      : customerName;

  const bomItems: BomItem[] = assignBomLineCodes(
    (b.bomLines || []).map((line) => ({
      id: line.id,
      name: line.item?.name || line.pool?.name || "Equipment Line",
      qty: parseFloat(line.quantity),
      status: (line.acceptedShortfall ? "Checked Out" : "Reserved") as BomItem["status"],
      poolId: line.poolId || undefined,
      itemId: line.itemId || undefined,
      categoryKey: (line.pool as { category?: { key?: string } } | undefined)?.category?.key,
    })),
  );

  const assignees = (b.assignments || []).map((a) => a.user?.name).filter(Boolean) as string[];

  const leadAssignee = (b.assignments || []).find((a) => a.isTeamLead);
  const teamLeader = leadAssignee?.user?.name || "";

  const crewNames = (b.assignments || [])
    .filter((a) => a.roleContext === "CREW")
    .map((a) => a.user?.name)
    .filter(Boolean);
  const stageHand = crewNames.length > 0 ? `TEAM · ${crewNames.join(", ")}` : "None Assigned";

  const driver =
    b.driver?.name ||
    (b.assignments || []).find((a) => a.roleContext === "OO")?.user?.name ||
    "None Assigned";
  const mealBudget = parseFloat(b.mealProvision || "0") || 0;

  let payment: PaymentStatus = "UNPAID";
  const rawPayment = b.paymentStatus?.toLowerCase();
  if (rawPayment === "fully_paid" || rawPayment === "paid") {
    payment = "PAID";
  } else if (rawPayment === "advance") {
    payment = "ADVANCE";
  }

  const { screenType, size, arrangement } = parseBookingScreenFields(b);

  const paymentAmountNum =
    typeof b.paymentAmount === "number" ? b.paymentAmount : parseFloat(b.paymentAmount || "0");

  const statusHistory: StatusHistoryItem[] = (b.statusHistory || []).map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    actorName: h.actor?.name || "System",
    reason: h.reason,
    createdAt: h.createdAt,
  }));

  const assignments: BookingAssignment[] = (b.assignments || []).map((a) => ({
    id: a.id,
    userId: a.userId || a.user?.id,
    roleContext: a.roleContext,
    isTeamLead: a.isTeamLead,
    phase: a.phase,
    respondedAt: a.respondedAt ?? null,
    declineReason: a.declineReason ?? null,
    user: a.user?.id ? { id: a.user.id, name: a.user.name || "" } : undefined,
  }));

  return {
    id: b.id,
    code: b.bookingCode || b.code || b.id,
    customerId: b.customerId || b.customer?.id || undefined,
    client: customerName,
    contactPerson,
    contactPhone: customerPhone,
    assemblyDate: b.assemblyStart ? b.assemblyStart.slice(0, 10) : "",
    eventDate: b.eventDate ? b.eventDate.slice(0, 10) : "",
    dismantleDate: b.disassemblyEnd ? b.disassemblyEnd.slice(0, 10) : "",
    rentalStart: b.rentalStart || b.assemblyStart || b.eventDate || "",
    rentalEnd: b.rentalEnd || b.disassemblyEnd || b.eventDate || "",
    venue: b.eventLocation || b.venue || b.location || "",
    screenType,
    size,
    arrangement,
    assignees,
    stageHand,
    status: (b.status || "RESERVED") as BookingStatus,
    payment,
    amount: paymentAmountNum || parseFloat(b.amount || "0"),
    paymentAmount: parseNumericField(b.paymentAmount),
    dailyRate: parseNumericField(b.dailyRate),
    rentedDays: b.rentedDays ?? undefined,
    advanceAmount: parseNumericField(b.advanceAmount),
    ctoNotes: b.ctoConsultationNotes || b.notes || "",
    bomItems,
    teamLeader,
    driver,
    driverUserId: b.driverUserId || "",
    vehicleText: b.vehicleText || "",
    vehiclePlate: b.vehiclePlate || "",
    mealBudget,
    createdAt: b.createdAt ? b.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    statusHistory,
    itemServiceSpec: b.itemServiceSpec || "",
    assignments,
    customFields: b.customFields || {},
  };
}

export async function getBookingsApi(): Promise<Booking[]> {
  const data = await client.get<RawBooking[] | { data?: RawBooking[]; items?: RawBooking[] }>(
    "/api/bookings",
  );
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : [];
  return list.map(mapBackendBookingToFrontend);
}

export async function getBookingDetailApi(id: string): Promise<Booking> {
  const b = await client.get<RawBooking>(`/api/bookings/${id}`);
  return mapBackendBookingToFrontend(b);
}

export async function createBookingApi(form: {
  client: string;
  contactPerson?: string;
  contactPhone?: string;
  venue?: string;
  assemblyDate?: string;
  eventDate?: string;
  dismantleDate?: string;
  rentedDays?: number;
  itemServiceSpec?: string;
  arrangement?: string;
  size?: string | number;
  notes?: string;
  customValues?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
}): Promise<Booking> {
  const customer = await client.post<{ id: string }>("/api/customers", {
    name: form.client,
    phone: form.contactPhone || "+251 900 000 000",
    notes: form.contactPerson || "Client contact",
  });

  const eventDateStr = form.eventDate
    ? form.eventDate.includes("T")
      ? new Date(form.eventDate).toISOString()
      : `${form.eventDate}T18:00:00.000Z`
    : new Date().toISOString();

  const assemblyStartStr = form.assemblyDate
    ? form.assemblyDate.includes("T")
      ? new Date(form.assemblyDate).toISOString()
      : `${form.assemblyDate}T12:00:00.000Z`
    : new Date().toISOString();

  const assemblyEndStr = form.assemblyDate
    ? form.assemblyDate.includes("T")
      ? new Date(new Date(form.assemblyDate).getTime() + 3 * 3600000).toISOString()
      : `${form.assemblyDate}T15:00:00.000Z`
    : new Date().toISOString();

  const dismantleDateStr = form.dismantleDate
    ? form.dismantleDate.includes("T")
      ? new Date(form.dismantleDate).toISOString()
      : `${form.dismantleDate}T23:59:59.000Z`
    : form.eventDate
      ? form.eventDate.includes("T")
        ? new Date(new Date(form.eventDate).getTime() + 6 * 3600000).toISOString()
        : `${form.eventDate}T23:59:00.000Z`
      : new Date().toISOString();

  const screenSize = form.size !== "" && form.size != null ? Number(form.size) : undefined;
  const hasValidSize = screenSize !== undefined && Number.isFinite(screenSize) && screenSize >= 0;
  const arrangementText = String(
    form.arrangement ?? form.itemServiceSpec ?? "",
  ).trim();

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
    notes: form.notes || "",
    customFields: normalizeCustomFieldPayload(form.customValues || form.customFields || {}),
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

  const booking = await client.post<RawBooking>("/api/bookings", bookingPayload);

  return mapBackendBookingToFrontend(booking);
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
  bookingId: string,
): Promise<AllowedTransitionsResponse> {
  return client.get<AllowedTransitionsResponse>(`/api/bookings/${bookingId}/allowed-transitions`);
}

export async function transitionBookingStatusApi(
  bookingId: string,
  toStatus: BookingStatus,
  reason?: string,
  override = false,
): Promise<void> {
  await client.post(`/api/bookings/${bookingId}/transition`, {
    toStatus,
    reason: reason || `Transitioning to ${toStatus}`,
    override,
  });
}

export async function recordBookingPaymentApi(
  bookingId: string,
  toStatus: "advance" | "fully_paid",
  amount: number,
): Promise<void> {
  await client.post(`/api/bookings/${bookingId}/payment`, { toStatus, amount: String(amount) });
}

export interface PaymentSummary {
  paid: number;
  total: number | null;
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

export async function updateBookingApi(
  bookingId: string,
  payload: Record<string, unknown>,
): Promise<RawBooking> {
  return client.patch(`/api/bookings/${bookingId}`, payload);
}

export async function updateCustomerApi(
  customerId: string,
  payload: { name?: string; phone?: string; notes?: string },
): Promise<RawPerson> {
  return client.patch(`/api/customers/${customerId}`, payload);
}

/** Mirrors web's useBookingActions confirmBookingWithPayment: pricing patch, then payment, then transition to CONFIRMED. */
export async function confirmBookingWithPaymentApi(
  booking: Booking,
  args: {
    toPaymentStatus: "advance" | "fully_paid";
    amount: number;
    totalAmount: number;
    pricingDailyRate: number;
    pricingRentedDays: number;
    pricingScreenSize: number;
  },
): Promise<void> {
  const {
    toPaymentStatus,
    amount,
    totalAmount,
    pricingDailyRate,
    pricingRentedDays,
    pricingScreenSize,
  } = args;

  const pricingUpdate: Record<string, unknown> = {};
  if (pricingDailyRate > 0) pricingUpdate.dailyRate = String(pricingDailyRate);
  if (pricingRentedDays > 0) pricingUpdate.rentedDays = pricingRentedDays;
  if (pricingScreenSize > 0) pricingUpdate.screenAreaSqm = String(pricingScreenSize);
  if (Object.keys(pricingUpdate).length > 0) {
    await updateBookingApi(booking.id, pricingUpdate);
  }

  const needsNewPayment =
    booking.payment === "UNPAID" ||
    (booking.payment === "ADVANCE" && toPaymentStatus === "fully_paid");

  if (needsNewPayment) {
    await recordBookingPaymentApi(
      booking.id,
      toPaymentStatus,
      toPaymentStatus === "fully_paid" ? totalAmount : amount,
    );
  }

  await transitionBookingStatusApi(booking.id, "CONFIRMED");
}

export async function createAssignmentApi(
  bookingId: string,
  payload: { userId: string; roleContext: string; isTeamLead?: boolean; phase?: string },
): Promise<void> {
  await client.post(`/api/bookings/${bookingId}/assignments`, payload);
}

export async function getBookingAssignmentsApi(bookingId: string): Promise<RawAssignment[]> {
  const data = await client.get<RawAssignment[]>(`/api/bookings/${bookingId}/assignments`);
  return data || [];
}

export async function deleteAssignmentApi(assignmentId: string): Promise<void> {
  return client.delete(`/api/assignments/${assignmentId}`);
}

export async function acceptAssignmentApi(assignmentId: string): Promise<void> {
  return client.patch(`/api/assignments/${assignmentId}/accept`, {});
}

export async function declineAssignmentApi(assignmentId: string, reason: string): Promise<void> {
  return client.patch(`/api/assignments/${assignmentId}/decline`, { declineReason: reason });
}

export async function getBookingBomLinesApi(bookingId: string): Promise<RawBomLine[]> {
  const data = await client.get<RawBomLine[] | { lines?: RawBomLine[] }>(
    `/api/bookings/${bookingId}/bom/lines`,
  );
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.lines)) return data.lines;
  return [];
}

export async function createBomLineApi(
  bookingId: string,
  payload: { itemId?: string; poolId?: string; quantity: string; acceptedShortfall?: boolean },
): Promise<RawBomLine> {
  return client.post<RawBomLine>(`/api/bookings/${bookingId}/bom/lines`, payload);
}

export async function updateBomLineApi(
  bookingId: string,
  lineId: string,
  payload: { quantity?: string; acceptedShortfall?: boolean },
): Promise<RawBomLine> {
  return client.patch<RawBomLine>(`/api/bookings/${bookingId}/bom/lines/${lineId}`, payload);
}

export async function deleteBomLineApi(bookingId: string, lineId: string): Promise<void> {
  return client.delete(`/api/bookings/${bookingId}/bom/lines/${lineId}`);
}

export async function createHandoffSnapshotApi(bookingId: string): Promise<void> {
  await client.post(`/api/bookings/${bookingId}/bom/snapshots`, { kind: "HANDOFF" });
}

export interface BookingSnapshotLine {
  id: string;
  poolId?: string;
  itemId?: string;
  name?: string;
  quantity?: string | number;
  item?: { name?: string };
  pool?: { name?: string };
}

export interface BookingSnapshot {
  id: string;
  kind: string;
  createdAt: string;
  lines: BookingSnapshotLine[];
}

export async function getBookingSnapshotsApi(
  bookingId: string,
  params?: { kind?: string },
): Promise<BookingSnapshot[]> {
  const query = params?.kind ? `?kind=${encodeURIComponent(params.kind)}` : "";
  return client.get<BookingSnapshot[]>(`/api/bookings/${bookingId}/bom/snapshots${query}`);
}

export async function checkoutReverseApi(bookingId: string, reason: string): Promise<void> {
  await client.post(`/api/bookings/${bookingId}/checkout-reverse`, { reason });
}

export interface BookingReservation {
  id: string;
  poolId?: string;
  itemId?: string;
  quantity?: string;
}

export async function getBookingReservationsApi(
  bookingId: string,
): Promise<{ reservations: BookingReservation[] }> {
  const res = await client.get<BookingReservation[] | { reservations?: BookingReservation[] }>(
    `/api/bookings/${bookingId}/reservations?active=true`,
  );
  if (Array.isArray(res)) return { reservations: res };
  return { reservations: res?.reservations ?? [] };
}

export async function createReservationApi(
  bookingId: string,
  payload: { poolId?: string; itemId?: string; quantity?: string },
): Promise<BookingReservation> {
  return client.post(`/api/bookings/${bookingId}/reservations`, payload);
}

/** Atomically replace pool holds — supports HARD locks after confirm. */
export async function replacePoolReservationsApi(
  bookingId: string,
  lines: Array<{ poolId: string; quantity: string }>,
): Promise<{ holdType: string; count: number; reservations: BookingReservation[] }> {
  return client.post(`/api/bookings/${bookingId}/reservations/replace`, { lines });
}

export async function deleteReservationApi(bookingId: string, id: string): Promise<void> {
  return client.delete(`/api/bookings/${bookingId}/reservations/${id}`);
}
