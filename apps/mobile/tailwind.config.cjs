/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#111113",
        foreground: "#E8E8EC",
        surface: "#18181B",
        "surface-2": "#222225",
        border: "#2C2C30",
        accent: "#F5B731",
        "accent-foreground": "#171310",
        "text-2": "#9898A4",
        "text-3": "#64646E",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
    },
  },
};
