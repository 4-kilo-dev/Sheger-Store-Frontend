import type {
  BomItem,
  Booking,
  BookingStatus,
  InventoryItem,
  Notification,
  PaymentStatus,
  Profile,
  ScreenType,
  StaffMember,
} from "@/types/domain";

const clients = [
  "Sheraton Addis",
  "Hyatt Regency",
  "Skylight Hotel",
  "Millennium Hall",
  "Inter Luxury Hotel",
  "Radisson Blu",
  "Hilton Addis",
  "Capital Hotel",
  "Ethiopian Skylight",
  "Friendship Square",
  "AAU Main Hall",
  "ECA Hall",
];

const venues = [
  "Millennium Hall",
  "Sheraton Ballroom",
  "Hyatt Lawn",
  "Skylight Hall A",
  "Exhibition Center",
  "Friendship Park",
  "ECA Conference Hall",
];

const people = ["Nathan", "Yeabtsega", "Bereket", "Samuel", "Hanna", "Eyob", "Selam", "Dawit"];
const teams = ["TEAM 1 · Abel", "TEAM 2 · Mesfin", "TEAM 3 · Henok", "TEAM 4 · Solomon", "TEAM 5 · Tewodros"];
const types: ScreenType[] = ["P2.97", "P4", "P5", "P2.97-New", "P3.91 INDOOR", "P3.91 OUTDOOR"];
const statuses: BookingStatus[] = [
  "RESERVED",
  "CONFIRMED",
  "ASSIGNED",
  "ACCEPTED",
  "PREPARATION",
  "ONSITE",
  "COMPLETED",
  "DONE",
];
const payments: PaymentStatus[] = ["PAID", "ADVANCE", "UNPAID"];
const drivers = ["Abebe G.", "Tadesse M.", "Kebede F.", "Girma S.", "Tekle W."];
const ctoNotesPool = [
  "Client prefers 2-stack horizontal. P2.97 available. Rigging truss required.",
  "Standard single wall. P4 recommended for outdoor use. Backup PSU on standby.",
  "Triple-wide arrangement. P3.91 Indoor confirmed. HDMI to SDI converter needed.",
  "Ground-stack on stage. Client requests test run at 4PM. Extra data cables.",
  "Hanging rig required. Confirm venue ceiling load capacity before arrival.",
  "Side-by-side dual screens. P2.97-New selected. NovaStar VX1000 processor.",
];

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function makeBom(screenType: ScreenType, size: number, index: number): BomItem[] {
  const statusPick = (itemIndex: number): BomItem["status"] =>
    index >= 5 ? (itemIndex < 2 ? "Checked Out" : "Reserved") : index >= 7 ? "Returned" : "Reserved";
  return [
    {
      id: `PNL-${screenType.replace(/\s/g, "").replace(".", "")}-${String(index).padStart(2, "0")}`,
      name: `${screenType} Panel`,
      qty: size,
      status: statusPick(0),
    },
    { id: `PSU-${10 + index}`, name: "Power Supply Unit", qty: Math.ceil(size / 10), status: statusPick(1) },
    {
      id: `PRC-${index % 2 === 0 ? "NVX" : "BRM"}-${String(index).padStart(2, "0")}`,
      name: index % 2 === 0 ? "Novastar VX1000" : "Brompton Tessera S8",
      qty: 1,
      status: statusPick(2),
    },
    { id: `TRS-2M-${String(index).padStart(2, "0")}`, name: "Truss Segment 2m", qty: Math.ceil(size / 6), status: statusPick(3) },
    { id: `CBL-HDM-${String(index).padStart(2, "0")}`, name: "HDMI 4K Cable 15m", qty: 2, status: statusPick(4) },
    { id: `CBL-PWR-${String(index).padStart(2, "0")}`, name: "Power Cable 30A", qty: Math.ceil(size / 8), status: statusPick(5) },
  ];
}

