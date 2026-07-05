import type { Profile } from "@/types/domain";

export const INVENTORY_CATEGORIES = [
  "All",
  "LED Panels",
  "Processors",
  "Power",
  "Rigging",
  "Cables",
  "Audio",
] as const;

export const STAFF_ROLES = [
  "All",
  "Admin",
  "CCR",
  "Chief Technician",
  "Technician",
  "Operation Officer",
  "Storekeeper",
] as const;

export const PROFILES: Profile[] = [
  {
    name: "Nathan Berhanu",
    role: "Admin",
    initials: "NB",
    description: "System control & user management",
  },
  {
    name: "Hanna Tesfaye",
    role: "CCR",
    initials: "HT",
    description: "Client reservations & intake",
  },
  {
    name: "Bereket Alemu",
    role: "CTO",
    initials: "BA",
    description: "Technical validation & screens",
  },
  {
    name: "Dawit Mekonnen",
    role: "TO",
    initials: "DM",
    description: "On-site installation & testing",
  },
  {
    name: "Samuel Tadesse",
    role: "OO",
    initials: "ST",
    description: "Operations scheduling & dispatch",
  },
  { name: "Selam Worku", role: "SK", initials: "SW", description: "Inventory checkout & damages" },
];
