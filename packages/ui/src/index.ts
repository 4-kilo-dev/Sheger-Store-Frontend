export const brand = {
  name: "Vortex Visual",
  mark: "diamond",
} as const;

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
  destructive: "#E5484D",
  status: {
    reserved: "#E8A030",
    confirmed: "#46A758",
    assigned: "#A18072",
    accepted: "#3E93DE",
    preparation: "#E54666",
    onsite: "#8B8B97",
    completed: "#0091B2",
    done: "#30A46C",
  },
  payment: {
    paid: "#6E56CF",
    advance: "#E8A030",
    unpaid: "#E54666",
  },
} as const;

export const typography = {
  sans: "Inter",
  data: "JetBrains Mono",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

export const elevation = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.2)",
  md: "0 8px 24px rgba(0, 0, 0, 0.24)",
} as const;