export const BOOKINGS: Booking[] = Array.from({ length: 28 }).map((_, index) => {
  const assembly = new Date(2026, 5, 1 + index);
  const event = new Date(2026, 5, 3 + index);
  const dismantle = new Date(2026, 5, 4 + index);
  const created = new Date(2026, 4, 20 + (index % 10));
  const size = [24, 36, 48, 60, 72][index % 5];
  return {
    code: `SB${String(20 + index).padStart(3, "0")}`,
    client: pick(clients, index),
    contactPerson: pick(["Mr. Bekele", "Ms. Tigist", "Mr. Yonas", "Ms. Mahlet", "Mr. Robel"], index),
    contactPhone: `+251 9${10 + index} ${100 + index} ${index}34`,
    assemblyDate: assembly.toISOString().slice(0, 10),
    eventDate: event.toISOString().slice(0, 10),
    dismantleDate: dismantle.toISOString().slice(0, 10),
    venue: pick(venues, index),
    screenType: pick(types, index),
    size,
    arrangement: `${4 + (index % 6)}M x ${3 + (index % 3)}M`,
    assignees: [pick(people, index), pick(people, index + 3)],
    stageHand: pick(teams, index),
    status: pick(statuses, index),
    payment: pick(payments, index),
    amount: 25000 + (index % 8) * 12500,
    ctoNotes: pick(ctoNotesPool, index),
    bomItems: makeBom(pick(types, index), size, index),
    teamLeader: pick(people, index + 2),
    driver: pick(drivers, index),
    mealBudget: [1500, 2000, 2500, 3000][index % 4],
    createdAt: created.toISOString().slice(0, 10),
  };
});

export const INVENTORY: InventoryItem[] = [
  { id: "PNL-P297-01", name: "P2.97 LED Panel", category: "LED Panels", model: "ROE Black Pearl 2V2", total: 192, available: 128, reserved: 48, onsite: 12, damaged: 4, condition: "GOOD", availability: "AVAILABLE", location: "Rack A1-A6", lastService: "2026-05-18", nextService: "2026-08-18" },
  { id: "PNL-P391-O", name: "P3.91 Outdoor Panel", category: "LED Panels", model: "Absen A3 Pro", total: 144, available: 72, reserved: 48, onsite: 20, damaged: 4, condition: "GOOD", availability: "RESERVED", location: "Rack B1-B5", lastService: "2026-05-22", nextService: "2026-08-22" },
  { id: "PNL-P4-02", name: "P4 LED Panel", category: "LED Panels", model: "Gloshine P4", total: 96, available: 20, reserved: 60, onsite: 14, damaged: 2, condition: "SERVICE DUE", availability: "RESERVED", location: "Rack C1-C4", lastService: "2026-02-10", nextService: "2026-06-10" },
  { id: "PRC-NVX-01", name: "Novastar Video Processor", category: "Processors", model: "NovaStar VX1000", total: 12, available: 7, reserved: 3, onsite: 2, damaged: 0, condition: "GOOD", availability: "AVAILABLE", location: "Secure Cabinet 1", lastService: "2026-04-12", nextService: "2026-10-12" },
  { id: "PRC-BRM-02", name: "Brompton Processor", category: "Processors", model: "Tessera S8", total: 6, available: 2, reserved: 2, onsite: 1, damaged: 1, condition: "DAMAGED", availability: "AVAILABLE", location: "Secure Cabinet 1", lastService: "2026-05-01", nextService: "2026-07-01" },
  { id: "PWR-32A-01", name: "32A Power Distributor", category: "Power", model: "VV PDU-32", total: 18, available: 9, reserved: 5, onsite: 3, damaged: 1, condition: "SERVICE DUE", availability: "AVAILABLE", location: "Electrical Bay", lastService: "2026-03-06", nextService: "2026-06-06" },
  { id: "TRS-2M-01", name: "2m Box Truss", category: "Rigging", model: "Global F34", total: 64, available: 32, reserved: 20, onsite: 12, damaged: 0, condition: "GOOD", availability: "ONSITE", location: "Rigging Zone", lastService: "2026-04-28", nextService: "2026-10-28" },
  { id: "CBL-SDI-15", name: "15m SDI Cable", category: "Cables", model: "Canare L-5CFB", total: 80, available: 49, reserved: 20, onsite: 8, damaged: 3, condition: "GOOD", availability: "AVAILABLE", location: "Cable Wall B", lastService: "2026-05-25", nextService: "2026-11-25" },
  { id: "GEN-45K-01", name: "45 kVA Generator", category: "Power", model: "Perkins P45", total: 3, available: 1, reserved: 1, onsite: 1, damaged: 0, condition: "SERVICE DUE", availability: "ONSITE", location: "Yard Bay 2", lastService: "2026-03-15", nextService: "2026-06-15" },
  { id: "AUD-MIX-01", name: "Digital Audio Mixer", category: "Audio", model: "Behringer X32", total: 5, available: 3, reserved: 1, onsite: 1, damaged: 0, condition: "GOOD", availability: "AVAILABLE", location: "Audio Cabinet", lastService: "2026-05-09", nextService: "2026-11-09" },
];

