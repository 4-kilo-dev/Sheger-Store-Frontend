import { client } from "@/lib/api/client";

// ----------------------------------------------------
// Type Definitions
// ----------------------------------------------------

export interface BookingReportRecord {
  id: string;
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
}

export interface InventoryReportRecord {
  categoryId: string;
  name: string;
  trackingType: 'bulk' | 'serialized';
  unit: string;
  pools: InventoryReportPool[];
}

export interface RevenuePaymentRecord {
  id: string;
  bookingId: string;
  bookingCode?: string;
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
  bookingCode?: string;
  clientNameVenue: string;
  eventDate: string;
  teamSize: number;
  notes: string;
  evaluatorName: string;
  createdAt: string;
  scores: EvaluationReportScore[];
}

export interface EvaluationsReportResponse {
  metricAverages: Record<string, {
    label: string;
    sum: number;
    count: number;
    average: number;
  }>;
  evaluations: EvaluationReportRecord[];
}

export interface CanceledBookingReportRecord {
  id: string;
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
  bookingCode?: string;
  status: string;
  eventDate: string;
  eventLocation: string;
  customerName: string;
  hasBom: boolean;
  assignedCrewCount: number;
}

// ----------------------------------------------------
// Mock Data Fallbacks
// ----------------------------------------------------

const MOCK_BOOKINGS_REPORT: BookingsReportResponse = {
  totalCount: 5,
  totalBookingAmountValue: 1840000,
  statusCounts: {
    "RESERVED": 1,
    "CONFIRMED": 2,
    "PREPARATION": 1,
    "DONE": 1
  },
  bookings: [
    {
      id: "SB021",
      status: "RESERVED",
      eventDate: "2026-07-08T10:00:00Z",
      eventLocation: "Golden Ballroom, Hilton Hotel",
      paymentStatus: "unpaid",
      paymentAmount: "350000.00",
      createdAt: "2026-06-29T14:30:00Z",
      customerName: "Hilton Gala"
    },
    {
      id: "SB020",
      status: "CONFIRMED",
      eventDate: "2026-07-05T12:00:00Z",
      eventLocation: "Sheraton Addis Ballroom",
      paymentStatus: "advance",
      paymentAmount: "75000.00",
      createdAt: "2026-06-28T10:00:00Z",
      customerName: "Embassy Event"
    },
    {
      id: "SB019",
      status: "PREPARATION",
      eventDate: "2026-06-29T09:00:00Z",
      eventLocation: "Millennium Hall Grand stage",
      paymentStatus: "paid",
      paymentAmount: "1285000.00",
      createdAt: "2026-06-25T08:00:00Z",
      customerName: "Millennium concert"
    },
    {
      id: "SB018",
      status: "DONE",
      eventDate: "2026-06-20T11:00:00Z",
      eventLocation: "Hyatt Regency Garden",
      paymentStatus: "paid",
      paymentAmount: "130000.00",
      createdAt: "2026-06-18T09:00:00Z",
      customerName: "Corporate Luncheon"
    }
  ]
};

const MOCK_INVENTORY_REPORT: InventoryReportRecord[] = [
  {
    categoryId: "cat-1",
    name: "LED Screen Panels",
    trackingType: "bulk",
    unit: "m²",
    pools: [
      {
        poolId: "pool-1",
        name: "P2.97 Indoor LED Panel",
        totalQuantity: 192,
        checkedOutQuantity: 64,
        damagedQuantity: 2.5,
        missingQuantity: 0,
        availableQuantity: 125.5
      },
      {
        poolId: "pool-2",
        name: "P3.91 Outdoor LED Panel",
        totalQuantity: 144,
        checkedOutQuantity: 68,
        damagedQuantity: 4.0,
        missingQuantity: 1.0,
        availableQuantity: 71.0
      }
    ]
  },
  {
    categoryId: "cat-2",
    name: "LED Processors & Controllers",
    trackingType: "serialized",
    unit: "pcs",
    pools: [
      {
        poolId: "pool-3",
        name: "Novastar Pro Processor",
        totalQuantity: 12,
        checkedOutQuantity: 5,
        damagedQuantity: 0,
        missingQuantity: 0,
        availableQuantity: 7
      },
      {
        poolId: "pool-4",
        name: "VX4S Controller Interface",
        totalQuantity: 8,
        checkedOutQuantity: 3,
        damagedQuantity: 0,
        missingQuantity: 0,
        availableQuantity: 5
      }
    ]
  },
  {
    categoryId: "cat-3",
    name: "Power & Cables Pool",
    trackingType: "bulk",
    unit: "meters",
    pools: [
      {
        poolId: "pool-5",
        name: "3-Phase Power Feed Cable",
        totalQuantity: 350,
        checkedOutQuantity: 220,
        damagedQuantity: 15.0,
        missingQuantity: 0,
        availableQuantity: 115.0
      }
    ]
  }
];

