import { router } from "expo-router";
import { to } from "@/utils/routes";
import { Filter, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";
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
  TextArea,
} from "@/components/ui";
import { alpha, colors } from "@/theme/tokens";
import type { Booking, BookingStatus, PaymentStatus } from "@/types/domain";
import { STATUS_LABELS, STATUS_ORDER } from "@/types/domain";
import { useBookings, useStaff } from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { useAppContext } from "@/context/AppContext";
import { transitionBookingStatusApi } from "@/services/bookings-api";

const TABS = ["All", "This Week", "Upcoming", "Onsite", "Last Week", "Assigned to Me"] as const;
const PAYMENT_STATUSES: PaymentStatus[] = ["PAID", "ADVANCE", "UNPAID"];

function matchesQuery(haystack: Array<string | number | null | undefined>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((part) => String(part ?? "").toLowerCase().includes(needle));
}

async function runBulkTransitions(
  bookings: Booking[],
  toStatus: BookingStatus,
  reason: string,
  override = false,
): Promise<{ ok: string[]; failed: { code: string; message: string }[] }> {
  const ok: string[] = [];
  const failed: { code: string; message: string }[] = [];
  for (const booking of bookings) {
    try {
      await transitionBookingStatusApi(booking.id, toStatus, reason, override);
      ok.push(booking.code);
    } catch (err: unknown) {
      failed.push({
        code: booking.code,
        message: err instanceof Error ? err.message : "Transition failed",
      });
    }
  }
  return { ok, failed };
}

