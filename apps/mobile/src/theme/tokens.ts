import type { BookingStatus, PaymentStatus } from "@/types/domain";
import { StyleSheet } from "react-native";

export type AppTheme = "dark" | "light";

interface ColorTokens {
  background: string;
  foreground: string;
  surface: string;
  surface2: string;
  border: string;
  text2: string;
  text3: string;
  accent: string;
  accentForeground: string;
  accentDim: string;
  destructive: string;
  success: string;
  white: string;
  black: string;
  status: Record<BookingStatus, string>;
  payment: Record<PaymentStatus, string>;
}

const darkColors = {
  // Kept in sync with apps/web/src/styles/styles.css (.dark).
  background: "#09090B",
  foreground: "#FAFAFA",
  surface: "#18181B",
  surface2: "#27272A",
  border: "#3F3F46",
  text2: "#A1A1AA",
  text3: "#71717A",
  accent: "#FDE047",
  accentForeground: "#09090B",
  accentDim: "rgba(253, 224, 71, 0.15)",
  destructive: "#EF4444",
  success: "#30A46C",
  white: "#FFFFFF",
  black: "#000000",
  status: {
    RESERVED: "#E8A030",
    CONFIRMED: "#46A758",
    ASSIGNED: "#A18072",
    ACCEPTED: "#3E93DE",
    PREPARATION: "#E54666",
    ONSITE: "#E8A030",
    COMPLETED: "#0091B2",
    DONE: "#30A46C",
    CANCELED: "#E5484D",
    PARTIALLY_RETURNED: "#E8A030",
  } satisfies Record<BookingStatus, string>,
  payment: {
    PAID: "#6E56CF",
    ADVANCE: "#E8A030",
    UNPAID: "#E54666",
  } satisfies Record<PaymentStatus, string>,
} satisfies ColorTokens;

const lightColors = {
  ...darkColors,
  // Kept in sync with apps/web/src/styles/styles.css (.light).
  background: "#FFFFFF",
  foreground: "#09090B",
  surface: "#FAFAFA",
  surface2: "#F4F4F5",
  border: "#E4E4E7",
  text2: "#52525B",
  text3: "#A1A1AA",
  accent: "#EAB308",
  accentForeground: "#000000",
  accentDim: "rgba(234, 179, 8, 0.15)",
} satisfies ColorTokens;

// Components read this shared palette during render. Do not attempt to mutate
// StyleSheet output here: React Native freezes those objects in development
// and production renderers are allowed to treat them as immutable.
export const colors: ColorTokens = { ...darkColors };

let activeTheme: AppTheme = "dark";

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `${(value >> 16) & 255},${(value >> 8) & 255},${value & 255}`;
}

const themeColorPairs = [
  ...Object.keys(darkColors)
    .filter((key) => key !== "status" && key !== "payment")
    .map((key) => [
      darkColors[key as keyof Omit<ColorTokens, "status" | "payment">] as string,
      lightColors[key as keyof Omit<ColorTokens, "status" | "payment">] as string,
    ]),
  ...Object.keys(darkColors.status).map((key) => [
    darkColors.status[key as BookingStatus],
    lightColors.status[key as BookingStatus],
  ]),
  ...Object.keys(darkColors.payment).map((key) => [
    darkColors.payment[key as PaymentStatus],
    lightColors.payment[key as PaymentStatus],
  ]),
];

function resolveThemeValue(value: unknown, theme: AppTheme): unknown {
  if (typeof value !== "string") return value;

  for (const [dark, light] of themeColorPairs) {
    if (value === dark || value === light) return theme === "dark" ? dark : light;
  }

  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(value);
  if (!rgba) return value;

  const [, red, green, blue, opacity] = rgba;
  for (const [dark, light] of themeColorPairs) {
    if (`${red},${green},${blue}` === hexToRgb(dark)) {
      return `rgba(${hexToRgb(theme === "dark" ? dark : light)},${opacity})`;
    }
  }
  return value;
}

function resolveThemeStyle<T>(value: T, theme: AppTheme): T {
  if (Array.isArray(value)) return value.map((item) => resolveThemeStyle(item, theme)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveThemeStyle(item, theme)]),
    ) as T;
  }
  return resolveThemeValue(value, theme) as T;
}

// The mobile surface predates theming and has module-level StyleSheet objects.
// Return a cached, immutable style object for the active theme when callers read
// `styles.foo`; the original dark definitions are never modified.
function installThemeAwareStyleSheet() {
  const createStyleSheet = StyleSheet.create;

  StyleSheet.create = ((styles: Record<string, Record<string, unknown>>) => {
    const themedStyles = new Map<AppTheme, Record<string, Record<string, unknown>>>();

    return new Proxy(styles, {
      get(target, property, receiver) {
        if (typeof property !== "string") return Reflect.get(target, property, receiver);

        let currentStyles = themedStyles.get(activeTheme);
        if (!currentStyles) {
          currentStyles = resolveThemeStyle(styles, activeTheme);
          themedStyles.set(activeTheme, currentStyles);
        }
        return currentStyles[property];
      },
    });
  }) as typeof createStyleSheet;
}

installThemeAwareStyleSheet();

export function applyTheme(theme: AppTheme) {
  activeTheme = theme;
  Object.assign(colors, theme === "dark" ? darkColors : lightColors);
}

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

export { fontFamily as typography } from "./fonts";

export function alpha(hex: string, opacity: number) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
