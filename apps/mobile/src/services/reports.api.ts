import { client } from "@/lib/api/client";
import { getBookingsApi } from "@/services/bookings-api";

export interface BookingReportRecord {
  id?: string;
  bookingCode: string;
  status: string;
  eventDate: string;
  eventLocation: string;
  paymentStatus: string;
  paymentAmount: string;
  createdAt: string;
  customerName: string;
}

export interface BookingsReportResponse {
  totalCount: number;
  totalBookingAmountValue: number;
  statusCounts: Record<string, number>;
  bookings: BookingReportRecord[];
}

export interface InventoryReportPool {
  poolId: string;
  name: string;
  totalQuantity: number;
  checkedOutQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  availableQuantity: number;
  maintenanceQuantity?: number;
}

export interface InventoryReportRecord {
  categoryId: string;
  name: string;
  trackingType: "bulk" | "serialized";
  unit: string;
  pools: InventoryReportPool[];
}

export interface RevenuePaymentRecord {
  id: string;
  bookingId: string;
  bookingCode: string;
  amount: string;
  createdAt: string;
  toStatus: string;
  customerName: string;
  recordedByName: string;
}

export interface RevenueReportResponse {
  totalRevenue: number;
  statusCounts: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  payments: RevenuePaymentRecord[];
}

export interface CustomerReportRecord {
  customerId: string;
  name: string;
  phone: string;
  totalBookings: number;
  completedBookings: number;
  totalRevenueContributed: number;
}

export interface EvaluationReportScore {
  evaluationId: string;
  score: string;
  metricId: string;
  metricKey: string;
  metricLabel: string;
}

export interface EvaluationReportRecord {
  id: string;
  bookingId: string;
  bookingCode: string;
  clientNameVenue: string;
  eventDate: string;
  teamSize: number;
  notes: string;
  evaluatorName: string;
  createdAt: string;
  scores: EvaluationReportScore[];
}

export interface EvaluationsReportResponse {
  metricAverages: Record<
    string,
    {
      label: string;
      sum: number;
      count: number;
      average: number;
    }
  >;
  evaluations: EvaluationReportRecord[];
}

export interface CanceledBookingReportRecord {
  id: string;
  bookingCode: string;
  eventDate: string;
  eventLocation: string;
  paymentAmount: string;
  customerName: string;
  canceledBy: string;
  canceledAt: string;
  reason: string;
}

export interface UpcomingBookingReportRecord {
  id: string;
  bookingCode: string;
  status: string;
  eventDate: string;
  eventLocation: string;
  customerName: string;
  hasBom: boolean;
  assignedCrewCount: number;
}

export interface FreelancerWorkloadRow {
  userId: string;
  name: string;
  email: string | null;
  isFreelancer: boolean;
  bookingsCount: number;
  /** Rounded to 2 decimals by the backend */
  sqmCovered: number;
}

export interface DriverTripsReportRow {
  driverUserId: string;
  name: string;
  email: string | null;
  tripsCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalDurationMinutes: number;
}

let bookingCodeMapPromise: Promise<Map<string, string>> | null = null;

