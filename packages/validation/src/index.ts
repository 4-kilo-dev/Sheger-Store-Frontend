import { z } from "zod";

export const loginSchema = z.object({
  phone: z.string().min(6),
});

export const bookingSchema = z.object({
  client: z.string().min(1),
  contactPerson: z.string().min(1),
  contactPhone: z.string().min(6),
  venue: z.string().min(1),
  assemblyDate: z.string().min(1),
  eventDate: z.string().min(1),
  screenType: z.string().min(1),
  size: z.number().positive(),
  arrangement: z.string().min(1),
  amount: z.number().nonnegative(),
  paymentTerms: z.enum(["UNPAID", "ADVANCE", "PAID"]),
});

export const checkoutSchema = z.object({
  bookingCode: z.string().min(1),
  mode: z.enum(["checkout", "checkin"]),
  checkedItemIds: z.array(z.string()).min(1),
  responsibleParty: z.string().min(1),
  timestamp: z.string().min(1),
  returnNotes: z.string().optional(),
});

export const damageReportSchema = z.object({
  itemId: z.string().min(1),
  affectedQuantity: z.number().int().positive(),
  serialNumbers: z.string().min(1),
  severity: z.string().min(1),
  discoveredAt: z.string().min(1),
  description: z.string().min(1),
});

export const inventorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  model: z.string().min(1),
  total: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  onsite: z.number().int().nonnegative(),
  damaged: z.number().int().nonnegative(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DamageReportInput = z.infer<typeof damageReportSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
