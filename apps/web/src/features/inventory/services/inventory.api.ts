export type InventoryCondition = "GOOD" | "CHECKED OUT" | "SERVICE DUE" | "DAMAGED";
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
  checkedOut?: boolean;
  lastService: string;
  nextService: string;
}


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
      damaged > 0 && available === 0
        ? "DAMAGED"
        : damaged > 0
          ? "SERVICE DUE"
          : onsite > 0 && available === 0
            ? "CHECKED OUT"
            : "GOOD";

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
    const checkedOut = Boolean(i.checkedOut);
    const condition: InventoryCondition =
      checkedOut && base.condition === "GOOD" ? "CHECKED OUT" : base.condition;

    return {
      id: i.assetTag || i.id,
      entityId: i.id,
      entityKind: "item" as const,
      categoryId: i.categoryId,
      name: i.name,
      category: cat?.name || "Serialized Asset",
      model: i.serialNumber ? `S/N ${i.serialNumber}` : "Serialized",
      total: 1,
      available: checkedOut ? 0 : base.available,
      reserved: !checkedOut && base.available === 0 && base.damaged === 0 ? 1 : 0,
      onsite: checkedOut ? 1 : 0,
      damaged: base.damaged,
      condition,
      availability: checkedOut ? "ONSITE" : base.availability,
      location: checkedOut ? "Onsite / checked out" : "Warehouse",
      notes: i.notes || undefined,
      assetTag: i.assetTag || undefined,
      serialNumber: i.serialNumber || undefined,
      itemCondition: i.condition,
      checkedOut,
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
