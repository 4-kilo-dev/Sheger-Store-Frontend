import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AlertCircle, Check, Package } from "lucide-react-native";
import {
  buildCheckinReturns,
  isCheckinAction as isInventoryCheckinAction,
  isCheckoutReverseAction,
  type InventoryCondition,
} from "@vortex/utils";
import { AppText, BottomSheet, Button, Field, Input, TextArea } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import type { BookingActions } from "@/hooks/useBookingActions";
import { useBookingCustody } from "@/hooks/useOperations";
import type { Booking } from "@/types/domain";
import { isAssignableTechnician, isChiefTechnicianRole } from "@/utils/staffRoles";
import { isDeclinedAssignment } from "@/utils/assignmentHelpers";
import { colors, radius } from "@/theme/tokens";
import { formatCurrency } from "@/utils/format";

interface BookingActionSheetProps {
  booking: Booking;
  actions: BookingActions;
}

/**
 * Full booking action workflow sheet — mirrors web BookingActionModal forms,
 * validations, permissions, and API interactions.
 */
export function BookingActionSheet({ booking, actions }: BookingActionSheetProps) {
  const { authUser } = useAppContext();
  const {
    showActionModal,
    setShowActionModal,
    selectedAction,
    setSelectedAction,
    cancellationReason,
    setCancellationReason,
    paymentType,
    setPaymentType,
    paymentMethod,
    setPaymentMethod,
    advancePayment,
    setAdvancePayment,
    dailyRate,
    setDailyRate,
    rentedDays,
    checkoutDriver,
    setCheckoutDriver,
    checkoutVehiclePlate,
    setCheckoutVehiclePlate,
    checkoutMealBudget,
    setCheckoutMealBudget,
    staff,
    selectedTechnicianIds,
    setSelectedTechnicianIds,
    assignTechnicians,
    isAssigningTechnicians,
    performCheckout,
    isCheckingOut,
    performCheckin,
    isCheckingIn,
    reverseCheckout,
    isReversingCheckout,
    transitionStatus,
    isTransitioning,
    isRecordingPayment,
    confirmBookingWithPayment,
    isConfirmingWithPayment,
  } = actions;

  const isCheckinAction = isInventoryCheckinAction(selectedAction);
  const isReverseAction = isCheckoutReverseAction(selectedAction);

  const [checkedCheckinItems, setCheckedCheckinItems] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnConditions, setReturnConditions] = useState<Record<string, InventoryCondition>>({});
  const { data: custody = [] } = useBookingCustody(
    showActionModal && isCheckinAction ? booking.id : "",
  );
  const checkinItems = useMemo(
    () =>
      custody
        .filter((line) => Number.parseFloat(line.outstandingQuantity) > 0)
        .map((line) => {
          const source = booking.bomItems.find((item) =>
            line.poolId ? item.poolId === line.poolId : item.itemId === line.itemId,
          );
          return {
            id: line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`,
            poolId: line.poolId || undefined,
            itemId: line.itemId || undefined,
            name: source?.name || "Equipment",
            code: source?.code || line.poolId || line.itemId || "asset",
            outstandingQuantity: line.outstandingQuantity,
          };
        }),
    [booking.bomItems, custody],
  );

  useEffect(() => {
    if (!showActionModal || !isCheckinAction) {
      setCheckedCheckinItems(new Set());
      setReturnQuantities({});
      setReturnConditions({});
    }
  }, [showActionModal, isCheckinAction, selectedAction?.id]);

  if (!selectedAction) return null;

  const isAssignTechnicianAction =
    selectedAction.id === "assignment.assign_technician" ||
    selectedAction.requiresForm === "assign";

  const assignableStaff = staff.filter((s) => isAssignableTechnician(s.role));
  const alreadyAssignedTechIds = new Set(
    (booking.assignments || [])
      .filter((a) => a.roleContext === "TECHNICIAN" && !isDeclinedAssignment(a))
      .map((a) => a.userId)
      .filter(Boolean) as string[],
  );

  const isConfirmReserved =
    booking.status === "RESERVED" && selectedAction.id === "booking.confirm";
  const showPaymentCapture = isConfirmReserved;
  const isCheckoutAction =
    booking.status === "PREPARATION" &&
    (selectedAction.id === "inventory.checkout" ||
      selectedAction.permissionKey === "inventory.checkout" ||
      selectedAction.requiresForm === "dispatch");

  const toggleCheckinItem = (itemId: string) => {
    setCheckedCheckinItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAllCheckinItems = () => {
    if (checkedCheckinItems.size === checkinItems.length) {
      setCheckedCheckinItems(new Set());
    } else {
      setCheckedCheckinItems(new Set(checkinItems.map((item) => item.id)));
    }
  };

  const hasCheckinItemsSelected = checkedCheckinItems.size > 0;

  const stagehandLeaderName = booking.teamLeader || "— Not assigned —";
  const screenTypeLabel = booking.screenType || "—";
  const screenSizeLabel = booking.size > 0 ? `${booking.size} sqm` : "—";
  const computedTotal = dailyRate > 0 && rentedDays > 0 ? dailyRate * rentedDays : 0;

  const close = () => {
    setShowActionModal(false);
    setSelectedAction(null);
  };

  const isBusy =
    isTransitioning ||
    isRecordingPayment ||
    isConfirmingWithPayment ||
    isCheckingOut ||
    isCheckingIn ||
    isReversingCheckout ||
    isAssigningTechnicians;

  const confirmDisabled =
    isBusy ||
    (!!(selectedAction.requiresReason || selectedAction.reasonRequired) &&
      cancellationReason.trim().length < 10) ||
    (isAssignTechnicianAction && selectedTechnicianIds.length === 0) ||
    (showPaymentCapture &&
      (computedTotal < 1000 ||
        dailyRate <= 0 ||
        rentedDays <= 0 ||
        (paymentType === "advance" && advancePayment > computedTotal) ||
        (paymentType === "advance" && advancePayment <= 0))) ||
    (isCheckinAction && !hasCheckinItemsSelected) ||
    (isReverseAction && cancellationReason.trim().length < 10);

  const handleConfirm = () => {
    if (
      selectedAction.id === "inventory.checkout" ||
      selectedAction.permissionKey === "inventory.checkout" ||
      selectedAction.requiresForm === "dispatch"
    ) {
      if (!authUser?.id) {
        Alert.alert("Error", "You must be signed in to check out gear.");
        return;
      }
      performCheckout();
      return;
    }

    if (isCheckinAction) {
      try {
        performCheckin(
          buildCheckinReturns(
            checkinItems.map((item) => ({
              selected: checkedCheckinItems.has(item.id),
              poolId: item.poolId,
              itemId: item.itemId,
              outstandingQuantity: item.outstandingQuantity,
              quantity: returnQuantities[item.id] ?? item.outstandingQuantity,
              condition: returnConditions[item.id] ?? "AVAILABLE",
            })),
          ),
        );
      } catch (error) {
        Alert.alert("Error", error instanceof Error ? error.message : "Invalid check-in selection");
      }
      return;
    }

    if (isReverseAction) {
      reverseCheckout(cancellationReason.trim());
      return;
    }

    if (isAssignTechnicianAction) {
      if (selectedTechnicianIds.length === 0) {
        Alert.alert("Error", "Please select at least one technician");
        return;
      }
      assignTechnicians(selectedTechnicianIds);
      return;
    }

    if (showPaymentCapture) {
      if (rentedDays <= 0) {
        Alert.alert(
          "Error",
          "This booking has no number of days set — update the booking schedule first.",
        );
        return;
      }
      if (computedTotal < 1000 || dailyRate <= 0) {
        Alert.alert("Error", "Daily rate is required (computed total min ETB 1,000).");
        return;
      }
      if (paymentType === "advance") {
        if (advancePayment <= 0) {
          Alert.alert("Error", "Advance payment must be greater than ETB 0");
          return;
        }
        if (advancePayment > computedTotal) {
          Alert.alert("Error", "Advance payment cannot exceed the total payment amount");
          return;
        }
        confirmBookingWithPayment({
          toPaymentStatus: "advance",
          amount: advancePayment,
          totalAmount: computedTotal,
          pricingDailyRate: dailyRate,
          pricingRentedDays: rentedDays,
        });
      } else {
        confirmBookingWithPayment({
          toPaymentStatus: "fully_paid",
          amount: computedTotal,
          totalAmount: computedTotal,
          pricingDailyRate: dailyRate,
          pricingRentedDays: rentedDays,
        });
      }
      return;
    }

    transitionStatus({
      toStatus: selectedAction.targetStatus,
      reason: cancellationReason || undefined,
      override: selectedAction.id === "booking.cancel_override",
    });
  };

  return (
    <BottomSheet visible={showActionModal} title={selectedAction.label} onClose={close}>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
        <AppText variant="subtitle">
          This will transition the booking from {booking.status} to {selectedAction.targetStatus}.
          {"\n"}Permission required: {selectedAction.permissionKey || selectedAction.id}
        </AppText>

        {showPaymentCapture ? (
          <View style={{ gap: 12 }}>
            <Field label="Payment Type">
              <View style={styles.choiceWrap}>
                {(
                  [
                    ["advance", "Advance Deposit"],
                    ["fully_paid", "Fully Paid"],
                  ] as const
                ).map(([value, label]) => (
                  <Choice
                    key={value}
                    label={label}
                    active={paymentType === value}
                    onPress={() => setPaymentType(value)}
                  />
                ))}
              </View>
            </Field>
            <Field label="Payment Method">
              <View style={styles.choiceWrap}>
                {["Bank Transfer", "Cash", "Mobile Money"].map((method) => (
                  <Choice
                    key={method}
                    label={method}
                    active={paymentMethod === method}
                    onPress={() => setPaymentMethod(method)}
                  />
                ))}
              </View>
            </Field>
            <Field label="Number of Days">
              <Input editable={false} value={rentedDays > 0 ? String(rentedDays) : "—"} />
            </Field>
            <Field label="Daily Rate (ETB)">
              <Input
                keyboardType="numeric"
                value={dailyRate ? String(dailyRate) : ""}
                onChangeText={(v) => setDailyRate(parseFloat(v) || 0)}
                placeholder="e.g. 60000"
              />
            </Field>
            <Field label="Computed Total (ETB)">
              <Input
                editable={false}
                value={computedTotal > 0 ? formatCurrency(computedTotal) : "—"}
              />
            </Field>
            {paymentType === "advance" ? (
              <Field label="Advance Payment (ETB)">
                <Input
                  keyboardType="numeric"
                  value={advancePayment ? String(advancePayment) : ""}
                  onChangeText={(v) => setAdvancePayment(parseFloat(v) || 0)}
                  placeholder="Enter amount"
                />
              </Field>
            ) : null}

            <AppText variant="small" color={colors.text3}>
              {paymentType === "advance"
                ? advancePayment > 0 && computedTotal >= 1000
                  ? `Advance will record ${formatCurrency(advancePayment)} (${((advancePayment / computedTotal) * 100).toFixed(0)}%) as paid, leaving ${formatCurrency(computedTotal - advancePayment)} remaining.`
                  : "Enter the daily rate and advance amount to preview the payment split."
                : computedTotal >= 1000
                  ? `Full payment will record ${formatCurrency(computedTotal)} as paid.`
                  : "Enter the daily rate to compute the contract total (days × rate)."}
            </AppText>

            {rentedDays <= 0 ? (
              <Warning text="This booking has no number of days set — update the booking schedule first." />
            ) : null}
            {rentedDays > 0 && (computedTotal < 1000 || dailyRate <= 0) ? (
              <Warning text="Daily rate is required (computed total min ETB 1,000)." />
            ) : null}
            {paymentType === "advance" &&
            advancePayment > computedTotal &&
            computedTotal >= 1000 ? (
              <Warning text="Advance Payment can't be greater than total payment." />
            ) : null}
            {paymentType === "advance" && computedTotal >= 1000 && advancePayment <= 0 ? (
              <Warning text="Advance Payment must be greater than ETB 0." />
            ) : null}
          </View>
        ) : null}

        {isAssignTechnicianAction ? (
          <View style={{ gap: 10 }}>
            <AppText variant="small" color={colors.text2}>
              Select one or more technicians. Chief technicians are included in this list.
            </AppText>
            {assignableStaff.length === 0 ? (
              <AppText variant="subtitle">No technicians available to assign.</AppText>
            ) : (
              assignableStaff.map((member) => {
                const already = alreadyAssignedTechIds.has(member.id);
                const selected = selectedTechnicianIds.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    disabled={already}
                    onPress={() => {
                      setSelectedTechnicianIds((prev) =>
                        prev.includes(member.id)
                          ? prev.filter((id) => id !== member.id)
                          : [...prev, member.id],
                      );
                    }}
                    style={[
                      styles.staffRow,
                      selected ? styles.staffRowActive : null,
                      already ? { opacity: 0.45 } : null,
                    ]}
                  >
                    <View style={[styles.check, selected ? styles.checkOn : null]}>
                      {selected ? <Check size={12} color={colors.accentForeground} /> : null}
                    </View>
                    <AppText style={{ flex: 1, fontWeight: "700" }}>
                      {member.name}
                      {isChiefTechnicianRole(member.role) ? " (Chief Technician)" : ""}
                      {already ? " — already assigned" : ""}
                    </AppText>
                  </Pressable>
                );
              })
            )}
            {selectedTechnicianIds.length > 0 ? (
              <AppText variant="small" color={colors.text2}>
                {selectedTechnicianIds.length} technician
                {selectedTechnicianIds.length === 1 ? "" : "s"} selected
              </AppText>
            ) : null}
          </View>
        ) : null}

        {isCheckoutAction ? (
          <View style={{ gap: 12 }}>
            <Field label="Stagehand Team Leader">
              <Input editable={false} value={stagehandLeaderName} />
            </Field>
            {!booking.teamLeader ? (
              <Warning text="Assign a stagehand leader on the Overview tab before checkout." />
            ) : null}
            <Field label="Driver">
              <Input value={checkoutDriver} onChangeText={setCheckoutDriver} />
            </Field>
            <Field label="Vehicle Plate">
              <Input
                value={checkoutVehiclePlate}
                onChangeText={setCheckoutVehiclePlate}
                placeholder="e.g. AA 3-A12345"
              />
            </Field>
            <Field label="Meal Budget (ETB)">
              <Input
                keyboardType="numeric"
                value={checkoutMealBudget ? String(checkoutMealBudget) : ""}
                onChangeText={(v) => setCheckoutMealBudget(parseFloat(v) || 0)}
              />
            </Field>
            <View style={styles.summary}>
              <AppText variant="eyebrow">Deployment Summary</AppText>
              <AppText>Screen Type: {screenTypeLabel}</AppText>
              <AppText>Screen Size: {screenSizeLabel}</AppText>
              <AppText variant="eyebrow" style={{ marginTop: 8 }}>
                Bill of Materials
              </AppText>
              {booking.bomItems.length === 0 ? (
                <AppText variant="small" color={colors.text3}>
                  No BOM lines on this booking.
                </AppText>
              ) : (
                booking.bomItems.map((item) => (
                  <View key={item.id} style={styles.bomRow}>
                    <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                      {item.code}
                    </AppText>
                    <AppText style={{ flex: 1 }} numberOfLines={1}>
                      {item.name}
                    </AppText>
                    <AppText variant="data">×{item.qty}</AppText>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

        {isCheckinAction ? (
          <View style={styles.summary}>
            <View style={styles.checkinHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Package size={14} color={colors.success} />
                <AppText variant="eyebrow">Checked-Out Materials — Verify Returns</AppText>
              </View>
              {checkinItems.length > 0 ? (
                <Pressable onPress={toggleAllCheckinItems}>
                  <AppText variant="small" color={colors.success} style={{ fontWeight: "800" }}>
                    {checkedCheckinItems.size === checkinItems.length ? "Uncheck All" : "Check All"}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
            {checkinItems.length === 0 ? (
              <AppText variant="small" color={colors.text3}>
                No inventory is currently outstanding for this booking.
              </AppText>
            ) : (
              checkinItems.map((item) => {
                const checked = checkedCheckinItems.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleCheckinItem(item.id)}
                    style={[styles.staffRow, checked ? styles.staffRowActive : null]}
                  >
                    <View style={[styles.check, checked ? styles.checkOnSuccess : null]}>
                      {checked ? <Check size={12} color="#fff" /> : null}
                    </View>
                    <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                      {item.code}
                    </AppText>
                    <AppText style={{ flex: 1 }} numberOfLines={1}>
                      {item.name}
                    </AppText>
                    {item.poolId ? (
                      <Input
                        accessibilityLabel={`Return quantity for ${item.name}`}
                        keyboardType="decimal-pad"
                        value={returnQuantities[item.id] ?? item.outstandingQuantity}
                        onChangeText={(value) =>
                          setReturnQuantities((current) => ({ ...current, [item.id]: value }))
                        }
                        style={styles.returnQty}
                      />
                    ) : (
                      <View style={styles.conditionRow}>
                        {(
                          [
                            "AVAILABLE",
                            "DAMAGED",
                            "LOST",
                            "UNDER_MAINTENANCE",
                          ] as InventoryCondition[]
                        ).map((condition) => {
                          const active = (returnConditions[item.id] ?? "AVAILABLE") === condition;
                          return (
                            <Pressable
                              key={condition}
                              onPress={() =>
                                setReturnConditions((current) => ({
                                  ...current,
                                  [item.id]: condition,
                                }))
                              }
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
                    )}
                  </Pressable>
                );
              })
            )}
            <AppText variant="small" color={colors.text2}>
              {checkedCheckinItems.size} of {checkinItems.length} assets selected
            </AppText>
          </View>
        ) : null}

        {selectedAction.requiresReason || selectedAction.reasonRequired ? (
          <Field label="Reason for action / override (minimum 10 characters)">
            <TextArea
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder="Please write the operational reason..."
            />
          </Field>
        ) : null}

        <Button disabled={confirmDisabled} onPress={handleConfirm}>
          {isBusy ? "Processing..." : `Confirm: ${selectedAction.label}`}
        </Button>
        <Button variant="outline" onPress={close}>
          Cancel
        </Button>
      </ScrollView>
    </BottomSheet>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <View style={styles.warning}>
      <AlertCircle size={14} color={colors.destructive} />
      <AppText variant="small" color={colors.destructive} style={{ flex: 1, fontWeight: "700" }}>
        {text}
      </AppText>
    </View>
  );
}

function Choice({
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
      onPress={onPress}
      style={[
        styles.choice,
        active ? { borderColor: colors.accent, backgroundColor: colors.accentDim } : null,
      ]}
    >
      <AppText
        variant="small"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "800" }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface2,
  },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: colors.surface2,
  },
  staffRowActive: {
    borderColor: colors.accent,
  },
  check: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkOnSuccess: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  summary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
  },
  bomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface2,
  },
  checkinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  returnQty: {
    minHeight: 32,
    width: 72,
    paddingHorizontal: 6,
    textAlign: "right",
  },
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 4,
    maxWidth: 150,
  },
  conditionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: colors.surface,
  },
  conditionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
