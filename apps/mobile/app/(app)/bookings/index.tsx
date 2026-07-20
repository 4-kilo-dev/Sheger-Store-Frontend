import { router } from "expo-router";
import { to } from "@/utils/routes";
import { Filter, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BookingCard } from "@/components/cards";
import {
  AppText,
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
import type { Booking, BookingStatus, PaymentStatus, ScreenType } from "@/types/domain";
import { STATUS_ORDER } from "@/types/domain";
import { useBookings, useStaff } from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { useAppContext } from "@/context/AppContext";

const TABS = ["All", "This Week", "Upcoming", "Onsite", "Last Week", "Assigned to Me"] as const;
const SCREEN_TYPES: ScreenType[] = [
  "P2.97",
  "P4",
  "P5",
  "P2.97-New",
  "P3.91 INDOOR",
  "P3.91 OUTDOOR",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["PAID", "ADVANCE", "UNPAID"];

export default function BookingsScreen() {
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings();
  const { data: staff = [] } = useStaff();
  const { canAny } = usePermissions();
  const { activeProfile } = useAppContext();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<BookingStatus | null>(null);
  const [screenFilter, setScreenFilter] = useState<ScreenType | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | null>(null);

  // Actors who can only see bookings they're assigned to (no view-all grant)
  // get an implicit scope on top of whatever they typed/tapped, mirroring web's
  // BookingsListPage isAssignedScopeOnly branch.
  const isAssignedScopeOnly =
    !canAny([PERMISSION.BOOKING_VIEW_ALL]) && canAny([PERMISSION.BOOKING_VIEW_ASSIGNED]);

  const rows = useMemo(() => {
    let result: Booking[] = BOOKINGS;
    if (isAssignedScopeOnly) {
      result = result.filter((booking) => booking.assignees.includes(activeProfile.name));
    }
    if (tab === "Onsite") result = result.filter((booking) => booking.status === "ONSITE");
    if (tab === "Upcoming")
      result = result.filter((booking) => new Date(booking.assemblyDate) > new Date());
    if (tab === "Assigned to Me")
      result = result.filter((booking) => booking.assignees.includes(activeProfile.name));
    if (statusFilter) result = result.filter((booking) => booking.status === statusFilter);
    if (screenFilter) result = result.filter((booking) => booking.screenType === screenFilter);
    if (assigneeFilter)
      result = result.filter((booking) => booking.assignees.includes(assigneeFilter));
    if (paymentFilter) result = result.filter((booking) => booking.payment === paymentFilter);
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
  }, [
    query,
    tab,
    statusFilter,
    screenFilter,
    assigneeFilter,
    paymentFilter,
    isAssignedScopeOnly,
    activeProfile.name,
  ]);

  const activeFilterCount = [statusFilter, screenFilter, assigneeFilter, paymentFilter].filter(
    Boolean,
  ).length;

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
          {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
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
        <Field label="Status">
          <View style={styles.choiceWrap}>
            {STATUS_ORDER.map((status) => (
              <FilterChip
                key={status}
                label={status}
                active={statusFilter === status}
                onPress={() => setStatusFilter((current) => (current === status ? null : status))}
              />
            ))}
          </View>
        </Field>
        <Field label="Screen Type">
          <View style={styles.choiceWrap}>
            {SCREEN_TYPES.map((type) => (
              <FilterChip
                key={type}
                label={type}
                active={screenFilter === type}
                onPress={() => setScreenFilter((current) => (current === type ? null : type))}
              />
            ))}
          </View>
        </Field>
        <Field label="Assignee">
          <View style={styles.choiceWrap}>
            {staff.map((member) => (
              <FilterChip
                key={member.id}
                label={member.name}
                active={assigneeFilter === member.name}
                onPress={() =>
                  setAssigneeFilter((current) => (current === member.name ? null : member.name))
                }
              />
            ))}
          </View>
        </Field>
        <Field label="Payment">
          <View style={styles.choiceWrap}>
            {PAYMENT_STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={status}
                active={paymentFilter === status}
                onPress={() => setPaymentFilter((current) => (current === status ? null : status))}
              />
            ))}
          </View>
        </Field>
        <Button
          variant="outline"
          onPress={() => {
            setStatusFilter(null);
            setScreenFilter(null);
            setAssigneeFilter(null);
            setPaymentFilter(null);
          }}
        >
          Clear filters
        </Button>
      </BottomSheet>
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
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
  choiceWrap: {
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
    backgroundColor: "rgba(245,183,49,0.10)",
  },
});
