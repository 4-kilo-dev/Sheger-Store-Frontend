export interface StaffMember {
  id?: string;
  name: string;
  role: string;
  /** Backend role key when available (e.g. ccr, oo). */
  roleKey?: string;
  team: string;
  phone: string;
  email?: string | null;
  status: "ACTIVE" | "ONSITE" | "OFF DUTY" | "ON LEAVE";
  jobs: number;
  capacity: number;
  initials: string;
  joinedDate: string;
  /** Pay-eligible freelancer flag (independent of RBAC role) */
  isFreelancer?: boolean;
}


export const STAFF_ROLES = ["All", "Admin", "CCR", "Chief Technician", "Technician", "Operation Officer", "Storekeeper"] as const;

/** Map staff filter tab labels → backend role keys / display names. */
export const STAFF_ROLE_MATCHERS: Record<string, string[]> = {
  Admin: ["admin", "Admin"],
  CCR: ["ccr", "CCR", "Call Center Representative"],
  "Chief Technician": ["chief_tech", "Chief Technician"],
  Technician: ["technician", "Technician"],
  "Operation Officer": ["oo", "OO", "Operation Officer", "Operations Officer"],
  Storekeeper: ["storekeeper", "Storekeeper"],
};

export function staffMatchesRoleFilter(
  person: Pick<StaffMember, "role" | "roleKey">,
  roleFilter: string
): boolean {
  if (roleFilter === "All") return true;
  const matchers = STAFF_ROLE_MATCHERS[roleFilter] || [roleFilter];
  const role = (person.role || "").trim();
  const key = (person.roleKey || "").trim().toLowerCase();
  return matchers.some((m) => {
    if (key && m.toLowerCase() === key) return true;
    return role.toLowerCase() === m.toLowerCase();
  });
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



import { client } from "@/lib/api/client";
import type {
  CheckoutAsset,
  InventoryCondition,
} from "./operation-payloads";

export async function getBookingBomLinesApi(bookingId: string): Promise<any[]> {
  return client.get<any[]>(`/api/bookings/${bookingId}/bom/lines`);
}

export type CustodyLine = {
  poolId: string | null;
  itemId: string | null;
  snapshotQuantity: string;
  outQuantity: string;
  inQuantity: string;
  outstandingQuantity: string;
  availableToCheckoutQuantity: string;
};

export type CheckinReturn = {
  poolId?: string;
  itemId?: string;
  quantityReturned?: string;
  condition?: InventoryCondition;
};

export type CheckinResult = {
  movements: unknown[];
  status: "PARTIALLY_RETURNED" | "DONE";
};

export async function checkoutBookingApi(
  bookingId: string,
  payload: { assets: CheckoutAsset[]; override?: boolean; overrideReason?: string },
  idempotencyKey?: string,
): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/checkout`, payload, {
    headers: idempotencyKey
      ? { "Idempotency-Key": idempotencyKey }
      : undefined,
  });
}

export async function checkinBookingApi(
  bookingId: string,
  payload: { returns: CheckinReturn[]; forceMissing?: boolean; forceReason?: string },
): Promise<CheckinResult> {
  return client.post(`/api/bookings/${bookingId}/checkin`, payload);
}

export async function getBookingCustodyApi(
  bookingId: string,
): Promise<CustodyLine[]> {
  return client.get(`/api/bookings/${bookingId}/checkout/custody`);
}
