export type InventoryCondition = "GOOD" | "SERVICE DUE" | "DAMAGED";
export type InventoryAvailability = "AVAILABLE" | "RESERVED" | "ONSITE";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  model: string;
  total: number;
  available: number;
  reserved: number;
  onsite: number;
  damaged: number;
  condition: InventoryCondition;
  availability: InventoryAvailability;
  location: string;
  lastService: string;
  nextService: string;
}

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: "PNL-P297-01", name: "P2.97 LED Panel", category: "LED Panels", model: "ROE Black Pearl 2V2", total: 192, available: 128, reserved: 48, onsite: 12, damaged: 4, condition: "GOOD", availability: "AVAILABLE", location: "Rack A1–A6", lastService: "2026-05-18", nextService: "2026-08-18" },
  { id: "PNL-P391-O", name: "P3.91 Outdoor Panel", category: "LED Panels", model: "Absen A3 Pro", total: 144, available: 72, reserved: 48, onsite: 20, damaged: 4, condition: "GOOD", availability: "RESERVED", location: "Rack B1–B5", lastService: "2026-05-22", nextService: "2026-08-22" },
  { id: "PNL-P4-02", name: "P4 LED Panel", category: "LED Panels", model: "Gloshine P4", total: 96, available: 20, reserved: 60, onsite: 14, damaged: 2, condition: "SERVICE DUE", availability: "RESERVED", location: "Rack C1–C4", lastService: "2026-02-10", nextService: "2026-06-10" },
  { id: "PRC-NVX-01", name: "Novastar Video Processor", category: "Processors", model: "NovaStar VX1000", total: 12, available: 7, reserved: 3, onsite: 2, damaged: 0, condition: "GOOD", availability: "AVAILABLE", location: "Secure Cabinet 1", lastService: "2026-04-12", nextService: "2026-10-12" },
  { id: "PRC-BRM-02", name: "Brompton Processor", category: "Processors", model: "Tessera S8", total: 6, available: 2, reserved: 2, onsite: 1, damaged: 1, condition: "DAMAGED", availability: "AVAILABLE", location: "Secure Cabinet 1", lastService: "2026-05-01", nextService: "2026-07-01" },
  { id: "PWR-32A-01", name: "32A Power Distributor", category: "Power", model: "VV PDU-32", total: 18, available: 9, reserved: 5, onsite: 3, damaged: 1, condition: "SERVICE DUE", availability: "AVAILABLE", location: "Electrical Bay", lastService: "2026-03-06", nextService: "2026-06-06" },
  { id: "TRS-2M-01", name: "2m Box Truss", category: "Rigging", model: "Global F34", total: 64, available: 32, reserved: 20, onsite: 12, damaged: 0, condition: "GOOD", availability: "ONSITE", location: "Rigging Zone", lastService: "2026-04-28", nextService: "2026-10-28" },
  { id: "CBL-SDI-15", name: "15m SDI Cable", category: "Cables", model: "Canare L-5CFB", total: 80, available: 49, reserved: 20, onsite: 8, damaged: 3, condition: "GOOD", availability: "AVAILABLE", location: "Cable Wall B", lastService: "2026-05-25", nextService: "2026-11-25" },
  { id: "GEN-45K-01", name: "45 kVA Generator", category: "Power", model: "Perkins P45", total: 3, available: 1, reserved: 1, onsite: 1, damaged: 0, condition: "SERVICE DUE", availability: "ONSITE", location: "Yard Bay 2", lastService: "2026-03-15", nextService: "2026-06-15" },
  { id: "AUD-MIX-01", name: "Digital Audio Mixer", category: "Audio", model: "Behringer X32", total: 5, available: 3, reserved: 1, onsite: 1, damaged: 0, condition: "GOOD", availability: "AVAILABLE", location: "Audio Cabinet", lastService: "2026-05-09", nextService: "2026-11-09" },
];

export const INVENTORY_CATEGORIES = ["All", "LED Panels", "Processors", "Power", "Rigging", "Cables", "Audio"] as const;

import { client } from "@/lib/api/client";

export interface InventoryCategory {
  id: string;
  key: string;
  name: string;
  trackingType: "bulk" | "serialized";
  unit?: string | null;
  isActive?: boolean;
}

export interface CreateCategoryPayload {
  key: string;
  name: string;
  trackingType: "bulk" | "serialized";
  unit?: string;
  defaultBufferHours?: number;
}

export interface CreatePoolPayload {
  categoryId: string;
  name: string;
  totalQuantity: string | number;
  sku?: string;
  notes?: string;
}

export interface CreateItemPayload {
  categoryId: string;
  name: string;
  assetTag?: string;
  serialNumber?: string;
  condition?: "AVAILABLE" | "DAMAGED" | "UNDER_MAINTENANCE" | "LOST" | "RETIRED";
  notes?: string;
  purchasedAt?: string;
}

