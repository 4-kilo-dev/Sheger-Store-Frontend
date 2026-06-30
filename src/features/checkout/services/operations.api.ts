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
}

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
  { id: "n10", title: "New staff onboarded", detail: "Mahlet Girma added as Technician, Team 3. Welcome aboard!", time: "3 days", type: "System", priority: "LOW", unread: false, date: "This Week" },
  { id: "n11", title: "SB035 marked as DONE", detail: "All materials checked in and verified. Job closed successfully.", time: "4 days", type: "Booking", priority: "LOW", unread: false, date: "This Week" },
  { id: "n12", title: "Meal budget exceeded", detail: "SB042 meal provision exceeded budget by 800 ETB. Review with OO.", time: "5 days", type: "Payment", priority: "NORMAL", unread: false, date: "This Week" },
];

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