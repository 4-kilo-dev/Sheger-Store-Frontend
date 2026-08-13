import { client } from "@/lib/api/client";
import type { InventoryAvailability, InventoryCondition, InventoryItem } from "@/types/domain";
import {
  getInventoryReportApi,
  type InventoryReportPool,
  type InventoryReportRecord,
} from "@/services/reports.api";

export type InventoryEntityKind = "pool" | "item";

interface RawCategory {
  id: string;
  name: string;
}

interface RawPool {
  id: string;
  sku?: string;
  name: string;
  categoryId?: string;
  totalQuantity?: string;
  notes?: string;
}

interface RawSerializedItem {
  id: string;
  assetTag?: string;
  serialNumber?: string;
  name: string;
  categoryId?: string;
  notes?: string;
  condition?: string;
  purchasedAt?: string;
}

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

async function getCategoriesApi(): Promise<RawCategory[]> {
  return client.get<RawCategory[]>("/api/inventory/categories?limit=200&active=true");
}

async function getPoolsApi(): Promise<RawPool[]> {
  return client.get<RawPool[]>("/api/inventory/pools?limit=200&active=true");
}

async function getItemsApi(): Promise<RawSerializedItem[]> {
  return client.get<RawSerializedItem[]>("/api/inventory/items?limit=200&active=true");
}

export async function getInventoryCategoriesApi(): Promise<InventoryCategory[]> {
  return client.get<InventoryCategory[]>("/api/inventory/categories?limit=200&active=true");
}

export async function getInventoryPoolsApi(): Promise<RawPool[]> {
  return getPoolsApi();
}

export async function getPoolAvailabilityApi(
  poolId: string,
  from: string,
  to: string,
): Promise<{ available?: number; total?: number }> {
  const params = new URLSearchParams({ from, to });
  return client.get(`/api/inventory/pools/${poolId}/availability?${params.toString()}`);
}

export async function createInventoryCategoryApi(
  payload: CreateCategoryPayload,
): Promise<InventoryCategory> {
  return client.post<InventoryCategory>("/api/inventory/categories", payload);
}

export async function updateInventoryCategoryApi(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<InventoryCategory> {
  return client.patch<InventoryCategory>(`/api/inventory/categories/${id}`, payload);
}

export async function createInventoryPoolApi(payload: CreatePoolPayload): Promise<RawPool> {
  return client.post<RawPool>("/api/inventory/pools", {
    ...payload,
    totalQuantity: String(payload.totalQuantity),
  });
}

export async function updateInventoryPoolApi(
  id: string,
  payload: UpdatePoolPayload,
): Promise<RawPool> {
  const body: Record<string, unknown> = { ...payload };
  if (payload.totalQuantity != null) body.totalQuantity = String(payload.totalQuantity);
  return client.patch<RawPool>(`/api/inventory/pools/${id}`, body);
}

export async function createInventoryItemApi(
  payload: CreateItemPayload,
): Promise<RawSerializedItem> {
  return client.post<RawSerializedItem>("/api/inventory/items", payload);
}

export async function updateInventoryItemApi(
  id: string,
  payload: UpdateItemPayload,
): Promise<RawSerializedItem> {
  return client.patch<RawSerializedItem>(`/api/inventory/items/${id}`, payload);
}

export async function deactivateInventoryEntityApi(
  kind: InventoryEntityKind,
  id: string,
): Promise<unknown> {
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

/** Same enrichment as web getCombinedInventoryApi — report stats are source of truth. */
export async function getInventoryApi(): Promise<InventoryItem[]> {
  const [categories, pools, items, report] = await Promise.all([
    getCategoriesApi(),
    getPoolsApi(),
    getItemsApi(),
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
    const cat = categoryMap.get(p.categoryId || "");
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
      entityKind: "pool",
      poolId: p.id,
      categoryId: p.categoryId,
      name: p.name,
      category: cat?.name || "Bulk Pool",
      model: "Bulk pool",
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
    const cat = categoryMap.get(i.categoryId || "");
    const base = mapItemCondition(i.condition);
    return {
      id: i.assetTag || i.id,
      entityId: i.id,
      entityKind: "item",
      itemId: i.id,
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

export async function getInventoryItemApi(id: string): Promise<InventoryItem | undefined> {
  const all = await getInventoryApi();
  return all.find(
    (item) =>
      item.id === id ||
      item.entityId === id ||
      item.poolId === id ||
      item.itemId === id ||
      item.sku === id ||
      item.assetTag === id,
  );
}
