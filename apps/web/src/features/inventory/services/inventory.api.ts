export type InventoryCondition = "GOOD" | "SERVICE DUE" | "DAMAGED";
export type InventoryAvailability = "AVAILABLE" | "RESERVED" | "ONSITE";
export type InventoryEntityKind = "pool" | "item";

export interface InventoryItem {
  id: string;
  /** Real UUID used for PATCH/deactivate. */
  entityId: string;
  entityKind: InventoryEntityKind;
  categoryId?: string;
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
  /** Optional inventory notes — never shown as location. */
  notes?: string;
  sku?: string;
  assetTag?: string;
  serialNumber?: string;
  itemCondition?: "AVAILABLE" | "DAMAGED" | "UNDER_MAINTENANCE" | "LOST" | "RETIRED";
  lastService: string;
  nextService: string;
}

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: "PNL-P297-01", entityId: "PNL-P297-01", entityKind: "pool", name: "P2.97 LED Panel", category: "LED Panels", model: "ROE Black Pearl 2V2", total: 192, available: 128, reserved: 48, onsite: 12, damaged: 4, condition: "GOOD", availability: "AVAILABLE", location: "Rack A1–A6", lastService: "2026-05-18", nextService: "2026-08-18" },
  { id: "PNL-P391-O", entityId: "PNL-P391-O", entityKind: "pool", name: "P3.91 Outdoor Panel", category: "LED Panels", model: "Absen A3 Pro", total: 144, available: 72, reserved: 48, onsite: 20, damaged: 4, condition: "GOOD", availability: "RESERVED", location: "Rack B1–B5", lastService: "2026-05-22", nextService: "2026-08-22" },
  { id: "PNL-P4-02", entityId: "PNL-P4-02", entityKind: "pool", name: "P4 LED Panel", category: "LED Panels", model: "Gloshine P4", total: 96, available: 20, reserved: 60, onsite: 14, damaged: 2, condition: "SERVICE DUE", availability: "RESERVED", location: "Rack C1–C4", lastService: "2026-02-10", nextService: "2026-06-10" },
  { id: "PRC-NVX-01", entityId: "PRC-NVX-01", entityKind: "item", name: "Novastar Video Processor", category: "Processors", model: "NovaStar VX1000", total: 12, available: 7, reserved: 3, onsite: 2, damaged: 0, condition: "GOOD", availability: "AVAILABLE", location: "Secure Cabinet 1", lastService: "2026-04-12", nextService: "2026-10-12" },
  { id: "PRC-BRM-02", entityId: "PRC-BRM-02", entityKind: "item", name: "Brompton Processor", category: "Processors", model: "Tessera S8", total: 6, available: 2, reserved: 2, onsite: 1, damaged: 1, condition: "DAMAGED", availability: "AVAILABLE", location: "Secure Cabinet 1", lastService: "2026-05-01", nextService: "2026-07-01" },
  { id: "PWR-32A-01", entityId: "PWR-32A-01", entityKind: "pool", name: "32A Power Distributor", category: "Power", model: "VV PDU-32", total: 18, available: 9, reserved: 5, onsite: 3, damaged: 1, condition: "SERVICE DUE", availability: "AVAILABLE", location: "Electrical Bay", lastService: "2026-03-06", nextService: "2026-06-06" },
  { id: "TRS-2M-01", entityId: "TRS-2M-01", entityKind: "pool", name: "2m Box Truss", category: "Rigging", model: "Global F34", total: 64, available: 32, reserved: 20, onsite: 12, damaged: 0, condition: "GOOD", availability: "ONSITE", location: "Rigging Zone", lastService: "2026-04-28", nextService: "2026-10-28" },
  { id: "CBL-SDI-15", entityId: "CBL-SDI-15", entityKind: "pool", name: "15m SDI Cable", category: "Cables", model: "Canare L-5CFB", total: 80, available: 49, reserved: 20, onsite: 8, damaged: 3, condition: "GOOD", availability: "AVAILABLE", location: "Cable Wall B", lastService: "2026-05-25", nextService: "2026-11-25" },
  { id: "GEN-45K-01", entityId: "GEN-45K-01", entityKind: "pool", name: "45 kVA Generator", category: "Power", model: "Perkins P45", total: 3, available: 1, reserved: 1, onsite: 1, damaged: 0, condition: "SERVICE DUE", availability: "ONSITE", location: "Yard Bay 2", lastService: "2026-03-15", nextService: "2026-06-15" },
  { id: "AUD-MIX-01", entityId: "AUD-MIX-01", entityKind: "item", name: "Digital Audio Mixer", category: "Audio", model: "Behringer X32", total: 5, available: 3, reserved: 1, onsite: 1, damaged: 0, condition: "GOOD", availability: "AVAILABLE", location: "Audio Cabinet", lastService: "2026-05-09", nextService: "2026-11-09" },
];

