export type BookingStatus =
  | "RESERVED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PREPARATION"
  | "ONSITE"
  | "COMPLETED"
  | "DONE";

export type PaymentStatus = "PAID" | "ADVANCE" | "UNPAID";

export type ScreenType =
  | "P2.97"
  | "P4"
  | "P5"
  | "P2.97-New"
  | "P3.91 INDOOR"
  | "P3.91 OUTDOOR";

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

export type InventoryCondition = "GOOD" | "SERVICE DUE" | "DAMAGED";
export type InventoryAvailability = "AVAILABLE" | "RESERVED" | "ONSITE";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  model: string;
  total: number;
  available: number;
  reserved: number;
  onsite: number;
  damaged: number;
  condition: InventoryCondition;
  availability: InventoryAvailability;
  location: string;
  lastService: string;
  nextService: string;
}

export type UserRole = "Admin" | "CCR" | "CTO" | "TO" | "OO" | "SK";

export interface Profile {
  name: string;
  role: UserRole;
  initials: string;
  description: string;
}

export interface StaffMember {
  name: string;
  role: string;
  team: string;
  phone: string;
  status: "ACTIVE" | "ONSITE" | "OFF DUTY" | "ON LEAVE";
  jobs: number;
  capacity: number;
  initials: string;
  joinedDate: string;
}

export type NotificationPriority = "URGENT" | "NORMAL" | "LOW";
export type NotificationType = "Booking" | "Inventory" | "Payment" | "Damage" | "Schedule" | "System";

export interface Notification {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: NotificationType;
  priority: NotificationPriority;
  unread: boolean;
  linkTo?: string;
  date: "Today" | "Yesterday" | "This Week";
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  RESERVED: "Reserved",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  PREPARATION: "Preparation",
  ONSITE: "Onsite",
  COMPLETED: "Completed",
  DONE: "Done",
};

export const STATUS_ORDER: BookingStatus[] = [
  "RESERVED",
  "CONFIRMED",
  "ASSIGNED",
  "ACCEPTED",
  "PREPARATION",
  "ONSITE",
  "COMPLETED",
  "DONE",
];
