export interface StaffMember {
  id?: string;
  name: string;
  role: string;
  team: string;
  phone: string;
  status: "ACTIVE" | "ONSITE" | "OFF DUTY" | "ON LEAVE";
  jobs: number;
  capacity: number;
  initials: string;
  joinedDate: string;
  /** Pay-eligible freelancer flag (independent of RBAC role) */
  isFreelancer?: boolean;
}


export const STAFF_ROLES = ["All", "Admin", "CCR", "Chief Technician", "Technician", "Operation Officer", "Storekeeper"] as const;

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

export async function getBookingBomLinesApi(bookingId: string): Promise<any[]> {
  return client.get<any[]>(`/api/bookings/${bookingId}/bom/lines`);
}

export async function checkoutBookingApi(bookingId: string, payload: any): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/checkout`, payload);
}

export async function checkinBookingApi(bookingId: string, payload: any): Promise<any> {
  return client.post(`/api/bookings/${bookingId}/checkin`, payload);
}