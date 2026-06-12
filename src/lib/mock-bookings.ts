export type BookingStatus =
  | "RESERVED" | "CONFIRMED" | "ASSIGNED" | "ACCEPTED"
  | "PREPARATION" | "ONSITE" | "COMPLETED" | "DONE";

export type PaymentStatus = "PAID" | "ADVANCE" | "UNPAID";

export type ScreenType = "P2.97" | "P4" | "P5" | "P2.97-New" | "P3.91 INDOOR" | "P3.91 OUTDOOR";

export interface Booking {
  code: string;
  client: string;
  contactPerson: string;
  contactPhone: string;
  assemblyDate: string;
  eventDate: string;
  venue: string;
  screenType: ScreenType;
  size: number;
  arrangement: string;
  assignees: string[];
  stageHand: string;
  status: BookingStatus;
  payment: PaymentStatus;
  amount: number;
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

function pick<T>(a: T[], i: number) { return a[i % a.length]; }

export const MOCK_BOOKINGS: Booking[] = Array.from({ length: 28 }).map((_, i) => {
  const d = new Date(2026, 5, 1 + i);
  const e = new Date(2026, 5, 3 + i);
  return {
    code: `SB${String(20 + i).padStart(3, "0")}`,
    client: pick(clients, i),
    contactPerson: pick(["Mr. Bekele","Ms. Tigist","Mr. Yonas","Ms. Mahlet","Mr. Robel"], i),
    contactPhone: `+251 9${10 + i} ${100 + i} ${i}34`,
    assemblyDate: d.toISOString().slice(0, 10),
    eventDate: e.toISOString().slice(0, 10),
    venue: pick(venues, i),
    screenType: pick(types, i),
    size: [24, 36, 48, 60, 72][i % 5],
    arrangement: `${4 + (i % 6)}M x ${3 + (i % 3)}M`,
    assignees: [pick(people, i), pick(people, i + 3)],
    stageHand: pick(teams, i),
    status: pick(statuses, i),
    payment: pick(payments, i),
    amount: 25000 + (i % 8) * 12500,
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
