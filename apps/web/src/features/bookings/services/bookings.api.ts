export type BookingStatus =
  | "RESERVED" | "CONFIRMED" | "ASSIGNED" | "ACCEPTED"
  | "PREPARATION" | "ONSITE" | "COMPLETED" | "DONE"
  | "CANCELED" | "PARTIALLY_RETURNED";

export type PaymentStatus = "PAID" | "ADVANCE" | "UNPAID";

export type ScreenType = "P2.97" | "P4" | "P5" | "P2.97-New" | "P3.91 INDOOR" | "P3.91 OUTDOOR";

export interface BomItem {
  id: string;
  name: string;
  qty: number;
  status: "Reserved" | "Checked Out" | "Returned";
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
  venue: string;
  screenType: ScreenType;
  size: number;
  arrangement: string;
  assignees: string[];
  stageHand: string;
  status: BookingStatus;
  payment: PaymentStatus;
  amount: number;
  ctoNotes: string;
  bomItems: BomItem[];
  teamLeader: string;
  driver: string;
  driverUserId?: string;
  mealBudget: number;
  createdAt: string;
  statusHistory?: StatusHistoryItem[];
  itemServiceSpec?: string;
  assignments?: any[];
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
  return [
    { id: `PNL-${screenType.replace(/\s/g, "").replace(".", "")}-${String(idx).padStart(2, "0")}`, name: `${screenType} Panel`, qty: size, status: statusPick(0) },
    { id: `PSU-${10 + idx}`, name: "Power Supply Unit", qty: Math.ceil(size / 10), status: statusPick(1) },
    { id: `PRC-${idx % 2 === 0 ? "NVX" : "BRM"}-${String(idx).padStart(2, "0")}`, name: idx % 2 === 0 ? "Novastar VX1000" : "Brompton Tessera S8", qty: 1, status: statusPick(2) },
    { id: `TRS-2M-${String(idx).padStart(2, "0")}`, name: "Truss Segment 2m", qty: Math.ceil(size / 6), status: statusPick(3) },
    { id: `CBL-HDM-${String(idx).padStart(2, "0")}`, name: "HDMI 4K Cable 15m", qty: 2, status: statusPick(4) },
    { id: `CBL-PWR-${String(idx).padStart(2, "0")}`, name: "Power Cable 30A", qty: Math.ceil(size / 8), status: statusPick(5) },
  ];
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

function mapBackendBookingToFrontend(b: any): Booking {
  const customerName = b.customer?.name || "Client";
  const customerPhone = b.customer?.phone || "";
  
  // Format BOM items
  const bomItems: BomItem[] = (b.bomLines || []).map((line: any) => {
    return {
      id: line.id,
      name: line.item?.name || line.pool?.name || "Equipment Line",
      qty: parseFloat(line.quantity),
      status: line.acceptedShortfall ? "Checked Out" : "Reserved",
    };
  });

  // Extract assignees
  const assignees = (b.assignments || []).map((a: any) => a.user?.name).filter(Boolean);
  
  // Extract team lead, driver, stagehands dynamically
  const leadAssignee = (b.assignments || []).find((a: any) => a.isTeamLead);
  const teamLeader = leadAssignee?.user?.name || "";

  const crewNames = (b.assignments || [])
    .filter((a: any) => a.roleContext === "CREW")
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

  // Parse screen spec fields dynamically from the database itemServiceSpec
  const specParts = b.itemServiceSpec ? b.itemServiceSpec.split(" - ") : [];
  const screenType = (specParts[0] || "P3.91 OUTDOOR") as ScreenType;
  const size = parseFloat(specParts[1]) || b.rentedDays || 0;
  const arrangement = specParts[2] || b.itemServiceSpec || "Standard layout";

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
    assemblyDate: b.assemblyStart ? b.assemblyStart.slice(0, 10) : "",
    eventDate: b.eventDate ? b.eventDate.slice(0, 10) : "",
    dismantleDate: b.disassemblyEnd ? b.disassemblyEnd.slice(0, 10) : "",
    venue: b.eventLocation || "",
    screenType,
    size,
    arrangement,
    assignees: assignees,
    stageHand,
    status: (b.status || "RESERVED") as BookingStatus,
    payment,
    amount: parseFloat(b.paymentAmount || b.amount || "0"),
    ctoNotes: b.ctoConsultationNotes || "",
    bomItems: bomItems,
    teamLeader: teamLeader,
    driver,
    driverUserId: b.driverUserId || "",
    mealBudget,
    createdAt: b.createdAt ? b.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    statusHistory,
    itemServiceSpec: b.itemServiceSpec || "",
    assignments: b.assignments || [],
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
  const eventDateStr = `${form.eventDate || new Date().toISOString().slice(0, 10)}T18:00:00.000Z`;
  const assemblyStartStr = `${form.assemblyDate || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`;
  const assemblyEndStr = `${form.assemblyDate || new Date().toISOString().slice(0, 10)}T15:00:00.000Z`;
  const dismantleDateStr = form.dismantleDate ? `${form.dismantleDate}T23:59:59.000Z` : `${form.eventDate || new Date().toISOString().slice(0, 10)}T23:59:00.000Z`;

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
    itemServiceSpec: form.itemServiceSpec || `${form.screenType || "P4"} - ${form.size || 0}sqm - ${form.arrangement || "standard"}`,
    itemServiceType: "Rental",
    notes: form.notes || form.ctoNotes || "",
  };

  // 3. Create booking
  const booking = await client.post<any>("/api/bookings", bookingPayload);

  // 4. Record initial payment if amount is set
  if (form.amount > 0) {
    try {
      await client.post(`/api/bookings/${booking.id}/payment`, {
        toStatus: form.paymentTerms === "PAID" ? "fully_paid" : "advance",
        amount: String(form.amount),
      });
    } catch (e) {
      console.error("Failed to record initial booking payment", e);
    }
  }

  return booking;
}

export async function transitionBookingStatusApi(bookingId: string, toStatus: BookingStatus, reason?: string, override = false): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/transition`, {
    toStatus,
    reason: reason || `Transitioning to ${toStatus}`,
    override,
  });
}

export async function recordBookingPaymentApi(bookingId: string, toStatus: string, amount: number): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/payment`, {
    toStatus, // 'advance' or 'fully_paid'
    amount: String(amount),
  });
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

export async function createDamageReportApi(payload: { bookingId: string; description: string; severity: string }): Promise<any> {
  return client.post("/api/damage-reports", payload);
}

export async function submitEvaluationApi(bookingId: string, payload: any): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/evaluation`, payload);
}

