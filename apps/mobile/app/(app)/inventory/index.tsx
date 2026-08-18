import { ArrowUpDown, Boxes, Filter, PackageCheck, ShieldAlert, Wrench } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { InventoryCard } from "@/components/cards";
import {
  AppText,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import {
  useCreateInventoryCategory,
  useCreateInventoryItem,
  useCreateInventoryPool,
  useInventory,
  useInventoryCategories,
} from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { alpha, colors } from "@/theme/tokens";
import type { InventoryCondition, InventoryAvailability, InventoryItem } from "@/types/domain";

const CONDITIONS: InventoryCondition[] = ["GOOD", "SERVICE DUE", "DAMAGED"];
const AVAILABILITIES: InventoryAvailability[] = ["AVAILABLE", "RESERVED", "ONSITE"];

function matchesQuery(haystack: Array<string | number | null | undefined>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((part) => String(part ?? "").toLowerCase().includes(needle));
}

function matchesCategory(item: InventoryItem, category: string): boolean {
  if (category === "All") return true;
  return (item.category || "").trim().toLowerCase() === category.trim().toLowerCase();
}

function toCategoryKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

export default function InventoryScreen() {
  const { data: INVENTORY = [], isLoading, isError, refetch } = useInventory();
  const { data: categoryRecords = [] } = useInventoryCategories();
  const { can } = usePermissions();
  const canManageInventory = can(PERMISSION.INVENTORY_MANAGE);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [conditionFilter, setConditionFilter] = useState<InventoryCondition | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<InventoryAvailability | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const totals = useMemo(
    () =>
      INVENTORY.reduce(
        (acc, item) => ({
          units: acc.units + item.total,
          available: acc.available + item.available,
          onsite: acc.onsite + item.onsite,
          attention: acc.attention + item.damaged,
        }),
        { units: 0, available: 0, onsite: 0, attention: 0 },
      ),
    [INVENTORY],
  );

  const locations = useMemo(
    () => Array.from(new Set(INVENTORY.map((item) => item.location).filter(Boolean))).sort(),
    [INVENTORY],
  );

  const categoryTabs = useMemo(() => {
    const names = new Set<string>();
    for (const item of INVENTORY) {
      const name = item.category?.trim();
      if (name) names.add(name);
    }
    for (const record of categoryRecords) {
      if (record.isActive === false) continue;
      const name = record.name?.trim();
      if (name) names.add(name);
    }
    return ["All", ...[...names].sort((a, b) => a.localeCompare(b))];
  }, [INVENTORY, categoryRecords]);

  useEffect(() => {
    if (category !== "All" && !categoryTabs.includes(category)) {
      setCategory("All");
    }
  }, [category, categoryTabs]);

  const rows = useMemo(
    () =>
      INVENTORY.filter(
        (item) =>
          matchesCategory(item, category) &&
          (!conditionFilter || item.condition === conditionFilter) &&
          (!availabilityFilter || item.availability === availabilityFilter) &&
          (!locationFilter || item.location === locationFilter) &&
          matchesQuery(
            [
              item.id,
              item.entityId,
              item.name,
              item.model,
              item.category,
              item.sku,
              item.assetTag,
              item.serialNumber,
              item.location,
              item.notes,
            ],
            query,
          ),
      ),
    [INVENTORY, category, query, conditionFilter, availabilityFilter, locationFilter],
  );

  const activeFilterCount = [conditionFilter, availabilityFilter, locationFilter].filter(
    Boolean,
  ).length;

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading inventory..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load inventory from the server." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.listHeader}>
        <View style={styles.header}>
          <Field label="Warehouse Control">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search item, asset code, model..."
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </Field>
          {canManageInventory ? (
            <Button icon={Boxes} onPress={() => setAddOpen(true)}>
              Add Inventory Item
            </Button>
          ) : null}
        </View>

        <View style={styles.stats}>
          <View style={styles.statTile}>
            <StatCard
              label="Total Units"
              value={totals.units}
              icon={Boxes}
              tone={colors.foreground}
            />
          </View>
          <View style={styles.statTile}>
            <StatCard
              label="Available Now"
              value={totals.available}
              icon={PackageCheck}
              tone={colors.success}
            />
          </View>
          <View style={styles.statTile}>
            <StatCard
              label="Currently Onsite"
              value={totals.onsite}
              icon={Wrench}
              tone={colors.status.ACCEPTED}
            />
          </View>
          <View style={styles.statTile}>
            <StatCard
              label="Damaged / Hold"
              value={totals.attention}
              icon={ShieldAlert}
              tone={colors.destructive}
            />
          </View>
        </View>

        <SegmentedTabs tabs={categoryTabs} value={category} onChange={setCategory} />
        <View style={styles.filterRow}>
          <Button variant="outline" icon={Filter} onPress={() => setFiltersOpen(true)}>
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
          </Button>
        </View>
      </View>

      {rows.length === 0 ? (
        <EmptyState title="No inventory items" />
      ) : (
        <View style={styles.listContent}>
          {rows.map((item) => (
            <InventoryCard key={item.entityId || item.id} item={item} />
          ))}
        </View>
      )}

      <BottomSheet
        visible={filtersOpen}
        title="Inventory filters"
        onClose={() => setFiltersOpen(false)}
      >
        <Field label="Condition">
          <View style={styles.chipWrap}>
            {CONDITIONS.map((c) => (
              <Chip
                key={c}
                label={c}
                active={conditionFilter === c}
                onPress={() => setConditionFilter((cur) => (cur === c ? null : c))}
              />
            ))}
          </View>
        </Field>
        <Field label="Availability">
          <View style={styles.chipWrap}>
            {AVAILABILITIES.map((a) => (
              <Chip
                key={a}
                label={a}
                active={availabilityFilter === a}
                onPress={() => setAvailabilityFilter((cur) => (cur === a ? null : a))}
              />
            ))}
          </View>
        </Field>
        <Field label="Location">
          <View style={styles.chipWrap}>
            {locations.map((loc) => (
              <Chip
                key={loc}
                label={loc}
                active={locationFilter === loc}
                onPress={() => setLocationFilter((cur) => (cur === loc ? null : loc))}
              />
            ))}
          </View>
        </Field>
        <Button
          variant="outline"
          icon={ArrowUpDown}
          onPress={() => {
            setConditionFilter(null);
            setAvailabilityFilter(null);
            setLocationFilter(null);
          }}
        >
          Clear filters
        </Button>
      </BottomSheet>

      <AddInventorySheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <AppText
        variant="data"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "800" }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function AddInventorySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { data: categories = [] } = useInventoryCategories();
  const createCategory = useCreateInventoryCategory();
  const createPool = useCreateInventoryPool();
  const createItem = useCreateInventoryItem();

  const [kind, setKind] = useState<"bulk" | "serialized">("bulk");
  const [categoryId, setCategoryId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matchingCategories = categories.filter(
    (c) => c.trackingType === kind && c.isActive !== false,
  );

  useEffect(() => {
    if (!visible) return;
    setCategoryId("");
    setCreatingCategory(matchingCategories.length === 0);
  }, [kind, visible]);

  const busy = createCategory.isPending || createPool.isPending || createItem.isPending;

  const reset = () => {
    setKind("bulk");
    setCategoryId("");
    setCreatingCategory(false);
    setNewCategoryName("");
    setName("");
    setQuantity("1");
    setSku("");
    setAssetTag("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    try {
      let resolvedCategoryId = categoryId;
      if (creatingCategory) {
        const catName = newCategoryName.trim();
        if (!catName) {
          setError("Category name is required.");
          return;
        }
        const key = toCategoryKey(catName);
        const created = await createCategory.mutateAsync({
          key,
          name: catName,
          trackingType: kind,
          unit: kind === "bulk" ? "pcs" : undefined,
        });
        resolvedCategoryId = created.id;
      }
      if (!resolvedCategoryId) {
        setError("Select or create a category.");
        return;
      }
      if (kind === "bulk") {
        const qty = parseFloat(quantity);
        if (!Number.isFinite(qty) || qty < 0) {
          setError("Quantity must be 0 or greater.");
          return;
        }
        await createPool.mutateAsync({
          categoryId: resolvedCategoryId,
          name: trimmedName,
          totalQuantity: quantity,
          sku: sku.trim() || undefined,
        });
      } else {
        await createItem.mutateAsync({
          categoryId: resolvedCategoryId,
          name: trimmedName,
          assetTag: assetTag.trim() || undefined,
          condition: "AVAILABLE",
        });
      }
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add inventory.");
    }
  };

  return (
    <BottomSheet visible={visible} title="Add Inventory" onClose={onClose}>
      <Field label="Tracking Type">
        <View style={styles.chipWrap}>
          <Chip label="Bulk pool" active={kind === "bulk"} onPress={() => setKind("bulk")} />
          <Chip
            label="Serialized item"
            active={kind === "serialized"}
            onPress={() => setKind("serialized")}
          />
        </View>
      </Field>

      {!creatingCategory ? (
        <Field label="Category">
          <View style={styles.chipWrap}>
            {matchingCategories.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                active={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </View>
          <Button variant="ghost" onPress={() => setCreatingCategory(true)}>
            + New category
          </Button>
        </Field>
      ) : (
        <Field label="New Category Name">
          <Input
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder={kind === "bulk" ? "e.g. Power/Data Cables" : "e.g. LED Controllers"}
          />
        </Field>
      )}

      <Field label="Name">
        <Input
          value={name}
          onChangeText={setName}
          placeholder={
            kind === "bulk" ? "e.g. Cat6 Waterproof Data Cable 10m" : "e.g. Novastar VX1000"
          }
        />
      </Field>

      {kind === "bulk" ? (
        <>
          <Field label="Total Quantity">
            <Input value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </Field>
          <Field label="SKU (optional)">
            <Input value={sku} onChangeText={setSku} placeholder="e.g. CBL-CAT6-10M" />
          </Field>
        </>
      ) : (
        <Field label="Asset Tag (optional)">
          <Input value={assetTag} onChangeText={setAssetTag} placeholder="e.g. CTRL-VX1000-003" />
        </Field>
      )}

      {error ? (
        <AppText variant="small" color={colors.destructive}>
          {error}
        </AppText>
      ) : null}

      <Button disabled={busy} onPress={handleSubmit}>
        {busy ? "Saving..." : kind === "bulk" ? "Add Pool" : "Add Item"}
      </Button>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    gap: 16,
    marginBottom: 12,
  },
  header: {
    gap: 12,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statTile: {
    width: "47%",
    flexGrow: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  listContent: {
    gap: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: alpha(colors.accent, 0.1),
  },
});