export default function BookingsScreen() {
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings();
  const { data: staff = [] } = useStaff();
  const { canAny, can } = usePermissions();
  const { activeProfile } = useAppContext();
  const canCreateBooking = can(PERMISSION.BOOKING_CREATE);
  const canCancelOverride = can(PERMISSION.BOOKING_CANCEL_OVERRIDE);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<BookingStatus | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | null>(null);
  const [bulkModal, setBulkModal] = useState<"status" | "cancel" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BookingStatus>("CONFIRMED");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const isAssignedScopeOnly =
    !canAny([PERMISSION.BOOKING_VIEW_ALL]) && canAny([PERMISSION.BOOKING_VIEW_ASSIGNED]);

  const rows = useMemo(() => {
    let result: Booking[] = BOOKINGS;
    if (isAssignedScopeOnly) {
      result = result.filter((booking) => booking.assignees.includes(activeProfile.name));
    }
    if (tab === "Onsite") {
      result = result.filter((booking) => booking.status === "ONSITE");
    } else if (tab === "Upcoming") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      result = result.filter((booking) => {
        const d = new Date(booking.assemblyDate);
        return !isNaN(d.getTime()) && d >= now;
      });
    } else if (tab === "This Week") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      result = result.filter((booking) => {
        const d = new Date(booking.eventDate);
        return !isNaN(d.getTime()) && d >= startOfWeek && d <= endOfWeek;
      });
    } else if (tab === "Last Week") {
      const now = new Date();
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setHours(0, 0, 0, 0);
      startOfThisWeek.setDate(now.getDate() - now.getDay());
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);
      result = result.filter((booking) => {
        const d = new Date(booking.eventDate);
        return !isNaN(d.getTime()) && d >= startOfLastWeek && d <= endOfLastWeek;
      });
    } else if (tab === "Assigned to Me") {
      result = result.filter((booking) => booking.assignees.includes(activeProfile.name));
    }
    if (statusFilter) result = result.filter((booking) => booking.status === statusFilter);
    if (assigneeFilter)
      result = result.filter((booking) => booking.assignees.includes(assigneeFilter));
    if (paymentFilter) result = result.filter((booking) => booking.payment === paymentFilter);
    if (query.trim()) {
      result = result.filter((booking) =>
        matchesQuery(
          [
            booking.code,
            booking.id,
            booking.client,
            booking.contactPerson,
            booking.contactPhone,
            booking.venue,
            booking.screenType,
            booking.arrangement,
            booking.status,
            STATUS_LABELS[booking.status],
            booking.payment,
            booking.teamLeader,
            booking.driver,
            booking.stageHand,
            booking.size,
            ...(booking.assignees || []),
          ],
          query,
        ),
      );
    }
    return result;
  }, [
    BOOKINGS,
    query,
    tab,
    statusFilter,
    assigneeFilter,
    paymentFilter,
    isAssignedScopeOnly,
    activeProfile.name,
  ]);

  const selectedBookings = useMemo(
    () => BOOKINGS.filter((b) => selected.has(b.code)),
    [BOOKINGS, selected],
  );

  const activeFilterCount = [statusFilter, assigneeFilter, paymentFilter].filter(Boolean).length;

  const toggle = (code: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleExportSelected = async () => {
    if (selectedBookings.length === 0) {
      Alert.alert("Export", "Select at least one booking to export.");
      return;
    }
    const headers = [
      "Code",
      "Client",
      "Assembly",
      "Event",
      "Venue",
      "Screen Type",
      "Size",
      "Arrangement",
      "Assignees",
      "Stage Hand",
      "Payment",
      "Status",
      "Amount",
    ];
    const csvRows = selectedBookings.map((b) =>
      [
        b.code,
        b.client,
        b.assemblyDate,
        b.eventDate,
        b.venue,
        b.screenType,
        String(b.size),
        b.arrangement || "",
        (b.assignees || []).join("; "),
        b.stageHand || "",
        b.payment,
        b.status,
        String(b.amount ?? ""),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    await Share.share({
      message: csv,
      title: `bookings-export-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  };

  const handleBulkSubmit = async () => {
    if (!bulkModal || selectedBookings.length === 0) return;
    const reason = bulkReason.trim();
    if (reason.length < 10) {
      Alert.alert("Reason required", "Reason must be at least 10 characters.");
      return;
    }

    const toStatus: BookingStatus = bulkModal === "cancel" ? "CANCELED" : bulkStatus;
    const override = bulkModal === "cancel" && canCancelOverride;

    setBulkBusy(true);
    try {
      const { ok, failed } = await runBulkTransitions(
        selectedBookings,
        toStatus,
        reason,
        override,
      );
      await refetch();

      if (ok.length > 0) {
        Alert.alert(
          "Done",
          bulkModal === "cancel"
            ? `Canceled ${ok.length} booking${ok.length === 1 ? "" : "s"}`
            : `Updated ${ok.length} booking${ok.length === 1 ? "" : "s"} to ${STATUS_LABELS[toStatus]}`,
        );
      }
      if (failed.length > 0) {
        const preview = failed
          .slice(0, 3)
          .map((f) => `${f.code}: ${f.message}`)
          .join("; ");
        Alert.alert(
          "Some failed",
          `${failed.length} failed${preview ? ` — ${preview}` : ""}${failed.length > 3 ? "…" : ""}`,
        );
      }
      if (failed.length === 0) {
        setSelected(new Set());
        setBulkModal(null);
        setBulkReason("");
      } else if (ok.length > 0) {
        setSelected(new Set(failed.map((f) => f.code)));
      }
    } finally {
      setBulkBusy(false);
    }
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

  const BookingsHeader = () => (
    <View style={styles.toolbar}>
      <View style={styles.header}>
        <Field label={`${BOOKINGS.length} total`}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search code, client, venue..."
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </Field>
        {canCreateBooking ? (
          <Button icon={Plus} onPress={() => router.push(to("/bookings/new"))}>
            New Booking
          </Button>
        ) : null}
      </View>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      <View style={styles.filterRow}>
        <Button variant="outline" icon={Filter} onPress={() => setFilterOpen(true)}>
          {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
        </Button>
      </View>

      {selected.size > 0 ? (
        <View style={styles.bulkBar}>
          <AppText variant="small" color={colors.accent} style={{ fontWeight: "800" }}>
            {selected.size} selected
          </AppText>
          <View style={styles.bulkActions}>
            <Button variant="outline" onPress={() => setBulkModal("status")}>
              Change Status
            </Button>
            <Button variant="outline" onPress={() => setBulkModal("cancel")}>
              Cancel Selected
            </Button>
            <Button variant="ghost" onPress={handleExportSelected}>
              Share CSV
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <NativeList
        data={rows}
        extraData={`${query}|${tab}|${statusFilter}|${assigneeFilter}|${paymentFilter}|${selected.size}`}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={BookingsHeader}
        ItemSeparatorComponent={ListGap}
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
            setAssigneeFilter(null);
            setPaymentFilter(null);
          }}
        >
          Clear filters
        </Button>
      </BottomSheet>

      <BottomSheet
        visible={bulkModal !== null}
        title={bulkModal === "cancel" ? "Cancel selected bookings" : "Change status"}
        onClose={() => {
          if (bulkBusy) return;
          setBulkModal(null);
          setBulkReason("");
        }}
      >
        <AppText variant="subtitle">
          {selectedBookings.length} booking{selectedBookings.length === 1 ? "" : "s"}:{" "}
          {selectedBookings
            .slice(0, 5)
            .map((b) => b.code)
            .join(", ")}
          {selectedBookings.length > 5 ? "…" : ""}
        </AppText>
        {bulkModal === "status" ? (
          <Field label="New status">
            <View style={styles.choiceWrap}>
              {STATUS_ORDER.map((status) => (
                <FilterChip
                  key={status}
                  label={STATUS_LABELS[status]}
                  active={bulkStatus === status}
                  onPress={() => setBulkStatus(status)}
                />
              ))}
            </View>
          </Field>
        ) : null}
        <Field label="Reason (min 10 characters)">
          <TextArea
            value={bulkReason}
            onChangeText={setBulkReason}
            placeholder="Explain why these bookings are being updated..."
          />
        </Field>
        <Button disabled={bulkBusy || bulkReason.trim().length < 10} onPress={handleBulkSubmit}>
          {bulkBusy
            ? "Working..."
            : bulkModal === "cancel"
              ? "Cancel bookings"
              : `Set to ${STATUS_LABELS[bulkStatus]}`}
        </Button>
      </BottomSheet>
    </Screen>
  );
}

function ListGap() {
  return <View style={styles.listGap} />;
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

const styles = StyleSheet.create({
  toolbar: {
    gap: 14,
    paddingBottom: 4,
  },
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
    backgroundColor: alpha(colors.accent, 0.08),
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  bulkActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 112,
  },
  listGap: {
    height: 10,
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
    backgroundColor: alpha(colors.accent, 0.1),
  },
});
