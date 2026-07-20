import { client } from "@/lib/api/client";
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
  name?: string;
  phone?: string;
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
  user?: RawPerson & { id?: string };
}

interface RawBooking {
  id: string;
  bookingCode?: string;
  status?: string;
  eventDate?: string;
  eventLocation?: string;
  assemblyStart?: string;
  disassemblyEnd?: string;
  itemServiceSpec?: string;
  screenAreaSqm?: number;
  rentedDays?: number;
  rentalStart?: string;
  rentalEnd?: string;
  paymentStatus?: string;
  paymentAmount?: string | number;
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

function mapBackendBookingToFrontend(b: RawBooking): Booking {
  const customerName = b.customer?.name || "Client";
  const customerPhone = b.customer?.phone || "";

  const bomItems: BomItem[] = (b.bomLines || []).map((line) => ({
    id: line.id,
    name: line.item?.name || line.pool?.name || "Equipment Line",
    qty: parseFloat(line.quantity),
    status: line.acceptedShortfall ? "Checked Out" : "Reserved",
    poolId: line.poolId || undefined,
    itemId: line.itemId || undefined,
  }));

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

  const specParts = b.itemServiceSpec ? b.itemServiceSpec.split(" - ") : [];
  const screenType = (specParts[0] || "P3.91 OUTDOOR") as ScreenType;
  const parsedSpecSize = Number.parseFloat(specParts[1] || "");
  const screenAreaSqm = Number(b.screenAreaSqm);
  const size = Number.isFinite(screenAreaSqm)
    ? screenAreaSqm
    : Number.isFinite(parsedSpecSize)
      ? parsedSpecSize
      : b.rentedDays || 0;
  const arrangement = specParts[2] || b.itemServiceSpec || "Standard layout";

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
    user: a.user?.id ? { id: a.user.id, name: a.user.name || "" } : undefined,
  }));

  return {
    id: b.id,
    code: b.bookingCode || b.id,
    client: customerName,
    contactPerson: customerName,
    contactPhone: customerPhone,
    assemblyDate: b.assemblyStart ? b.assemblyStart.slice(0, 10) : "",
    eventDate: b.eventDate ? b.eventDate.slice(0, 10) : "",
    dismantleDate: b.disassemblyEnd ? b.disassemblyEnd.slice(0, 10) : "",
    rentalStart: b.rentalStart || b.assemblyStart || b.eventDate || "",
    rentalEnd: b.rentalEnd || b.disassemblyEnd || b.eventDate || "",
    venue: b.eventLocation || "",
    screenType,
    size,
    arrangement,
    assignees,
    stageHand,
    status: (b.status || "RESERVED") as BookingStatus,
    payment,
    amount: paymentAmountNum || parseFloat(b.amount || "0"),
    paymentAmount: Number.isFinite(paymentAmountNum) ? paymentAmountNum : undefined,
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
  const data = await client.get<RawBooking[]>("/api/bookings");
  return (data || []).map(mapBackendBookingToFrontend);
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
  screenType?: string;
  size?: number;
  arrangement?: string;
  amount?: number;
  paymentTerms?: "UNPAID" | "ADVANCE" | "PAID";
  ctoNotes?: string;
  customValues?: Record<string, unknown>;
}): Promise<Booking> {
  const customer = await client.post<{ id: string }>("/api/customers", {
    name: form.client,
    phone: form.contactPhone || "+251 900 000 000",
    notes: form.contactPerson || "Client contact",
  });

  const eventDateStr = `${form.eventDate || new Date().toISOString().slice(0, 10)}T18:00:00.000Z`;
  const assemblyStartStr = `${form.assemblyDate || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`;
  const assemblyEndStr = `${form.assemblyDate || new Date().toISOString().slice(0, 10)}T15:00:00.000Z`;
  const dismantleDateStr = form.dismantleDate
    ? `${form.dismantleDate}T23:59:59.000Z`
    : `${form.eventDate || new Date().toISOString().slice(0, 10)}T23:59:00.000Z`;

  const bookingPayload = {
    customerId: customer.id,
    eventDate: eventDateStr,
    eventLocation: form.venue || "TBD",
    deliveryDate: assemblyStartStr,
    rentalStart: eventDateStr,
    rentalEnd: dismantleDateStr,
    rentedDays: 1,
    assemblyStart: assemblyStartStr,
    assemblyEnd: assemblyEndStr,
    disassemblyStart: dismantleDateStr,
    disassemblyEnd: dismantleDateStr,
    itemServiceSpec: `${form.screenType || "P4"} - ${form.size || 0}sqm - ${form.arrangement || "standard"}`,
    screenAreaSqm: Number(form.size) >= 0 ? Number(form.size) : 0,
    itemServiceType: "Rental",
    notes: form.ctoNotes || "",
    customFields: form.customValues || {},
  };

  const booking = await client.post<RawBooking>("/api/bookings", bookingPayload);

  if (form.amount && form.amount > 0) {
    try {
      await client.post(`/api/bookings/${booking.id}/payment`, {
        toStatus: form.paymentTerms === "PAID" ? "fully_paid" : "advance",
        amount: String(form.amount),
      });
    } catch (e) {
      console.error("Failed to record initial booking payment", e);
    }
  }

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

/**
 * Honest payment figures from the fields the API actually exposes (`payment`
 * status + `paymentAmount`) — no `/2` guessing. Mirrors web's getPaymentSummary.
 */
export function getPaymentSummary(b: Booking): PaymentSummary {
  const recorded = b.paymentAmount ?? b.amount ?? 0;
  if (b.payment === "PAID") {
    return { paid: recorded, total: recorded, remaining: 0 };
  }
  if (b.payment === "ADVANCE") {
    return { paid: recorded, total: null, remaining: null };
  }
  return { paid: 0, total: null, remaining: null };
}

export async function updateBookingApi(
  bookingId: string,
  payload: Record<string, unknown>,
): Promise<RawBooking> {
  return client.patch(`/api/bookings/${bookingId}`, payload);
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
  const data = await client.get<RawBomLine[]>(`/api/bookings/${bookingId}/bom/lines`);
  return data || [];
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
  quantity?: string;
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

export async function getBookingReservationsApi(bookingId: string): Promise<BookingReservation[]> {
  return client.get(`/api/bookings/${bookingId}/reservations`);
}

export async function createReservationApi(
  bookingId: string,
  payload: { poolId?: string; itemId?: string; quantity?: string },
): Promise<BookingReservation> {
  return client.post(`/api/bookings/${bookingId}/reservations`, payload);
}

export async function deleteReservationApi(bookingId: string, id: string): Promise<void> {
  return client.delete(`/api/bookings/${bookingId}/reservations/${id}`);
}
