import { router } from "expo-router";
import {
  ArrowUpDown,
  Boxes,
  ChevronDown,
  Filter,
  PackageCheck,
  Search,
  ShieldAlert,
  Wrench,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { InventoryCard } from "@/components/cards";
import {
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  NativeList,
  Screen,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import { INVENTORY_CATEGORIES } from "@/data/mock";
import { useInventory } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";

export default function InventoryScreen() {
  const { data: INVENTORY = [], isLoading, isError, refetch } = useInventory();
  const [category, setCategory] = useState<(typeof INVENTORY_CATEGORIES)[number]>("All");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const rows = useMemo(
    () =>
      INVENTORY.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          `${item.id} ${item.name} ${item.model}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [INVENTORY, category, query],
  );

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
    <Screen scroll={false}>
      <View style={styles.header}>
        <View>
          <Field label="Warehouse Control">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search item, asset code, model..."
            />
          </Field>
        </View>
        <Button icon={Boxes}>Add Inventory Item</Button>
      </View>

      <View style={styles.stats}>
        <StatCard label="Total Units" value={totals.units} icon={Boxes} tone={colors.foreground} />
        <StatCard
          label="Available Now"
          value={totals.available}
          icon={PackageCheck}
          tone={colors.success}
        />
        <StatCard
          label="Currently Onsite"
          value={totals.onsite}
          icon={Wrench}
          tone={colors.status.ACCEPTED}
        />
        <StatCard
          label="Damaged / Hold"
          value={totals.attention}
          icon={ShieldAlert}
          tone={colors.destructive}
        />
      </View>

      <SegmentedTabs tabs={INVENTORY_CATEGORIES} value={category} onChange={setCategory} />
      <View style={styles.filterRow}>
        <Button variant="outline" icon={Filter} onPress={() => setFiltersOpen(true)}>
          Condition
        </Button>
        <Button variant="outline" icon={Filter} onPress={() => setFiltersOpen(true)}>
          Location
        </Button>
        <Button variant="outline" icon={ArrowUpDown} onPress={() => setFiltersOpen(true)}>
          Availability
        </Button>
      </View>

      <NativeList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState title="No inventory items" />}
        renderItem={({ item }) => <InventoryCard item={item} />}
      />

      <BottomSheet
        visible={filtersOpen}
        title="Inventory filters"
        onClose={() => setFiltersOpen(false)}
      >
        {["Condition", "Location", "Availability", "Next service"].map((label) => (
          <Button key={label} variant="outline" icon={ChevronDown}>
            {label}
          </Button>
        ))}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
  },
  stats: {
    gap: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  listContent: {
    gap: 12,
    paddingBottom: 112,
  },
});
