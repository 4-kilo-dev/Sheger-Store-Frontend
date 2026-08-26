/** Category / pool shapes returned by inventory APIs (fields optional for partial rows). */
export type ScreenCategoryLike = {
  id?: string;
  key?: string | null;
  name?: string | null;
  unit?: string | null;
};

export type ScreenPoolLike = {
  id?: string;
  name?: string | null;
  categoryId?: string | null;
  unit?: string | null;
  isActive?: boolean | null;
  category?: ScreenCategoryLike | null;
};

function normalizeUnit(unit?: string | null): string {
  return String(unit || "")
    .toLowerCase()
    .replace(/\s/g, "")
    .replace("²", "2")
    .replace("^2", "2");
}

export function isScreenAreaUnit(unit?: string | null): boolean {
  const u = normalizeUnit(unit);
  return u === "m2" || u === "sqm" || u === "sq.m" || u === "sqmetres" || u === "sqmeters";
}

export function isScreenCategory(cat?: ScreenCategoryLike | null): boolean {
  if (!cat) return false;
  const key = String(cat.key || "").toLowerCase();
  const name = String(cat.name || "").toLowerCase();
  if (
    key === "screen" ||
    key === "led_screen" ||
    key === "led_panels" ||
    key === "led_panel" ||
    key.includes("screen")
  ) {
    return true;
  }
  if (/led\s*screen|led\s*panel|screen\s*module/.test(name)) return true;
  if (isScreenAreaUnit(cat.unit)) return true;
  return false;
}

export function looksLikeScreenPoolName(name?: string | null): boolean {
  const n = String(name || "");
  if (!n.trim()) return false;
  if (/\b(cable|truss|generator|mixer|processor|distributor|laptop|controller)\b/i.test(n)) {
    return false;
  }
  if (/^p\d+(\.\d+)?\b/i.test(n) && /led|panel|screen|outdoor|indoor/i.test(n)) return true;
  if (/\bled\b.*\b(panel|screen|module)\b|\b(panel|screen|module)\b.*\bled\b/i.test(n)) return true;
  return false;
}

export function isScreenPool(pool: ScreenPoolLike): boolean {
  if (pool.isActive === false) return false;
  if (isScreenCategory(pool.category)) return true;
  if (isScreenAreaUnit(pool.unit) || isScreenAreaUnit(pool.category?.unit)) return true;
  return looksLikeScreenPoolName(pool.name);
}

/** Keep only LED screen module pools. Never falls back to full inventory. */
export function filterScreenPools<T extends ScreenPoolLike>(
  pools: T[],
  categories: ScreenCategoryLike[] = [],
): T[] {
  const screenCats = categories.filter(isScreenCategory);
  const screenCatIds = new Set(screenCats.map((c) => c.id).filter((id): id is string => !!id));

  let filtered: T[];
  if (screenCatIds.size > 0) {
    filtered = pools.filter(
      (p) => p.isActive !== false && !!p.categoryId && screenCatIds.has(p.categoryId),
    );
  } else {
    filtered = pools.filter(isScreenPool);
  }

  return [...filtered].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}
