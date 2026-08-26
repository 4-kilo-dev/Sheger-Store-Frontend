import { router } from "expo-router";
import { to } from "@/utils/routes";
import {
  Check,
  CheckCircle2,
  Package,
  PackageCheck,
  Printer,
  Truck,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";
import {
  IdempotencyAttempt,
  INVENTORY_CONDITIONS,
  buildCheckinReturns,
  buildOperationItems,
  CHECKIN_STATUSES,
  CHECKOUT_STATUSES,
  isDueForCheckinThisMonth,
  isEventPassedOrComplete,
  isUpcomingThisMonth,
  normalizeCheckoutAssets,
  type InventoryCondition,
} from "@vortex/utils";
import { StatusBadge } from "@/components/status";
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Input,
  KV,
  LoadingState,
  ProgressBar,
  Screen,
  Section,
} from "@/components/ui";
import {
  useBookings,
  useBookingCustody,
  useCheckinBooking,
  useCheckoutBooking,
} from "@/hooks/useOperations";
import { useAppContext } from "@/context/AppContext";
import { useCalendarSystem, useDateFormatter } from "@/context/CalendarSystemContext";
import { ApiError } from "@/lib/api/client";
import { alpha, colors, radius } from "@/theme/tokens";
import { bookingToPackingSlip, buildPackingSlipText } from "@/utils/printPackingSlip";

type Mode = "checkout" | "checkin";

