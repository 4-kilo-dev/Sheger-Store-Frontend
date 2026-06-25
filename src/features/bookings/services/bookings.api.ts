export type BookingStatus =
  | "RESERVED" | "CONFIRMED" | "ASSIGNED" | "ACCEPTED"
  | "PREPARATION" | "ONSITE" | "COMPLETED" | "DONE";

export type PaymentStatus = "PAID" | "ADVANCE" | "UNPAID";

export type ScreenType = "P2.97" | "P4" | "P5" | "P2.97-New" | "P3.91 INDOOR" | "P3.91 OUTDOOR";

export interface BomItem {
  id: string;
  name: string;
  qty: number;
  status: "Reserved" | "Checked Out" | "Returned";
}

export interface Booking {
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
  mealBudget: number;
  createdAt: string;
}

const clients = [
  "Sheraton Addis", "Hyatt Regency", "Skylight Hotel", "Millennium Hall",
  "Inter Luxury Hotel", "Radisson Blu", "Hilton Addis", "Capital Hotel",
  "Ethiopian Skylight", "Friendship Square", "AAU Main Hall", "ECA Hall",
];
const venues = [
  "Millennium Hall", "Sheraton Ballroom", "Hyatt Lawn", "Skylight Hall A",
  "Exhibition Center", "Friendship Park", "ECA Conference Hall",
];
const people = ["Nathan", "Yeabtsega", "Bereket", "Samuel", "Hanna", "Eyob", "Selam", "Dawit"];
const teams = ["TEAM 1 · Abel", "TEAM 2 · Mesfin", "TEAM 3 · Henok", "TEAM 4 · Solomon", "TEAM 5 · Tewodros"];
const types: ScreenType[] = ["P2.97", "P4", "P5", "P2.97-New", "P3.91 INDOOR", "P3.91 OUTDOOR"];
const statuses: BookingStatus[] = ["RESERVED","CONFIRMED","ASSIGNED","ACCEPTED","PREPARATION","ONSITE","COMPLETED","DONE"];
const payments: PaymentStatus[] = ["PAID","ADVANCE","UNPAID"];
const drivers = ["Abebe G.", "Tadesse M.", "Kebede F.", "Girma S.", "Tekle W."];
const ctoNotesPool = [
  "Client prefers 2-stack horizontal. P2.97 available. Rigging truss required.",
  "Standard single wall. P4 recommended for outdoor use. Backup PSU on standby.",
  "Triple-wide arrangement. P3.91 Indoor confirmed. HDMI to SDI converter needed.",
  "Ground-stack on stage. Client requests test run at 4PM. Extra data cables.",
  "Hanging rig required. Confirm venue ceiling load capacity before arrival.",
  "Side-by-side dual screens. P2.97-New selected. NovaStar VX1000 processor.",
];

function pick<T>(a: T[], i: number) { return a[i % a.length]; }

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

export const MOCK_BOOKINGS: Booking[] = Array.from({ length: 28 }).map((_, i) => {
  const d = new Date(2026, 5, 1 + i);
  const e = new Date(2026, 5, 3 + i);
  const dis = new Date(2026, 5, 4 + i);
  const created = new Date(2026, 4, 20 + (i % 10));
  const size = [24, 36, 48, 60, 72][i % 5];
  return {
    code: `SB${String(20 + i).padStart(3, "0")}`,
    client: pick(clients, i),
    contactPerson: pick(["Mr. Bekele","Ms. Tigist","Mr. Yonas","Ms. Mahlet","Mr. Robel"], i),
    contactPhone: `+251 9${10 + i} ${100 + i} ${i}34`,
    assemblyDate: d.toISOString().slice(0, 10),
    eventDate: e.toISOString().slice(0, 10),
    dismantleDate: dis.toISOString().slice(0, 10),
    venue: pick(venues, i),
    screenType: pick(types, i),
    size,
    arrangement: `${4 + (i % 6)}M x ${3 + (i % 3)}M`,
    assignees: [pick(people, i), pick(people, i + 3)],
    stageHand: pick(teams, i),
    status: pick(statuses, i),
    payment: pick(payments, i),
    amount: 25000 + (i % 8) * 12500,
    ctoNotes: pick(ctoNotesPool, i),
    bomItems: makeBom(pick(types, i), size, i),
    teamLeader: pick(people, i + 2),
    driver: pick(drivers, i),
    mealBudget: [1500, 2000, 2500, 3000][i % 4],
    createdAt: created.toISOString().slice(0, 10),
  };
});

export const STATUS_LABELS: Record<BookingStatus, string> = {
  RESERVED: "Reserved", CONFIRMED: "Confirmed", ASSIGNED: "Assigned",
  ACCEPTED: "Accepted", PREPARATION: "Preparation", ONSITE: "Onsite",
  COMPLETED: "Completed", DONE: "Done",
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
  
  // Extract team lead & driver
  const leadAssignee = (b.assignments || []).find((a: any) => a.isTeamLead);
  const teamLeader = leadAssignee?.user?.name || "";

  return {
    code: b.id, // Backend uses UUID. Map ID to code
    client: customerName,
    contactPerson: customerName,
    contactPhone: customerPhone,
    assemblyDate: b.assemblyStart ? b.assemblyStart.slice(0, 10) : "",
    eventDate: b.eventDate ? b.eventDate.slice(0, 10) : "",
    dismantleDate: b.disassemblyEnd ? b.disassemblyEnd.slice(0, 10) : "",
    venue: b.eventLocation || "",
    screenType: b.itemServiceSpec?.includes("Panel") ? "P2.97" : "P4", // Helper fallback
    size: b.rentedDays || 24,
    arrangement: b.itemServiceSpec || "Standard layout",
    assignees: assignees.length > 0 ? assignees : ["Bereket", "Nathan"],
    stageHand: "TEAM 1 · Abel",
    status: (b.status || "RESERVED") as BookingStatus,
    payment: (b.paymentStatus || "UNPAID") as PaymentStatus,
    amount: parseFloat(b.amount || "0") || 75000,
    ctoNotes: b.notes || "",
    bomItems: bomItems,
    teamLeader: teamLeader || "Bereket",
    driver: "Abebe G.",
    mealBudget: 2000,
    createdAt: b.createdAt ? b.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

export async function getBookingsApi(): Promise<Booking[]> {
  try {
    const data = await client.get<any[]>("/api/bookings");
    if (!data || data.length === 0) {
      return MOCK_BOOKINGS;
    }
    return data.map((b) => mapBackendBookingToFrontend(b));
  } catch (error) {
    console.warn("Failed to fetch bookings from backend, falling back to mock data.", error);
    return MOCK_BOOKINGS;
  }
}

export async function getBookingDetailApi(id: string): Promise<Booking> {
  // If the id matches a mock booking code, return that mock booking to allow side-by-side testing
  const mockMatch = MOCK_BOOKINGS.find((m) => m.code === id);
  if (mockMatch) return mockMatch;

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
  const dismantleDateStr = form.dismantleDate ? `${form.dismantleDate}T00:00:00.000Z` : `${form.eventDate || new Date().toISOString().slice(0, 10)}T23:59:00.000Z`;

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
    itemServiceSpec: `${form.screenType} - ${form.size}sqm - ${form.arrangement || "standard"}`,
    itemServiceType: "Rental",
    notes: form.ctoNotes || "",
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

