import { BOOKINGS, INVENTORY, MONTHS, NOTIFICATIONS, STAFF } from "@/data/mock";
import type { Booking, InventoryItem } from "@/types/domain";

const delay = async () => undefined;

export const operationsService = {
  async listBookings() {
    await delay();
    return BOOKINGS;
  },
  async getBooking(code: string): Promise<Booking | undefined> {
    await delay();
    return BOOKINGS.find((booking) => booking.code === code);
  },
  async listInventory() {
    await delay();
    return INVENTORY;
  },
  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    await delay();
    return INVENTORY.find((item) => item.id === id);
  },
  async listStaff() {
    await delay();
    return STAFF;
  },
  async listNotifications() {
    await delay();
    return NOTIFICATIONS;
  },
  async getReportMonths() {
    await delay();
    return MONTHS;
  },
};
