import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import { Filter, Plus } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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
import { useCalendarSystem } from "@/context/CalendarSystemContext";
import { addisToday, ETHIOPIAN_MONTH_NAMES, toEthiopianDate } from "@/lib/ethiopian-calendar";
import { transitionBookingStatusApi } from "@/services/bookings-api";

const TABS = [
  "All",
  "This Week",
  "This Month",
  "Upcoming",
  "Onsite",
  "Last Week",
  "Assigned to Me",
] as const;
const PAYMENT_STATUSES: PaymentStatus[] = ["PAID", "ADVANCE", "UNPAID"];
const SCREEN_TYPES = ["P2.97", "P2.97-New", "P3.91 INDOOR", "P3.91 OUTDOOR", "P4", "P5"] as const;

type BookingTab = (typeof TABS)[number];

const DASHBOARD_TAB_MAP: Record<string, BookingTab> = {
  "this-week": "This Week",
  "this-month": "This Month",
  onsite: "Onsite",
};

function bookingTabFromParam(value: string | string[] | undefined): BookingTab | null {
  const tab = Array.isArray(value) ? value[0] : value;
  if (!tab) return null;
  return DASHBOARD_TAB_MAP[tab] ?? (TABS.includes(tab as BookingTab) ? (tab as BookingTab) : null);
}

function dateKey(value?: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? "");
  return match ? match[1] : null;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 12));
  return value.toISOString().slice(0, 10);
}

function mondayWeekBounds(today = addisToday(), weeksAgo = 0): { start: string; end: string } {
  const [year, month, day] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = addDays(today, mondayOffset - weeksAgo * 7);
  return { start, end: addDays(start, 6) };
}

function toggleSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function matchesQuery(haystack: Array<string | number | null | undefined>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.some((part) =>
    String(part ?? "")
      .toLowerCase()
      .includes(needle),
  );
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
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string | string[] }>();
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings({ poll: true });
  const { data: staff = [] } = useStaff();
  const { can } = usePermissions();
  const { authUser } = useAppContext();
  const { calendarSystem } = useCalendarSystem();
  const canCreateBooking = can(PERMISSION.BOOKING_CREATE);
  const canCancelOverride = can(PERMISSION.BOOKING_CANCEL_OVERRIDE);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<BookingStatus>>(new Set());
  const [screenFilter, setScreenFilter] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(new Set());
  const [paymentFilter, setPaymentFilter] = useState<Set<PaymentStatus>>(new Set());
  const [ethiopianYearFilter, setEthiopianYearFilter] = useState<string | null>(null);
  const [ethiopianMonthFilter, setEthiopianMonthFilter] = useState<number | null>(null);
  const [bulkModal, setBulkModal] = useState<"status" | "cancel" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BookingStatus>("CONFIRMED");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const requestedTab = bookingTabFromParam(tabParam);
    if (requestedTab) setTab(requestedTab);
  }, [tabParam]);

  const rows = useMemo(() => {
    let result: Booking[] = [...BOOKINGS];
    if (tab === "This Month") {
      const today = addisToday();
      const currentEthiopian = toEthiopianDate(today);
      result = result.filter((booking) => {
        if (calendarSystem === "ethiopic") {
          const event = booking.ethiopianDates?.eventDate?.ethiopian;
          return Boolean(
            event &&
            currentEthiopian &&
            event.year === currentEthiopian.year &&
            event.month === currentEthiopian.month,
          );
        }
        const event = dateKey(booking.eventDate);
        return Boolean(event && event.slice(0, 7) === today.slice(0, 7));
      });
    } else if (tab === "Onsite") {
      result = result.filter((booking) => booking.status === "ONSITE");
    } else if (tab === "Upcoming") {
      const start = addisToday();
      const end = addDays(start, 7);
      result = result.filter((booking) => {
        const assembly = dateKey(booking.assemblyDate);
        return Boolean(assembly && assembly >= start && assembly <= end);
      });
    } else if (tab === "This Week") {
      const { start, end } = mondayWeekBounds();
      result = result.filter((booking) => {
        const event = dateKey(booking.eventDate);
        return Boolean(event && event >= start && event <= end);
      });
    } else if (tab === "Last Week") {
      const { start, end } = mondayWeekBounds(addisToday(), 1);
      result = result.filter((booking) => {
        const event = dateKey(booking.eventDate);
        return Boolean(event && event >= start && event <= end);
      });
    } else if (tab === "Assigned to Me") {
      result = result.filter((booking) =>
        booking.assignments?.some(
          (assignment) => assignment.userId === authUser?.id && !assignment.declineReason,
        ),
      );
    }
    if (statusFilter.size > 0)
      result = result.filter((booking) => statusFilter.has(booking.status));
    if (screenFilter.size > 0)
      result = result.filter((booking) =>
        String(booking.screenType)
          .split(",")
          .map((type) => type.trim())
          .some((type) => screenFilter.has(type)),
      );
    if (assigneeFilter.size > 0)
      result = result.filter((booking) =>
        booking.assignees.some((name) => assigneeFilter.has(name)),
      );
    if (paymentFilter.size > 0)
      result = result.filter((booking) => paymentFilter.has(booking.payment));
    if (calendarSystem === "ethiopic" && ethiopianYearFilter) {
      result = result.filter((booking) => {
        const event = booking.ethiopianDates?.eventDate?.ethiopian;
        return Boolean(
          event &&
          String(event.year) === ethiopianYearFilter &&
          (ethiopianMonthFilter === null || event.month === ethiopianMonthFilter),
        );
      });
    }
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
    return result.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [
    BOOKINGS,
    query,
    tab,
    statusFilter,
    assigneeFilter,
    paymentFilter,
    authUser?.id,
    calendarSystem,
    screenFilter,
    ethiopianYearFilter,
    ethiopianMonthFilter,
  ]);

  const selectedBookings = useMemo(
    () => BOOKINGS.filter((b) => selected.has(b.code)),
    [BOOKINGS, selected],
  );

  const activeFilterCount =
    statusFilter.size +
    screenFilter.size +
    assigneeFilter.size +
    paymentFilter.size +
    Number(Boolean(ethiopianYearFilter)) +
    Number(ethiopianMonthFilter !== null);
  const listStateKey = `${tab}|${[...statusFilter].join(",")}|${[...screenFilter].join(",")}|${[...assigneeFilter].join(",")}|${[...paymentFilter].join(",")}|${ethiopianYearFilter ?? ""}|${ethiopianMonthFilter ?? ""}|${query.trim()}`;

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
      const { ok, failed } = await runBulkTransitions(selectedBookings, toStatus, reason, override);
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
        key={listStateKey}
        data={rows}
        extraData={`${listStateKey}|${selected.size}`}
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
                label={STATUS_LABELS[status]}
                active={statusFilter.has(status)}
                onPress={() => setStatusFilter((current) => toggleSet(current, status))}
              />
            ))}
          </View>
        </Field>
        <Field label="Screen type">
          <View style={styles.choiceWrap}>
            {SCREEN_TYPES.map((screen) => (
              <FilterChip
                key={screen}
                label={screen}
                active={screenFilter.has(screen)}
                onPress={() => setScreenFilter((current) => toggleSet(current, screen))}
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
                active={assigneeFilter.has(member.name)}
                onPress={() => setAssigneeFilter((current) => toggleSet(current, member.name))}
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
                active={paymentFilter.has(status)}
                onPress={() => setPaymentFilter((current) => toggleSet(current, status))}
              />
            ))}
          </View>
        </Field>
        {calendarSystem === "ethiopic" ? (
          <>
            <Field label="Ethiopian year">
              <View style={styles.choiceWrap}>
                {[
                  toEthiopianDate(addisToday())?.year,
                  (toEthiopianDate(addisToday())?.year ?? 0) + 1,
                ]
                  .filter(Boolean)
                  .map((year) => (
                    <FilterChip
                      key={year}
                      label={String(year)}
                      active={ethiopianYearFilter === String(year)}
                      onPress={() => {
                        setEthiopianYearFilter((current) =>
                          current === String(year) ? null : String(year),
                        );
                        setEthiopianMonthFilter(null);
                      }}
                    />
                  ))}
              </View>
            </Field>
            {ethiopianYearFilter ? (
              <Field label="Ethiopian month">
                <View style={styles.choiceWrap}>
                  {ETHIOPIAN_MONTH_NAMES.map((month, index) => (
                    <FilterChip
                      key={month}
                      label={month}
                      active={ethiopianMonthFilter === index + 1}
                      onPress={() =>
                        setEthiopianMonthFilter((current) =>
                          current === index + 1 ? null : index + 1,
                        )
                      }
                    />
                  ))}
                </View>
              </Field>
            ) : null}
          </>
        ) : null}
        <Button
          variant="outline"
          onPress={() => {
            setStatusFilter(new Set());
            setScreenFilter(new Set());
            setAssigneeFilter(new Set());
            setPaymentFilter(new Set());
            setEthiopianYearFilter(null);
            setEthiopianMonthFilter(null);
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