const MOCK_REVENUE_REPORT: RevenueReportResponse = {
  totalRevenue: 6722000,
  statusCounts: {
    "paid": 18,
    "advance": 9,
    "unpaid": 3
  },
  monthlyRevenue: {
    "2026-01": 892000,
    "2026-02": 1105000,
    "2026-03": 980000,
    "2026-04": 1420000,
    "2026-05": 1285000,
    "2026-06": 1040000
  },
  payments: [
    {
      id: "pay-1",
      bookingId: "SB020",
      amount: "37500.00",
      createdAt: "2026-06-28T10:00:00Z",
      toStatus: "advance",
      customerName: "Embassy Event",
      recordedByName: "Selam W."
    },
    {
      id: "pay-2",
      bookingId: "SB019",
      amount: "1285000.00",
      createdAt: "2026-06-25T11:30:00Z",
      toStatus: "paid",
      customerName: "Millennium concert",
      recordedByName: "Nathan B."
    },
    {
      id: "pay-3",
      bookingId: "SB018",
      amount: "130000.00",
      createdAt: "2026-06-19T09:00:00Z",
      toStatus: "paid",
      customerName: "Corporate Luncheon",
      recordedByName: "Selam W."
    }
  ]
};

const MOCK_CUSTOMERS_REPORT: CustomerReportRecord[] = [
  {
    customerId: "cust-1",
    name: "Sheraton Addis Hotel",
    phone: "+251 911 223 344",
    totalBookings: 12,
    completedBookings: 10,
    totalRevenueContributed: 1450000.00
  },
  {
    customerId: "cust-2",
    name: "Hilton Addis Hotel",
    phone: "+251 922 445 566",
    totalBookings: 8,
    completedBookings: 7,
    totalRevenueContributed: 980000.00
  },
  {
    customerId: "cust-3",
    name: "Millennium Hall Grand stage",
    phone: "+251 900 111 222",
    totalBookings: 6,
    completedBookings: 5,
    totalRevenueContributed: 1840000.00
  },
  {
    customerId: "cust-4",
    name: "Embassy Organizer",
    phone: "+251 912 333 444",
    totalBookings: 4,
    completedBookings: 3,
    totalRevenueContributed: 450000.00
  }
];

const MOCK_EVALUATIONS_REPORT: EvaluationsReportResponse = {
  metricAverages: {
    "setup_efficiency": {
      "label": "Setup Efficiency",
      "sum": 17.0,
      "count": 2,
      "average": 8.5
    },
    "ppe_compliance": {
      "label": "PPE Compliance",
      "sum": 2.0,
      "count": 2,
      "average": 100.0
    },
    "punctuality_arrival": {
      "label": "Punctuality (Arrival)",
      "sum": 18.0,
      "count": 2,
      "average": 9.0
    },
    "signal_integrity": {
      "label": "Signal Integrity",
      "sum": 190.0,
      "count": 2,
      "average": 95.0
    }
  },
  evaluations: [
    {
      id: "eval-1",
      bookingId: "SB018",
      clientNameVenue: "Corporate Luncheon - Hyatt Regency",
      eventDate: "2026-06-20T11:00:00.000Z",
      teamSize: 4,
      notes: "Setup went smoothly. Color calibrations was spot on.",
      evaluatorName: "Rep Viewer",
      createdAt: "2026-06-20T15:42:33Z",
      scores: [
        {
          evaluationId: "eval-1",
          score: "9.00",
          metricId: "met-1",
          metricKey: "setup_efficiency",
          metricLabel: "Setup Efficiency"
        },
        {
          evaluationId: "eval-1",
          score: "1.00",
          metricId: "met-2",
          metricKey: "ppe_compliance",
          metricLabel: "PPE Compliance"
        }
      ]
    },
    {
      id: "eval-2",
      bookingId: "SB017",
      clientNameVenue: "Hilton Wedding Gala",
      eventDate: "2026-06-15T09:00:00.000Z",
      teamSize: 6,
      notes: "Rigging structural validation check passed. Slight signal drop resolved quickly.",
      evaluatorName: "Admin User",
      createdAt: "2026-06-15T10:20:00Z",
      scores: [
        {
          evaluationId: "eval-2",
          score: "8.00",
          metricId: "met-1",
          metricKey: "setup_efficiency",
          metricLabel: "Setup Efficiency"
        },
        {
          evaluationId: "eval-2",
          score: "95.00",
          metricId: "met-4",
          metricKey: "signal_integrity",
          metricLabel: "Signal Integrity"
        }
      ]
    }
  ]
};