export async function getInventoryCategoriesApi(): Promise<InventoryCategory[]> {
  return client.get<InventoryCategory[]>("/api/inventory/categories?limit=200&active=true");
}

export async function getInventoryPoolsApi(): Promise<any[]> {
  return client.get<any[]>("/api/inventory/pools?limit=200&active=true");
}

export async function getInventoryItemsApi(): Promise<any[]> {
  return client.get<any[]>("/api/inventory/items?limit=200");
}

export async function createInventoryCategoryApi(payload: CreateCategoryPayload): Promise<InventoryCategory> {
  return client.post<InventoryCategory>("/api/inventory/categories", payload);
}

export async function createInventoryPoolApi(payload: CreatePoolPayload): Promise<any> {
  return client.post("/api/inventory/pools", {
    ...payload,
    totalQuantity: String(payload.totalQuantity),
  });
}

export async function createInventoryItemApi(payload: CreateItemPayload): Promise<any> {
  return client.post("/api/inventory/items", payload);
}

export async function getCombinedInventoryApi(): Promise<InventoryItem[]> {
  const [categories, pools, items] = await Promise.all([
    getInventoryCategoriesApi(),
    getInventoryPoolsApi(),
    getInventoryItemsApi(),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const mappedPools: InventoryItem[] = pools.map((p) => {
    const cat = categoryMap.get(p.categoryId);
    const totalQty = parseInt(p.totalQuantity || "0");
    return {
      id: p.sku || p.id,
      name: p.name,
      category: cat?.name || "Bulk Pool",
      model: "VV Standard",
      total: totalQty,
      available: totalQty,
      reserved: 0,
      onsite: 0,
      damaged: 0,
      condition: "GOOD",
      availability: "AVAILABLE",
      location: p.notes || "Main Warehouse",
      lastService: new Date().toISOString().slice(0, 10),
      nextService: new Date().toISOString().slice(0, 10),
    };
  });

  const mappedItems: InventoryItem[] = items.map((i) => {
    const cat = categoryMap.get(i.categoryId);
    const isDamaged = i.condition === "DAMAGED";
    return {
      id: i.assetTag || i.id,
      name: i.name,
      category: cat?.name || "Serialized Asset",
      model: i.notes || "VV Serialized",
      total: 1,
      available: isDamaged ? 0 : 1,
      reserved: 0,
      onsite: 0,
      damaged: isDamaged ? 1 : 0,
      condition: isDamaged ? "DAMAGED" : "GOOD",
      availability: isDamaged ? "RESERVED" : "AVAILABLE",
      location: "Main Warehouse",
      lastService: i.purchasedAt ? i.purchasedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      nextService: new Date().toISOString().slice(0, 10),
    };
  });

  return [...mappedPools, ...mappedItems];
}

export async function getInventoryItemDetailApi(id: string): Promise<InventoryItem> {
  // Try serialized item details first
  const items = await getInventoryItemsApi();
  const itemMatch = items.find((i) => i.assetTag === id || i.id === id);
  if (itemMatch) {
    const isDamaged = itemMatch.condition === "DAMAGED";
    return {
      id: itemMatch.assetTag || itemMatch.id,
      name: itemMatch.name,
      category: "Serialized Asset",
      model: itemMatch.notes || "VV Serialized",
      total: 1,
      available: isDamaged ? 0 : 1,
      reserved: 0,
      onsite: 0,
      damaged: isDamaged ? 1 : 0,
      condition: isDamaged ? "DAMAGED" : "GOOD",
      availability: isDamaged ? "RESERVED" : "AVAILABLE",
      location: "Main Warehouse",
      lastService: itemMatch.purchasedAt ? itemMatch.purchasedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      nextService: new Date().toISOString().slice(0, 10),
    };
  }

  // Try pool match second
  const pools = await getInventoryPoolsApi();
  const poolMatch = pools.find((p) => p.sku === id || p.id === id);
  if (poolMatch) {
    const totalQty = parseInt(poolMatch.totalQuantity || "0");
    return {
      id: poolMatch.sku || poolMatch.id,
      name: poolMatch.name,
      category: "Bulk Pool",
      model: "VV Standard",
      total: totalQty,
      available: totalQty,
      reserved: 0,
      onsite: 0,
      damaged: 0,
      condition: "GOOD",
      availability: "AVAILABLE",
      location: poolMatch.notes || "Main Warehouse",
      lastService: new Date().toISOString().slice(0, 10),
      nextService: new Date().toISOString().slice(0, 10),
    };
  }

  throw new Error(`Inventory item not found for id ${id}`);
}

export async function getPoolAvailabilityApi(poolId: string, start: string, end: string): Promise<any> {
  return client.get<any>(`/api/inventory/pools/${poolId}/availability?start=${start}&end=${end}`);
}