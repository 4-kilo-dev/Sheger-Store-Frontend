import { router } from "expo-router";
import { to } from "@/utils/routes";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Package,
  PackageCheck,
  Printer,
  Truck,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
import { StatusBadge, ToneBadge } from "@/components/status";
import {
  AppText,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  KV,
  LoadingState,
  ProgressBar,
  Screen,
  Section,
  TextArea,
} from "@/components/ui";
import {
  useBookings,
  useBookingCustody,
  useCheckinBooking,
  useCheckoutBooking,
} from "@/hooks/useOperations";
import { useAppContext } from "@/context/AppContext";
import { useCalendarSystem } from "@/context/CalendarSystemContext";
import { ApiError } from "@/lib/api/client";
import { colors, radius } from "@/theme/tokens";

type Mode = "checkout" | "checkin";

export default function CheckoutScreen() {
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings();
  const { activeProfile } = useAppContext();
  const { calendarSystem } = useCalendarSystem();
  const userRole = activeProfile.role;
  const [mode, setMode] = useState<Mode>("checkout");
  const [selectedCode, setSelectedCode] = useState("");
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
    setCheckedItems(new Set());
    setPoolQuantities({});
    setItemConditions({});
    setCompletedStatus(null);
    setSubmitted(false);
    setSubmitError(null);
  };

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
          <CheckCircle2 size={48} color={colors.success} />
          <AppText variant="title" style={{ textAlign: "center", fontSize: 22 }}>
            {mode === "checkout" ? "Material Check-Out Completed" : "Material Check-In Completed"}
          </AppText>
          <AppText variant="subtitle" style={{ textAlign: "center" }}>
            {checkedItems.size} items {mode === "checkout" ? "checked out" : "checked in"} for
            booking {selected.code}.{" "}
            {mode === "checkout"
              ? "Materials are now marked as 'Out'. The booking status has advanced to ONSITE."
              : completedStatus === "PARTIALLY_RETURNED"
                ? "The selected items were returned. Remaining custody is still outstanding."
                : "All checked-out items were returned and the booking is now DONE."}
          </AppText>
          <Button onPress={reset}>Process Another</Button>
          <Button variant="outline" onPress={() => router.push(to(`/bookings/${selected.code}`))}>
            View Booking
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
                  ? "Confirm Check-Out"
                  : "Confirm Check-In"}
            </Button>
            {submitError ? (
              <AppText variant="small" color={colors.destructive}>
                {submitError}
              </AppText>
            ) : null}
            <Button variant="outline" icon={Printer}>
              Print Packing Slip
            </Button>
          </View>
        ) : null
      }
    >
      <View>
        <AppText variant="eyebrow">Warehouse Operations</AppText>
        <AppText variant="title">Material Check-In / Check-Out</AppText>
      </View>
      <View style={styles.modeGrid}>
        <ModeCard
          mode="checkout"
          active={mode === "checkout"}
          onPress={() => {
            setMode("checkout");
            setSelectedCode("");
            setCheckedItems(new Set());
            setPoolQuantities({});
            setItemConditions({});
          }}
        />
        <ModeCard
          mode="checkin"
          active={mode === "checkin"}
          onPress={() => {
            setMode("checkin");
            setSelectedCode("");
            setCheckedItems(new Set());
            setPoolQuantities({});
            setItemConditions({});
          }}
        />
      </View>
      {!selected ? (
        <Section
          title={mode === "checkout" ? "Check-Out Process" : "Check-In Process"}
          icon={ClipboardCheck}
        >
          {(mode === "checkout"
            ? [
                "Select the booking to process",
                "Count and verify each custody line",
                "Adjust pool quantities when needed",
                "Enter responsible party",
                "Submit to register materials out",
              ]
            : [
                "Select the booking to process",
                "Count and verify outstanding custody",
                "Set return qty or item condition",
                "Note any missing or damaged items",
                "Submit to register materials in",
              ]
          ).map((step, index) => (
            <View key={step} style={styles.processStep}>
              <View style={styles.processIndex}>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {index + 1}
                </AppText>
              </View>
              <AppText style={{ flex: 1 }}>{step}</AppText>
            </View>
          ))}
        </Section>
      ) : null}
      <Section title="Select Booking" icon={ClipboardCheck}>
        {eligibleBookings.length === 0 ? (
          <AppText variant="small" color={colors.text3}>
            {mode === "checkout"
              ? "No PREPARATION/ONSITE bookings due this calendar month."
              : "No ONSITE/COMPLETED/PARTIALLY_RETURNED bookings due for return."}
          </AppText>
        ) : (
          eligibleBookings.map((booking) => (
            <Pressable
              key={booking.code}
              onPress={() => {
                setSelectedCode(booking.code);
                setCheckedItems(new Set());
                setPoolQuantities({});
                setItemConditions({});
              }}
              style={[
                styles.bookingOption,
                selectedCode === booking.code ? styles.bookingOptionActive : null,
              ]}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {booking.code}
                </AppText>
                <AppText style={{ fontWeight: "800" }}>{booking.client}</AppText>
                <AppText variant="small" color={colors.text2}>
                  {booking.venue} · {booking.eventDate}
                </AppText>
              </View>
              <StatusBadge status={booking.status} />
            </Pressable>
          ))
        )}
      </Section>
      {selected ? (
        <>
          <Section
            title="Bill of Materials — Verify Each Asset"
            icon={Package}
            action={
              <Button variant="ghost" onPress={toggleAll}>
                {checkedItems.size === operationItems.length ? "Uncheck All" : "Check All"}
              </Button>
            }
          >
            {operationItems.length === 0 ? (
              <AppText variant="small" color={colors.text3}>
                {mode === "checkin" || selected.status === "ONSITE"
                  ? "No outstanding custody for this booking."
                  : "No BOM assets available to check out."}
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
                    <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
                      {checked ? (
                        <Check
                          size={15}
                          color={mode === "checkout" ? colors.accentForeground : colors.white}
                        />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                        {item.code}
                      </AppText>
                      <AppText>{item.name}</AppText>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4, minWidth: 96 }}>
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
                        <AppText variant="data" style={{ fontWeight: "900" }}>
                          1
                        </AppText>
                      )}
                      <ToneBadge label={item.poolId ? "units" : "serialized"} tone={colors.text2} />
                    </View>
                  </Pressable>
                );
              })
            )}
            <KV
              label="Verified"
              value={`${checkedItems.size} of ${operationItems.length} assets`}
            />
            <ProgressBar
              value={operationItems.length ? (checkedItems.size / operationItems.length) * 100 : 0}
              tone={mode === "checkout" ? colors.accent : colors.success}
            />
          </Section>
          {storekeeperAwaitingEvent ? (
            <View style={styles.holdBox}>
              <AppText variant="small" style={{ fontWeight: "800" }} color={colors.status.ONSITE}>
                Gear is on-site. Awaiting event completion and warehouse return.
              </AppText>
            </View>
          ) : null}
          <Section title="Responsible Party" icon={ClipboardCheck}>
            <Field label={mode === "checkout" ? "Checked out by" : "Received by"}>
              <Input editable={false} value={activeProfile.name} />
            </Field>
            <Field label="Timestamp">
              <Input defaultValue={new Date().toISOString().slice(0, 16)} />
            </Field>
            {mode === "checkin" ? (
              <Field label="Return Notes">
                <TextArea placeholder="Note any missing or damaged items..." />
              </Field>
            ) : null}
          </Section>
          <Section title="Booking Summary" icon={ClipboardCheck}>
            <KV label="Code" value={selected.code} mono />
            <KV label="Client" value={selected.client} />
            <KV label="Venue" value={selected.venue} />
            <KV label="Event" value={selected.eventDate} mono />
            <KV label="Assets" value={operationItems.length} mono />
            <KV
              label="Total Units"
              value={operationItems.reduce((sum, item) => sum + item.qty, 0)}
              mono
            />
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function ModeCard({ mode, active, onPress }: { mode: Mode; active: boolean; onPress: () => void }) {
  const checkout = mode === "checkout";
  const tone = checkout ? colors.accent : colors.success;
  const Icon = checkout ? Truck : PackageCheck;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeCard, active ? { borderColor: tone, backgroundColor: `${tone}14` } : null]}
    >
      <View style={[styles.modeIcon, active ? { backgroundColor: tone } : null]}>
        <Icon
          size={20}
          color={active ? (checkout ? colors.accentForeground : colors.white) : colors.text2}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: "900" }}>{checkout ? "Check-Out" : "Check-In"}</AppText>
        <AppText variant="small" color={colors.text2}>
          {checkout
            ? "Materials leaving warehouse for a job"
            : "Materials returning from a completed job"}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeGrid: {
    gap: 10,
  },
  modeCard: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  modeIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingOption: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  bookingOptionActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.08)",
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
    gap: 16,
  },
  processStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  processIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  holdBox: {
    borderWidth: 1,
    borderColor: colors.status.ONSITE,
    backgroundColor: `${colors.status.ONSITE}1a`,
    borderRadius: radius.md,
    padding: 12,
  },
});
