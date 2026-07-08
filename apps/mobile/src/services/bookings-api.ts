import { client } from "@/lib/api/client";
import type { Booking, BomItem, BookingStatus, PaymentStatus, ScreenType } from "@/types/domain";

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
  isTeamLead?: boolean;
  roleContext?: string;
  user?: RawPerson;
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
  rentedDays?: number;
  paymentStatus?: string;
  paymentAmount?: string;
  amount?: string;
  mealProvision?: string;
  notes?: string;
  createdAt?: string;
  customer?: RawPerson;
  driver?: RawPerson;
  bomLines?: RawBomLine[];
  assignments?: RawAssignment[];
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
  const size = parseFloat(specParts[1]) || b.rentedDays || 0;
  const arrangement = specParts[2] || b.itemServiceSpec || "Standard layout";

  return {
    code: b.bookingCode || b.id,
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
    assignees,
    stageHand,
    status: (b.status || "RESERVED") as BookingStatus,
    payment,
    amount: parseFloat(b.paymentAmount || b.amount || "0"),
    ctoNotes: b.notes || "",
    bomItems,
    teamLeader,
    driver,
    mealBudget,
    createdAt: b.createdAt ? b.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export async function getBookingsApi(): Promise<Booking[]> {
  const data = await client.get<RawBooking[]>("/bookings");
  return (data || []).map(mapBackendBookingToFrontend);
}

export async function getBookingDetailApi(id: string): Promise<Booking> {
  const b = await client.get<RawBooking>(`/bookings/${id}`);
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
}): Promise<Booking> {
  const customer = await client.post<{ id: string }>("/customers", {
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
    itemServiceType: "Rental",
    notes: form.ctoNotes || "",
  };

  const booking = await client.post<RawBooking>("/bookings", bookingPayload);

  if (form.amount && form.amount > 0) {
    try {
      await client.post(`/bookings/${booking.id}/payment`, {
        toStatus: form.paymentTerms === "PAID" ? "fully_paid" : "advance",
        amount: String(form.amount),
      });
    } catch (e) {
      console.error("Failed to record initial booking payment", e);
    }
  }

  return mapBackendBookingToFrontend(booking);
}

export async function transitionBookingStatusApi(
  bookingId: string,
  toStatus: BookingStatus,
  reason?: string,
): Promise<void> {
  await client.post(`/bookings/${bookingId}/transition`, {
    toStatus,
    reason: reason || `Transitioning to ${toStatus}`,
  });
}

export async function recordBookingPaymentApi(
  bookingId: string,
  toStatus: "advance" | "fully_paid",
  amount: number,
): Promise<void> {
  await client.post(`/bookings/${bookingId}/payment`, { toStatus, amount: String(amount) });
}

export async function createAssignmentApi(
  bookingId: string,
  payload: { userId: string; roleContext: string; isTeamLead?: boolean; phase?: string },
): Promise<void> {
  await client.post(`/bookings/${bookingId}/assignments`, payload);
}