async function getBookingCodeMap(): Promise<Map<string, string>> {
  if (!bookingCodeMapPromise) {
    bookingCodeMapPromise = getBookingsApi()
      .then((bookings) => {
        const map = new Map<string, string>();
        for (const booking of bookings) {
          if (booking.id && booking.code) map.set(booking.id, booking.code);
        }
        return map;
      })
      .catch(() => {
        bookingCodeMapPromise = null;
        return new Map<string, string>();
      });
  }
  return bookingCodeMapPromise;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function resolveBookingCode(
  codeMap: Map<string, string>,
  bookingId?: string | null,
  bookingCode?: string | null,
): string {
  if (bookingCode && !looksLikeUuid(bookingCode)) return bookingCode;
  if (bookingId && codeMap.has(bookingId)) return codeMap.get(bookingId)!;
  if (bookingCode) return bookingCode;
  return bookingId || "";
}

export async function getBookingsReportApi(filters: {
  status?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  location?: string;
  staffUserId?: string;
}): Promise<BookingsReportResponse> {
  const query = new URLSearchParams();
  if (filters.status) query.append("status", filters.status);
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  if (filters.customerId) query.append("customerId", filters.customerId);
  if (filters.location) query.append("location", filters.location);
  if (filters.staffUserId) query.append("staffUserId", filters.staffUserId);

  const [report, codeMap] = await Promise.all([
    client.get<BookingsReportResponse & { bookings: Array<BookingReportRecord & { id?: string }> }>(
      `/api/reports/bookings?${query.toString()}`,
    ),
    getBookingCodeMap(),
  ]);

  return {
    ...report,
    bookings: (report.bookings || []).map((booking) => ({
      ...booking,
      bookingCode: resolveBookingCode(codeMap, booking.id, booking.bookingCode),
    })),
  };
}

export async function getInventoryReportApi(categoryId?: string): Promise<InventoryReportRecord[]> {
  const query = categoryId ? `?categoryId=${categoryId}` : "";
  const categories = await client.get<
    Array<{
      categoryId: string;
      name: string;
      trackingType: "bulk" | "serialized";
      unit: string;
      pools?: InventoryReportPool[];
      summary?: {
        totalQuantity: number;
        checkedOutQuantity: number;
        damagedQuantity: number;
        maintenanceQuantity: number;
        lostQuantity: number;
        availableQuantity: number;
      };
    }>
  >(`/api/reports/inventory${query}`);

  return (categories || []).map((category) => {
    if (Array.isArray(category.pools)) {
      return { ...category, pools: category.pools };
    }

    const summary = category.summary;
    return {
      ...category,
      pools: summary
        ? [
            {
              poolId: category.categoryId,
              name: `${category.name} summary`,
              totalQuantity: summary.totalQuantity,
              checkedOutQuantity: summary.checkedOutQuantity,
              damagedQuantity: summary.damagedQuantity,
              missingQuantity: summary.lostQuantity,
              availableQuantity: summary.availableQuantity,
              maintenanceQuantity: summary.maintenanceQuantity,
            },
          ]
        : [],
    };
  });
}

export async function getRevenueReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<RevenueReportResponse> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  const [report, codeMap] = await Promise.all([
    client.get<RevenueReportResponse>(`/api/reports/revenue?${query.toString()}`),
    getBookingCodeMap(),
  ]);

  return {
    ...report,
    payments: (report.payments || []).map((payment) => ({
      ...payment,
      bookingCode: resolveBookingCode(codeMap, payment.bookingId, payment.bookingCode),
    })),
  };
}

export async function getCustomersReportApi(): Promise<CustomerReportRecord[]> {
  return client.get<CustomerReportRecord[]>("/api/reports/customers");
}

export async function getEvaluationsReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<EvaluationsReportResponse> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  const [report, codeMap] = await Promise.all([
    client.get<EvaluationsReportResponse>(`/api/reports/evaluations?${query.toString()}`),
    getBookingCodeMap(),
  ]);

  return {
    ...report,
    evaluations: (report.evaluations || []).map((evaluation) => ({
      ...evaluation,
      bookingCode: resolveBookingCode(codeMap, evaluation.bookingId, evaluation.bookingCode),
    })),
  };
}

export async function getCanceledBookingsReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<CanceledBookingReportRecord[]> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  const [rows, codeMap] = await Promise.all([
    client.get<Array<CanceledBookingReportRecord & { bookingCode?: string }>>(
      `/api/reports/canceled-bookings?${query.toString()}`,
    ),
    getBookingCodeMap(),
  ]);

  return (rows || []).map((row) => ({
    ...row,
    bookingCode: resolveBookingCode(codeMap, row.id, row.bookingCode),
  }));
}

export async function getUpcomingBookingsReportApi(
  days = 7,
): Promise<UpcomingBookingReportRecord[]> {
  const [rows, codeMap] = await Promise.all([
    client.get<Array<UpcomingBookingReportRecord & { bookingCode?: string }>>(
      `/api/reports/upcoming-bookings?days=${days}`,
    ),
    getBookingCodeMap(),
  ]);

  return (rows || []).map((row) => ({
    ...row,
    bookingCode: resolveBookingCode(codeMap, row.id, row.bookingCode),
  }));
}

export async function getFreelancerWorkloadReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<FreelancerWorkloadRow[]> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  const qs = query.toString();
  return client.get<FreelancerWorkloadRow[]>(
    `/api/reports/freelancer-workload${qs ? `?${qs}` : ""}`,
  );
}

export async function getDriverTripsReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<DriverTripsReportRow[]> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  const qs = query.toString();
  return client.get<DriverTripsReportRow[]>(`/api/reports/driver-trips${qs ? `?${qs}` : ""}`);
}