export default function CheckoutScreen() {
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings();
  const { activeProfile } = useAppContext();
  const { calendarSystem } = useCalendarSystem();
  const { formatDate } = useDateFormatter();
  const userRole = activeProfile.role;
  const [mode, setMode] = useState<Mode>("checkout");
  const [selectedCode, setSelectedCode] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [completedStatus, setCompletedStatus] = useState<string | null>(null);
  const [poolQuantities, setPoolQuantities] = useState<Record<string, string>>({});
  const [itemConditions, setItemConditions] = useState<Record<string, InventoryCondition>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const checkoutAttempt = useRef(new IdempotencyAttempt());
  const checkoutMutation = useCheckoutBooking();
  const checkinMutation = useCheckinBooking();

  const eligibleBookings = useMemo(() => {
    if (mode === "checkout") {
      return BOOKINGS.filter(
        (booking) =>
          CHECKOUT_STATUSES.has(booking.status) && isUpcomingThisMonth(booking, calendarSystem),
      ).sort((a, b) => (a.assemblyDate || "").localeCompare(b.assemblyDate || ""));
    }
    return BOOKINGS.filter(
      (booking) =>
        CHECKIN_STATUSES.has(booking.status) && isDueForCheckinThisMonth(booking, calendarSystem),
    ).sort((a, b) =>
      (a.dismantleDate || a.eventDate || "").localeCompare(b.dismantleDate || b.eventDate || ""),
    );
  }, [BOOKINGS, calendarSystem, mode]);

  useEffect(() => {
    if (selectedCode && !eligibleBookings.some((booking) => booking.code === selectedCode)) {
      setSelectedCode("");
      setCheckedItems(new Set());
    }
  }, [eligibleBookings, selectedCode]);

  const selected = eligibleBookings.find((booking) => booking.code === selectedCode);
  const { data: custody = [] } = useBookingCustody(selected?.id || "");

  const storekeeperAwaitingEvent =
    mode === "checkin" &&
    !!selected &&
    selected.status === "ONSITE" &&
    userRole === "SK" &&
    !isEventPassedOrComplete(selected);

  const operationItems = useMemo(() => {
    if (!selected) return [];
    return buildOperationItems({
      mode,
      bookingStatus: selected.status,
      bomItems: selected.bomItems,
      custody,
    });
  }, [custody, mode, selected]);

  const toggleItem = (id: string) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedItems.size === operationItems.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(operationItems.map((item) => item.id)));
    }
  };

  const reset = () => {
    setSelectedCode("");
    setBookingSearch("");
    setCheckedItems(new Set());
    setPoolQuantities({});
    setItemConditions({});
    setCompletedStatus(null);
    setSubmitted(false);
    setSubmitError(null);
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setSelectedCode("");
    setBookingSearch("");
    setCheckedItems(new Set());
    setPoolQuantities({});
    setItemConditions({});
    setSubmitError(null);
  };

  const searchedBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    if (!q) return eligibleBookings;
    return eligibleBookings.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.client.toLowerCase().includes(q) ||
        (b.venue || "").toLowerCase().includes(q),
    );
  }, [eligibleBookings, bookingSearch]);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitError(null);
    const selectedItems = operationItems.filter((item) => checkedItems.has(item.id));

    try {
      if (mode === "checkout") {
        const assets = normalizeCheckoutAssets(
          selectedItems.map((item) =>
            item.itemId
              ? { itemId: item.itemId }
              : {
                  poolId: item.poolId,
                  quantity: poolQuantities[item.id] || String(item.qty),
                },
          ),
        );
        const payload = { assets };
        await checkoutMutation.mutateAsync({
          bookingId: selected.id,
          assets,
          idempotencyKey: checkoutAttempt.current.keyFor(payload),
        });
        checkoutAttempt.current.complete();
        setCompletedStatus("ONSITE");
      } else {
        const returns = buildCheckinReturns(
          operationItems.map((item) => ({
            selected: checkedItems.has(item.id),
            poolId: item.poolId,
            itemId: item.itemId,
            outstandingQuantity: item.outstandingQuantity,
            quantity: poolQuantities[item.id] || String(item.qty),
            condition: itemConditions[item.id] || "AVAILABLE",
          })),
        );
        const result = await checkinMutation.mutateAsync({
          bookingId: selected.id,
          returns,
        });
        setCompletedStatus(result.status);
      }
      setSubmitted(true);
    } catch (error) {
      if (
        mode === "checkout" &&
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        checkoutAttempt.current.failDefinitively();
      }
      setSubmitError(error instanceof Error ? error.message : "Failed to process the request.");
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

  if (submitted && selected) {
    return (
      <Screen>
        <Card style={styles.successCard}>
          <CheckCircle2 size={40} color={colors.success} />
          <AppText variant="title" style={{ textAlign: "center", fontSize: 20 }}>
            {mode === "checkout" ? "Checked out" : "Checked in"}
          </AppText>
          <AppText variant="subtitle" style={{ textAlign: "center" }}>
            {checkedItems.size} item{checkedItems.size === 1 ? "" : "s"} for {selected.code}
            {mode === "checkout"
              ? " · booking is now ONSITE."
              : completedStatus === "PARTIALLY_RETURNED"
                ? " · remaining gear is still out."
                : " · booking is now DONE."}
          </AppText>
          <Button onPress={reset}>Next booking</Button>
          <Button variant="ghost" onPress={() => router.push(to(`/bookings/${selected.code}`))}>
            Open booking
          </Button>
        </Card>
      </Screen>
    );
  }

  const isPending = checkoutMutation.isPending || checkinMutation.isPending;

  return (
    <Screen
      footer={
        selected ? (
          <View style={{ gap: 8 }}>
            <Button
              icon={mode === "checkout" ? Truck : PackageCheck}
              disabled={checkedItems.size === 0 || isPending || storekeeperAwaitingEvent}
              variant={mode === "checkout" ? "primary" : "success"}
              onPress={handleSubmit}
            >
              {isPending
                ? "Submitting..."
                : mode === "checkout"
                  ? `Check out ${checkedItems.size || ""}`.trim()
                  : `Check in ${checkedItems.size || ""}`.trim()}
            </Button>
            {submitError ? (
              <AppText variant="small" color={colors.destructive}>
                {submitError}
              </AppText>
            ) : null}
          </View>
        ) : null
      }
    >
      <View style={styles.modeRow}>
        <ModeButton
          label="Check-Out"
          icon={Truck}
          active={mode === "checkout"}
          tone={colors.accent}
          onPress={() => switchMode("checkout")}
        />
        <ModeButton
          label="Check-In"
          icon={PackageCheck}
          active={mode === "checkin"}
          tone={colors.success}
          onPress={() => switchMode("checkin")}
        />
      </View>

      {selected ? (
        <Pressable
          onPress={() => {
            setSelectedCode("");
            setCheckedItems(new Set());
            setPoolQuantities({});
            setItemConditions({});
          }}
          style={styles.selectedBar}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="data" color={colors.accent} style={{ fontWeight: "800" }}>
              {selected.code}
            </AppText>
            <AppText numberOfLines={1} style={{ fontWeight: "700" }}>
              {selected.client}
            </AppText>
          </View>
          <StatusBadge status={selected.status} />
          <AppText variant="small" color={colors.accent} style={{ fontWeight: "800" }}>
            Change
          </AppText>
        </Pressable>
      ) : (
        <View style={styles.pickBlock}>
          <View style={styles.pickHeader}>
            <AppText style={{ fontWeight: "800" }}>Select booking</AppText>
            <AppText variant="small" color={colors.text3}>
              {eligibleBookings.length} ready
            </AppText>
          </View>
          <Input
            value={bookingSearch}
            onChangeText={setBookingSearch}
            placeholder="Search code, client, venue..."
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchedBookings.length === 0 ? (
            <AppText variant="small" color={colors.text3}>
              {eligibleBookings.length === 0
                ? mode === "checkout"
                  ? "No bookings ready to check out this month."
                  : "No bookings ready to check in this month."
                : "No bookings match your search."}
            </AppText>
          ) : (
            searchedBookings.map((booking) => (
              <Pressable
                key={booking.code}
                onPress={() => {
                  setSelectedCode(booking.code);
                  setCheckedItems(new Set());
                  setPoolQuantities({});
                  setItemConditions({});
                }}
                style={styles.bookingOption}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.bookingTopRow}>
                    <AppText variant="data" color={colors.accent} style={styles.bookingCode}>
                      {booking.code}
                    </AppText>
                    <AppText
                      variant="data"
                      color={colors.text3}
                      style={styles.bookingMeta}
                      numberOfLines={1}
                    >
                      {formatDate(booking.eventDate)}
                    </AppText>
                  </View>
                  <AppText numberOfLines={1} style={{ fontWeight: "800" }}>
                    {booking.client}
                  </AppText>
                </View>
                <StatusBadge status={booking.status} />
              </Pressable>
            ))
          )}
        </View>
      )}

      {selected ? (
        <>
          <Section
            title="Assets"
            icon={Package}
            action={
              operationItems.length > 0 ? (
                <Button variant="ghost" onPress={toggleAll}>
                  {checkedItems.size === operationItems.length ? "Clear" : "All"}
                </Button>
              ) : null
            }
          >
            {operationItems.length === 0 ? (
              <AppText variant="small" color={colors.text3}>
                {mode === "checkin" || selected.status === "ONSITE"
                  ? "Nothing outstanding for this booking."
                  : "No assets to check out."}
              </AppText>
            ) : (
              operationItems.map((item) => {
                const checked = checkedItems.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    style={[styles.bomRow, checked ? styles.bomRowChecked : null]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked
                          ? mode === "checkin"
                            ? styles.checkboxCheckedIn
                            : styles.checkboxChecked
                          : null,
                      ]}
                    >
                      {checked ? (
                        <Check
                          size={15}
                          color={mode === "checkout" ? colors.accentForeground : colors.white}
                        />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="data" color={colors.accent} style={{ fontWeight: "800" }}>
                        {item.code}
                      </AppText>
                      <AppText numberOfLines={1}>{item.name}</AppText>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4, minWidth: 88 }}>
                      {item.poolId ? (
                        <Input
                          accessibilityLabel={`Quantity for ${item.name}`}
                          keyboardType="decimal-pad"
                          value={poolQuantities[item.id] ?? String(item.qty)}
                          onChangeText={(value) =>
                            setPoolQuantities((current) => ({ ...current, [item.id]: value }))
                          }
                          style={styles.qtyInput}
                        />
                      ) : mode === "checkin" ? (
                        <View style={styles.conditionWrap}>
                          {INVENTORY_CONDITIONS.map((condition) => {
                            const active = (itemConditions[item.id] ?? "AVAILABLE") === condition;
                            return (
                              <Pressable
                                key={condition}
                                onPress={(event) => {
                                  event.stopPropagation?.();
                                  setItemConditions((current) => ({
                                    ...current,
                                    [item.id]: condition,
                                  }));
                                }}
                                style={[
                                  styles.conditionChip,
                                  active ? styles.conditionChipActive : null,
                                ]}
                              >
                                <AppText
                                  variant="small"
                                  color={active ? colors.accentForeground : colors.text2}
                                  style={{ fontWeight: "800", fontSize: 9 }}
                                >
                                  {condition === "UNDER_MAINTENANCE" ? "MAINT" : condition}
                                </AppText>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : (
                        <AppText variant="data" style={{ fontWeight: "800" }}>
                          1
                        </AppText>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
            {operationItems.length > 0 ? (
              <>
                <KV label="Verified" value={`${checkedItems.size} of ${operationItems.length}`} />
                <ProgressBar
                  value={
                    operationItems.length ? (checkedItems.size / operationItems.length) * 100 : 0
                  }
                  tone={mode === "checkout" ? colors.accent : colors.success}
                />
              </>
            ) : null}
          </Section>
          {storekeeperAwaitingEvent ? (
            <View style={styles.holdBox}>
              <AppText variant="small" style={{ fontWeight: "800" }} color={colors.status.ONSITE}>
                Still on-site. Check in after the event.
              </AppText>
            </View>
          ) : null}
          <Button
            variant="ghost"
            icon={Printer}
            onPress={async () => {
              try {
                const slip = bookingToPackingSlip(selected);
                await Share.share({
                  message: buildPackingSlipText(slip),
                  title: `Packing Slip · ${selected.code}`,
                });
              } catch (error) {
                Alert.alert(
                  "Packing slip",
                  error instanceof Error ? error.message : "Could not build packing slip.",
                );
              }
            }}
          >
            Packing slip
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

function ModeButton({
  label,
  icon: Icon,
  active,
  tone,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  tone: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.modeBtn,
        active ? { borderColor: tone, backgroundColor: alpha(tone, 0.14) } : null,
      ]}
    >
      <Icon size={16} color={active ? tone : colors.text2} strokeWidth={2.4} />
      <AppText style={{ fontWeight: "800" }} color={active ? colors.foreground : colors.text2}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 10,
  },
  pickBlock: {
    gap: 10,
  },
  pickHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  selectedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: alpha(colors.accent, 0.08),
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bookingOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  bookingTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    minWidth: 0,
  },
  bookingCode: {
    fontWeight: "800",
    flexShrink: 0,
  },
  bookingMeta: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  bomRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    opacity: 0.72,
  },
  bomRowChecked: {
    opacity: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkboxCheckedIn: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  qtyInput: {
    minHeight: 34,
    width: 84,
    paddingHorizontal: 8,
    textAlign: "right",
  },
  conditionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 4,
    maxWidth: 160,
  },
  conditionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: colors.surface2,
  },
  conditionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  successCard: {
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  holdBox: {
    borderWidth: 1,
    borderColor: colors.status.ONSITE,
    backgroundColor: alpha(colors.status.ONSITE, 0.12),
    borderRadius: radius.md,
    padding: 12,
  },
});
