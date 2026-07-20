export type BookingStatus =
  | "RESERVED"
  | "CONFIRMED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PREPARATION"
  | "ONSITE"
  | "COMPLETED"
  | "DONE"
  | "CANCELED"
  | "PARTIALLY_RETURNED";

export type PaymentStatus = "PAID" | "ADVANCE" | "UNPAID";

export type ScreenType = "P2.97" | "P4" | "P5" | "P2.97-New" | "P3.91 INDOOR" | "P3.91 OUTDOOR";

export interface BomItem {
  id: string;
  name: string;
  qty: number;
  status: "Reserved" | "Checked Out" | "Returned";
  poolId?: string;
  itemId?: string;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actorName: string;
  reason: string | null;
  createdAt: string;
}

export interface BookingAssignment {
  id: string;
  userId?: string;
  roleContext?: string;
  isTeamLead?: boolean;
  phase?: string;
  user?: { id: string; name: string };
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
  screenType: ScreenType;
  size: number;
  arrangement: string;
  assignees: string[];
  stageHand: string;
  status: BookingStatus;
  payment: PaymentStatus;
  amount: number;
  paymentAmount?: number;
  ctoNotes: string;
  bomItems: BomItem[];
  teamLeader: string;
  driver: string;
  driverUserId?: string;
  vehicleText?: string;
  vehiclePlate?: string;
  mealBudget: number;
  createdAt: string;
  statusHistory: StatusHistoryItem[];
  itemServiceSpec?: string;
  assignments: BookingAssignment[];
  customFields: Record<string, unknown>;
}

export type InventoryCondition = "GOOD" | "SERVICE DUE" | "DAMAGED";
export type InventoryAvailability = "AVAILABLE" | "RESERVED" | "ONSITE";

export interface InventoryItem {
  id: string;
  poolId?: string;
  itemId?: string;
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

export type UserRole = "Admin" | "CCR" | "CTO" | "TO" | "OO" | "SK" | "SH" | "FL";

export interface Profile {
  name: string;
  role: UserRole;
  initials: string;
  description: string;
}

/**
 * Backend auth user from login / GET /api/auth/me.
 * `permissions` are effective keys (DB grants + backend-side shallow expansions
 * like manage⇒view) — exact includes() only, never expand on the client.
 * `roles` are informational (badges); never gate access on role strings.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  team?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  team: string;
  phone: string;
  status: "ACTIVE" | "ONSITE" | "OFF DUTY" | "ON LEAVE";
  jobs: number;
  capacity: number;
  initials: string;
  joinedDate: string;
  isFreelancer: boolean;
}

export type NotificationPriority = "URGENT" | "NORMAL" | "LOW";
export type NotificationType =
  "Booking" | "Inventory" | "Payment" | "Damage" | "Schedule" | "System";

export interface Notification {
  id: string;
  eventType: string;
  message: string;
  isTask: boolean;
  relatedEntity?: string;
  relatedId?: string;
  readAt: string | null;
  createdAt: string;
  type?: NotificationType;
  priority?: NotificationPriority;
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
  CANCELED: "Canceled",
  PARTIALLY_RETURNED: "Partially Returned",
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

export interface PerformanceMetric {
  id: string;
  key: string;
  label: string;
  description: string;
  category: "internal" | "client_feedback";
  valueType: "boolean" | "rating_10" | "rating_5" | "percentage";
  sortOrder: number;
  isActive: boolean;
}

export interface Role {
  id: string;
  key: string;
  displayName: string;
}

export interface Permission {
  id: string;
  key: string;
  description?: string | null;
}

export interface RoleWithPermissions extends Role {
  isSystem: boolean;
  permissions: Permission[];
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: "boolean" | "number" | "string" | "date" | "enum" | "multi_select";
  options?: string[];
  required: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverTrip {
  id: string;
  driverUserId: string;
  bookingId: string | null;
  leftAt: string;
  arrivedAt: string | null;
  reason: string;
  plate: string | null;
  isApproved: boolean | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  driver?: { id: string; name: string };
  booking?: DriverTripBooking | null;
}

export interface DriverTripBooking {
  id: string;
  bookingCode: string;
  status: string;
  eventLocation?: string | null;
}

export interface Attachment {
  id: string;
  bookingId: string;
  objectKey: string;
  originalName: string;
  fileType: string;
  fileSizeBytes: number;
  relatedEntity?: string;
  relatedId?: string;
  uploaderName?: string;
  createdAt: string;
}
