import type {
  Booking,
  InventoryItem,
  Notification,
  ReportSummary,
  StaffMember,
  User,
} from "@vortex/types";

export interface AuthService {
  requestOtp(input: { phone: string }): Promise<void>;
  verifyOtp(input: { phone: string; code: string }): Promise<User>;
}

export interface BookingService {
  listBookings(): Promise<Booking[]>;
  getBooking(code: string): Promise<Booking | undefined>;
}

export interface InventoryService {
  listInventory(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
}

export interface ReportService {
  getSummary(): Promise<ReportSummary>;
}

export interface NotificationService {
  listNotifications(): Promise<Notification[]>;
}

export interface StaffService {
  listStaff(): Promise<StaffMember[]>;
}

export const authService: AuthService = {
  async requestOtp() {
    return undefined;
  },
  async verifyOtp() {
    throw new Error("authService.verifyOtp is not connected to a backend yet.");
  },
};

export const bookingService: BookingService = {
  async listBookings() {
    return [];
  },
  async getBooking() {
    return undefined;
  },
};

export const inventoryService: InventoryService = {
  async listInventory() {
    return [];
  },
  async getInventoryItem() {
    return undefined;
  },
};

export const reportService: ReportService = {
  async getSummary() {
    return { totalRevenue: 0, completedJobs: 0, utilization: 0, averageJobValue: 0 };
  },
};

export const notificationService: NotificationService = {
  async listNotifications() {
    return [];
  },
};

export const staffService: StaffService = {
  async listStaff() {
    return [];
  },
};
