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
