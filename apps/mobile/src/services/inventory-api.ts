import { client } from "@/lib/api/client";
import type { InventoryItem } from "@/types/domain";

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

async function getCategoriesApi(): Promise<RawCategory[]> {
  return client.get<RawCategory[]>("/api/inventory/categories?limit=200&active=true");
}

async function getPoolsApi(): Promise<RawPool[]> {
  return client.get<RawPool[]>("/api/inventory/pools?limit=200&active=true");
}

async function getItemsApi(): Promise<RawSerializedItem[]> {
  return client.get<RawSerializedItem[]>("/api/inventory/items?limit=200");
}

export async function getInventoryCategoriesApi(): Promise<InventoryCategory[]> {
  return client.get<InventoryCategory[]>("/api/inventory/categories?limit=200&active=true");
}

export async function createInventoryCategoryApi(
  payload: CreateCategoryPayload,
): Promise<InventoryCategory> {
  return client.post<InventoryCategory>("/api/inventory/categories", payload);
}

export async function createInventoryPoolApi(payload: CreatePoolPayload): Promise<RawPool> {
  return client.post<RawPool>("/api/inventory/pools", {
    ...payload,
    totalQuantity: String(payload.totalQuantity),
  });
}

export async function createInventoryItemApi(
  payload: CreateItemPayload,
): Promise<RawSerializedItem> {
  return client.post<RawSerializedItem>("/api/inventory/items", payload);
}

export async function getInventoryApi(): Promise<InventoryItem[]> {
  const [categories, pools, items] = await Promise.all([
    getCategoriesApi(),
    getPoolsApi(),
    getItemsApi(),
  ]);

  const categoryMap = new Map<string | undefined, RawCategory>(categories.map((c) => [c.id, c]));

  const mappedPools: InventoryItem[] = pools.map((p) => {
    const cat = categoryMap.get(p.categoryId);
    const totalQty = parseInt(p.totalQuantity || "0", 10);
    return {
      id: p.sku || p.id,
      poolId: p.id,
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
      itemId: i.id,
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
      lastService: i.purchasedAt
        ? i.purchasedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      nextService: new Date().toISOString().slice(0, 10),
    };
  });

  return [...mappedPools, ...mappedItems];
}

export async function getInventoryItemApi(id: string): Promise<InventoryItem | undefined> {
  const [items, pools] = await Promise.all([getItemsApi(), getPoolsApi()]);

  const itemMatch = items.find((i) => i.assetTag === id || i.id === id);
  if (itemMatch) {
    const isDamaged = itemMatch.condition === "DAMAGED";
    return {
      id: itemMatch.assetTag || itemMatch.id,
      itemId: itemMatch.id,
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
      lastService: itemMatch.purchasedAt
        ? itemMatch.purchasedAt.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      nextService: new Date().toISOString().slice(0, 10),
    };
  }

  const poolMatch = pools.find((p) => p.sku === id || p.id === id);
  if (poolMatch) {
    const totalQty = parseInt(poolMatch.totalQuantity || "0", 10);
    return {
      id: poolMatch.sku || poolMatch.id,
      poolId: poolMatch.id,
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

  return undefined;
}
