import type { BookingStatus, PaymentStatus } from "@/types/domain";

export const colors = {
  background: "#111113",
  foreground: "#E8E8EC",
  surface: "#18181B",
  surface2: "#222225",
  border: "#2C2C30",
  text2: "#9898A4",
  text3: "#64646E",
  accent: "#F5B731",
  accentForeground: "#171310",
  accentDim: "#6B4F0E",
  destructive: "#E5484D",
  success: "#30A46C",
  white: "#FFFFFF",
  black: "#000000",
  status: {
    RESERVED: "#E8A030",
    CONFIRMED: "#46A758",
    ASSIGNED: "#A18072",
    ACCEPTED: "#3E93DE",
    PREPARATION: "#E54666",
    ONSITE: "#8B8B97",
    COMPLETED: "#0091B2",
    DONE: "#30A46C",
  } satisfies Record<BookingStatus, string>,
  payment: {
    PAID: "#6E56CF",
    ADVANCE: "#E8A030",
    UNPAID: "#E54666",
  } satisfies Record<PaymentStatus, string>,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  round: 999,
} as const;

export const typography = {
  data: "Menlo",
  sans: undefined,
} as const;

export function alpha(hex: string, opacity: number) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
