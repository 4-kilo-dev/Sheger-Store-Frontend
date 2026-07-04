import { router } from "expo-router";
import { to } from "@/utils/routes";
import { Calendar, ChevronDown, Filter, Plus, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BookingCard } from "@/components/cards";
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
} from "@/components/ui";
import { colors } from "@/theme/tokens";
import type { Booking } from "@/types/domain";
import { useBookings } from "@/hooks/useOperations";

const TABS = ["All", "This Week", "Upcoming", "Onsite", "Last Week", "Assigned to Me"] as const;

export default function BookingsScreen() {
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    let result: Booking[] = BOOKINGS;
    if (tab === "Onsite") result = result.filter((booking) => booking.status === "ONSITE");
    if (tab === "Upcoming")
      result = result.filter((booking) => new Date(booking.assemblyDate) > new Date());
    if (query) {
      const lower = query.toLowerCase();
      result = result.filter(
        (booking) =>
          booking.code.toLowerCase().includes(lower) ||
          booking.client.toLowerCase().includes(lower) ||
          booking.venue.toLowerCase().includes(lower),
      );
    }
    return result;
  }, [query, tab]);

  const toggle = (code: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading bookings..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load bookings from the server." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View>
          <Field label={`${BOOKINGS.length} total`}>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search code, client, venue..."
            />
          </Field>
        </View>
        <Button icon={Plus} onPress={() => router.push(to("/bookings/new"))}>
          New Booking
        </Button>
      </View>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      <View style={styles.filterRow}>
        <Button variant="outline" icon={Filter} onPress={() => setFilterOpen(true)}>
          Filters
        </Button>
        <Button variant="outline" icon={Calendar} onPress={() => setFilterOpen(true)}>
          Date range
        </Button>
        <Button variant="outline" icon={ChevronDown} onPress={() => setFilterOpen(true)}>
          Assembly Date
        </Button>
      </View>

      {selected.size > 0 ? (
        <View style={styles.bulkBar}>
          <Button variant="outline">{selected.size} selected</Button>
          <Button variant="outline">Change Status</Button>
          <Button variant="danger">Cancel Selected</Button>
        </View>
      ) : null}

      <NativeList
        data={rows}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No bookings" detail="Adjust search or filters to view bookings." />
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            selectable
            selected={selected.has(item.code)}
            onToggle={() => toggle(item.code)}
          />
        )}
      />

      <BottomSheet
        visible={filterOpen}
        title="Booking filters"
        onClose={() => setFilterOpen(false)}
      >
        {["Status", "Screen Type", "Assignee", "Date range", "Payment"].map((label) => (
          <Button key={label} variant="outline" icon={Search}>
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  bulkBar: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.08)",
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  listContent: {
    gap: 12,
    paddingBottom: 112,
  },
});
