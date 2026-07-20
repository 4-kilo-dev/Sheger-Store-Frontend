import { client } from "@/lib/api/client";

export interface DriverTripUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface DriverTripBooking {
  id: string;
  bookingCode: string;
  status: string;
  eventLocation?: string | null;
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
  driver?: DriverTripUser;
  booking?: DriverTripBooking | null;
  approvedByUser?: { id: string; name: string } | null;
  createdByUser?: { id: string; name: string } | null;
}

export interface CreateDriverTripPayload {
  driverUserId: string;
  leftAt: string;
  reason: string;
  arrivedAt?: string;
  bookingId?: string;
  plate?: string;
}

export interface UpdateDriverTripPayload {
  leftAt?: string;
  arrivedAt?: string | null;
  reason?: string;
  driverUserId?: string;
  bookingId?: string | null;
  plate?: string | null;
}

export interface ListDriverTripsFilters {
  from?: string;
  to?: string;
  driverUserId?: string;
  bookingId?: string;
}

export async function listDriverTripsApi(
  filters: ListDriverTripsFilters = {},
): Promise<DriverTrip[]> {
  const query = new URLSearchParams();
  if (filters.from) query.append("from", filters.from);
  if (filters.to) query.append("to", filters.to);
  if (filters.driverUserId) query.append("driverUserId", filters.driverUserId);
  if (filters.bookingId) query.append("bookingId", filters.bookingId);
  const qs = query.toString();
  return client.get<DriverTrip[]>(`/api/driver-trips${qs ? `?${qs}` : ""}`);
}

export async function createDriverTripApi(payload: CreateDriverTripPayload): Promise<DriverTrip> {
  return client.post<DriverTrip>("/api/driver-trips", payload);
}

export async function updateDriverTripApi(
  id: string,
  payload: UpdateDriverTripPayload,
): Promise<DriverTrip> {
  return client.patch<DriverTrip>(`/api/driver-trips/${id}`, payload);
}

export async function approveDriverTripApi(id: string, isApproved: boolean): Promise<DriverTrip> {
  return client.patch<DriverTrip>(`/api/driver-trips/${id}/approve`, { isApproved });
}