export const INVENTORY_CATEGORIES = ["All", "LED Panels", "Processors", "Power", "Rigging", "Cables", "Audio"] as const;

import { client } from "@/lib/api/client";
import {
  getInventoryReportApi,
  type InventoryReportPool,
  type InventoryReportRecord,
} from "@/features/reports/services/reports.api";

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

export interface UpdateCategoryPayload {
  name?: string;
  unit?: string;
  defaultBufferHours?: number;
  isActive?: boolean;
}

export interface CreatePoolPayload {
  categoryId: string;
  name: string;
  totalQuantity: string | number;
  sku?: string;
  notes?: string;
}

export interface UpdatePoolPayload {
  name?: string;
  sku?: string;
  totalQuantity?: string | number;
  notes?: string;
  isActive?: boolean;
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

export interface UpdateItemPayload {
  name?: string;
  assetTag?: string;
  serialNumber?: string;
  condition?: "AVAILABLE" | "DAMAGED" | "UNDER_MAINTENANCE" | "LOST" | "RETIRED";
  notes?: string;
  purchasedAt?: string | null;
  isActive?: boolean;
}

export async function getInventoryCategoriesApi(): Promise<InventoryCategory[]> {
  return client.get<InventoryCategory[]>("/api/inventory/categories?limit=200&active=true");
}

export async function getInventoryPoolsApi(): Promise<any[]> {
  return client.get<any[]>("/api/inventory/pools?limit=200&active=true");
}

export async function getInventoryItemsApi(): Promise<any[]> {
  return client.get<any[]>("/api/inventory/items?limit=200&active=true");
}

export async function createInventoryCategoryApi(payload: CreateCategoryPayload): Promise<InventoryCategory> {
  return client.post<InventoryCategory>("/api/inventory/categories", payload);
}

export async function updateInventoryCategoryApi(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<InventoryCategory> {
  return client.patch<InventoryCategory>(`/api/inventory/categories/${id}`, payload);
}

export async function createInventoryPoolApi(payload: CreatePoolPayload): Promise<any> {
  return client.post("/api/inventory/pools", {
    ...payload,
    totalQuantity: String(payload.totalQuantity),
  });
}

export async function updateInventoryPoolApi(id: string, payload: UpdatePoolPayload): Promise<any> {
  const body: Record<string, unknown> = { ...payload };
  if (payload.totalQuantity != null) body.totalQuantity = String(payload.totalQuantity);
  return client.patch(`/api/inventory/pools/${id}`, body);
}

export async function createInventoryItemApi(payload: CreateItemPayload): Promise<any> {
  return client.post("/api/inventory/items", payload);
}

export async function updateInventoryItemApi(id: string, payload: UpdateItemPayload): Promise<any> {
  return client.patch(`/api/inventory/items/${id}`, payload);
}

export async function deactivateInventoryEntityApi(
  kind: InventoryEntityKind,
  id: string,
): Promise<any> {
  if (kind === "pool") return updateInventoryPoolApi(id, { isActive: false });
  return updateInventoryItemApi(id, { isActive: false });
}

export async function deactivateInventoryCategoryApi(id: string): Promise<InventoryCategory> {
  return updateInventoryCategoryApi(id, { isActive: false });
}

function mapItemCondition(condition?: string): {
  condition: InventoryCondition;
  availability: InventoryAvailability;
  available: number;
  damaged: number;
} {
  if (condition === "DAMAGED" || condition === "LOST" || condition === "RETIRED") {
    return { condition: "DAMAGED", availability: "RESERVED", available: 0, damaged: 1 };
  }
  if (condition === "UNDER_MAINTENANCE") {
    return { condition: "SERVICE DUE", availability: "RESERVED", available: 0, damaged: 0 };
  }
  return { condition: "GOOD", availability: "AVAILABLE", available: 1, damaged: 0 };
}

function purchasedOrUnknown(purchasedAt?: string | null): string {
  return purchasedAt ? purchasedAt.slice(0, 10) : "—";
}

export async function getCombinedInventoryApi(): Promise<InventoryItem[]> {
  const [categories, pools, items, report] = await Promise.all([
    getInventoryCategoriesApi(),
    getInventoryPoolsApi(),
    getInventoryItemsApi(),
    getInventoryReportApi().catch(() => [] as InventoryReportRecord[]),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const poolStats = new Map<string, InventoryReportPool>();
  for (const cat of report) {
    for (const p of cat.pools || []) {
      if (p.poolId) poolStats.set(p.poolId, p);
    }
  }

  const mappedPools: InventoryItem[] = pools.map((p) => {
    const cat = categoryMap.get(p.categoryId);
    const totalQty = Number.parseFloat(String(p.totalQuantity || "0")) || 0;
    const stats = poolStats.get(p.id);
    const onsite = stats?.checkedOutQuantity ?? 0;
    const damaged = stats?.damagedQuantity ?? 0;
    const available = stats?.availableQuantity ?? Math.max(0, totalQty - onsite - damaged);
    const reserved = Math.max(0, totalQty - available - onsite - damaged);
    const availability: InventoryAvailability =
      onsite > 0 ? "ONSITE" : reserved > 0 ? "RESERVED" : "AVAILABLE";
    const condition: InventoryCondition =
      damaged > 0 && available === 0 ? "DAMAGED" : damaged > 0 ? "SERVICE DUE" : "GOOD";

    return {
      id: p.sku || p.id,
      entityId: p.id,
      entityKind: "pool" as const,
      categoryId: p.categoryId,
      name: p.name,
      category: cat?.name || "Bulk Pool",
      model: cat?.unit ? `Unit: ${cat.unit}` : "Bulk pool",
      total: totalQty,
      available,
      reserved,
      onsite,
      damaged,
      condition,
      availability,
      location: onsite > 0 ? "Onsite / checked out" : "Warehouse",
      notes: p.notes || undefined,
      sku: p.sku || undefined,
      lastService: "—",
      nextService: "—",
    };
  });

  const mappedItems: InventoryItem[] = items.map((i) => {
    const cat = categoryMap.get(i.categoryId);
    const base = mapItemCondition(i.condition);

    return {
      id: i.assetTag || i.id,
      entityId: i.id,
      entityKind: "item" as const,
      categoryId: i.categoryId,
      name: i.name,
      category: cat?.name || "Serialized Asset",
      model: i.serialNumber ? `S/N ${i.serialNumber}` : "Serialized",
      total: 1,
      available: base.available,
      reserved: base.available === 0 && base.damaged === 0 ? 1 : 0,
      onsite: 0,
      damaged: base.damaged,
      condition: base.condition,
      availability: base.availability,
      location: "Warehouse",
      notes: i.notes || undefined,
      assetTag: i.assetTag || undefined,
      serialNumber: i.serialNumber || undefined,
      itemCondition: i.condition,
      lastService: purchasedOrUnknown(i.purchasedAt),
      nextService: "—",
    };
  });

  return [...mappedPools, ...mappedItems];
}

export async function getInventoryItemDetailApi(id: string): Promise<InventoryItem> {
  const all = await getCombinedInventoryApi();
  const match = all.find((row) => row.id === id || row.entityId === id || row.sku === id || row.assetTag === id);
  if (!match) throw new Error(`Inventory item not found for id ${id}`);
  return match;
}

export async function getPoolAvailabilityApi(poolId: string, from: string, to: string): Promise<any> {
  const params = new URLSearchParams({ from, to });
  return client.get<any>(`/api/inventory/pools/${poolId}/availability?${params.toString()}`);
}