const MOCK_CANCELED_REPORT: CanceledBookingReportRecord[] = [
  {
    id: "cancel-1",
    eventDate: "2026-06-25T15:00:00Z",
    eventLocation: "Addis Convention Center",
    paymentAmount: "25000.00",
    customerName: "Organizer Ltd",
    canceledBy: "Operations Officer One",
    canceledAt: "2026-06-26T09:45:00Z",
    reason: "Event postponed by host due to venue scheduling conflict"
  },
  {
    id: "cancel-2",
    eventDate: "2026-06-12T10:00:00Z",
    eventLocation: "Skylight Hall B",
    paymentAmount: "45000.00",
    customerName: "Global Trade Inc",
    canceledBy: "Admin User",
    canceledAt: "2026-06-13T14:20:00Z",
    reason: "Corporate sponsor pulled out, booking cancelled by client request"
  }
];

const MOCK_UPCOMING_REPORT: UpcomingBookingReportRecord[] = [
  {
    id: "SB020",
    status: "CONFIRMED",
    eventDate: "2026-07-05T12:00:00Z",
    eventLocation: "Sheraton Addis Ballroom",
    customerName: "Embassy Event",
    hasBom: true,
    assignedCrewCount: 3
  },
  {
    id: "SB021",
    status: "CONFIRMED",
    eventDate: "2026-07-08T10:00:00Z",
    eventLocation: "Golden Ballroom, Hilton Hotel",
    customerName: "Hilton Gala",
    hasBom: false,
    assignedCrewCount: 0
  },
  {
    id: "SB022",
    status: "RESERVED",
    eventDate: "2026-07-10T09:00:00Z",
    eventLocation: "Millennium Hall Grand stage",
    customerName: "Tech Summit Expo",
    hasBom: false,
    assignedCrewCount: 5
  }
];

// ----------------------------------------------------
// API Core Query Logic
// ----------------------------------------------------

export async function getBookingsReportApi(filters: {
  status?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  location?: string;
}): Promise<BookingsReportResponse> {
  const query = new URLSearchParams();
  if (filters.status) query.append("status", filters.status);
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);
  if (filters.customerId) query.append("customerId", filters.customerId);
  if (filters.location) query.append("location", filters.location);

  return client.get<BookingsReportResponse>(`/api/reports/bookings?${query.toString()}`);
}

export async function getInventoryReportApi(categoryId?: string): Promise<InventoryReportRecord[]> {
  const query = categoryId ? `?categoryId=${categoryId}` : "";
  return client.get<InventoryReportRecord[]>(`/api/reports/inventory${query}`);
}

export async function getRevenueReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<RevenueReportResponse> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  return client.get<RevenueReportResponse>(`/api/reports/revenue?${query.toString()}`);
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

  return client.get<EvaluationsReportResponse>(`/api/reports/evaluations?${query.toString()}`);
}

export async function getCanceledBookingsReportApi(filters: {
  startDate?: string;
  endDate?: string;
}): Promise<CanceledBookingReportRecord[]> {
  const query = new URLSearchParams();
  if (filters.startDate) query.append("startDate", filters.startDate);
  if (filters.endDate) query.append("endDate", filters.endDate);

  return client.get<CanceledBookingReportRecord[]>(`/api/reports/canceled-bookings?${query.toString()}`);
}

export async function getUpcomingBookingsReportApi(days = 7): Promise<UpcomingBookingReportRecord[]> {
  return client.get<UpcomingBookingReportRecord[]>(`/api/reports/upcoming-bookings?days=${days}`);
}