export const INVENTORY_CATEGORIES = ["All", "LED Panels", "Processors", "Power", "Rigging", "Cables", "Audio"] as const;

export const STAFF_ROLES = ["All", "Admin", "CCR", "Chief Technician", "Technician", "Operation Officer", "Storekeeper"] as const;

export const STAFF: StaffMember[] = [
  { name: "Nathan Berhanu", role: "Admin", team: "Operations", phone: "+251 911 204 611", status: "ACTIVE", jobs: 18, capacity: 25, initials: "NB", joinedDate: "2023-03-15" },
  { name: "Hanna Tesfaye", role: "CCR", team: "Client desk", phone: "+251 922 178 305", status: "ACTIVE", jobs: 31, capacity: 40, initials: "HT", joinedDate: "2023-06-01" },
  { name: "Bereket Alemu", role: "Chief Technician", team: "Technical", phone: "+251 933 401 822", status: "ONSITE", jobs: 24, capacity: 30, initials: "BA", joinedDate: "2022-09-10" },
  { name: "Samuel Tadesse", role: "Operation Officer", team: "Dispatch", phone: "+251 944 285 614", status: "ACTIVE", jobs: 21, capacity: 30, initials: "ST", joinedDate: "2023-01-20" },
  { name: "Dawit Mekonnen", role: "Technician", team: "Team 2", phone: "+251 955 660 110", status: "OFF DUTY", jobs: 14, capacity: 25, initials: "DM", joinedDate: "2024-02-14" },
  { name: "Selam Worku", role: "Storekeeper", team: "Warehouse", phone: "+251 966 314 207", status: "ACTIVE", jobs: 27, capacity: 35, initials: "SW", joinedDate: "2023-05-08" },
  { name: "Eyob Daniel", role: "Operation Officer", team: "Dispatch", phone: "+251 912 445 830", status: "ONSITE", jobs: 19, capacity: 30, initials: "ED", joinedDate: "2023-08-22" },
  { name: "Tigist Lemma", role: "CCR", team: "Client desk", phone: "+251 923 891 045", status: "ACTIVE", jobs: 28, capacity: 40, initials: "TL", joinedDate: "2024-01-05" },
  { name: "Yonas Kebede", role: "Technician", team: "Team 1", phone: "+251 934 678 211", status: "ACTIVE", jobs: 16, capacity: 25, initials: "YK", joinedDate: "2024-04-12" },
  { name: "Mahlet Girma", role: "Technician", team: "Team 3", phone: "+251 945 102 338", status: "ONSITE", jobs: 12, capacity: 25, initials: "MG", joinedDate: "2024-06-01" },
  { name: "Robel Hailu", role: "Chief Technician", team: "Technical", phone: "+251 956 230 440", status: "ACTIVE", jobs: 22, capacity: 30, initials: "RH", joinedDate: "2023-11-18" },
  { name: "Abel Teshome", role: "Storekeeper", team: "Warehouse", phone: "+251 967 543 120", status: "ACTIVE", jobs: 20, capacity: 35, initials: "AT", joinedDate: "2024-03-01" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "SB047 moved to Preparation", detail: "Bereket accepted the technical assignment and confirmed BOM requirements.", time: "4 min", type: "Booking", priority: "NORMAL", unread: true, linkTo: "/bookings/SB047", date: "Today" },
  { id: "n2", title: "P3.91 cabinet stock is critically low", detail: "Only 8 units remain available after reservations. Upcoming bookings may be affected.", time: "19 min", type: "Inventory", priority: "URGENT", unread: true, linkTo: "/inventory", date: "Today" },
  { id: "n3", title: "Damage report DR-018 requires review", detail: "Submitted by Team 2 from Skylight Hall. 3 P4 panels with cracked LED modules.", time: "1 hr", type: "Damage", priority: "URGENT", unread: true, linkTo: "/damage-report", date: "Today" },
  { id: "n4", title: "Payment received for SB041", detail: "75,000 ETB marked as paid via bank transfer by the CCR desk.", time: "3 hr", type: "Payment", priority: "NORMAL", unread: false, linkTo: "/bookings/SB041", date: "Today" },
  { id: "n5", title: "Assembly reminder: SB050", detail: "Assembly starts tomorrow at 08:00 at Millennium Hall. Truck MED-04 assigned.", time: "5 hr", type: "Schedule", priority: "NORMAL", unread: true, linkTo: "/bookings/SB050", date: "Today" },
  { id: "n6", title: "Overtime driver assigned", detail: "Abebe G. assigned as overtime driver for SB048 holiday deployment.", time: "6 hr", type: "Booking", priority: "LOW", unread: false, date: "Today" },
  { id: "n7", title: "BOM submitted for SB044", detail: "Yeabtsega submitted the Bill of Materials. 48 P2.97 panels, 5 PSUs, 1 NovaStar processor.", time: "Yesterday", type: "Booking", priority: "NORMAL", unread: false, linkTo: "/bookings/SB044", date: "Yesterday" },
  { id: "n8", title: "Material check-in completed", detail: "All items from SB039 returned and verified by Selam W. No damage reported.", time: "Yesterday", type: "Inventory", priority: "LOW", unread: false, date: "Yesterday" },
  { id: "n9", title: "Generator service overdue", detail: "GEN-45K-01 Perkins P45 was due for service on 2026-06-15. Schedule maintenance.", time: "2 days", type: "Inventory", priority: "URGENT", unread: false, linkTo: "/inventory/GEN-45K-01", date: "This Week" },
  { id: "n10", title: "New staff onboarded", detail: "Mahlet Girma added as Technician, Team 3.", time: "3 days", type: "System", priority: "LOW", unread: false, date: "This Week" },
  { id: "n11", title: "SB035 marked as DONE", detail: "All materials checked in and verified. Job closed successfully.", time: "4 days", type: "Booking", priority: "LOW", unread: false, date: "This Week" },
  { id: "n12", title: "Meal budget exceeded", detail: "SB042 meal provision exceeded budget by 800 ETB. Review with OO.", time: "5 days", type: "Payment", priority: "NORMAL", unread: false, date: "This Week" },
];

export const PROFILES: Profile[] = [
  { name: "Nathan Berhanu", role: "Admin", initials: "NB", description: "System control & user management" },
  { name: "Hanna Tesfaye", role: "CCR", initials: "HT", description: "Client reservations & intake" },
  { name: "Bereket Alemu", role: "CTO", initials: "BA", description: "Technical validation & screens" },
  { name: "Dawit Mekonnen", role: "TO", initials: "DM", description: "On-site installation & testing" },
  { name: "Samuel Tadesse", role: "OO", initials: "ST", description: "Operations scheduling & dispatch" },
  { name: "Selam Worku", role: "SK", initials: "SW", description: "Inventory checkout & damages" },
];

export const MONTHS = [
  { m: "Jan", revenue: 892000, bookings: 12 },
  { m: "Feb", revenue: 1105000, bookings: 15 },
  { m: "Mar", revenue: 980000, bookings: 13 },
  { m: "Apr", revenue: 1420000, bookings: 19 },
  { m: "May", revenue: 1285000, bookings: 17 },
  { m: "Jun", revenue: 1840000, bookings: 24 },
];
