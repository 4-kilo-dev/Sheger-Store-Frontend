import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert } from "react-native";
import { IdempotencyAttempt, normalizeCheckoutAssets } from "@vortex/utils";
import { to } from "@/utils/routes";
import { useAppContext } from "@/context/AppContext";
import { ApiError } from "@/lib/api/client";
import {
  acceptAssignmentApi,
  checkoutReverseApi,
  createAssignmentApi,
  declineAssignmentApi,
  recordBookingPaymentApi,
  transitionBookingStatusApi,
  updateBookingApi,
} from "@/services/bookings-api";
import type { Booking, BookingStatus } from "@/types/domain";
import { checkinBookingApi, checkoutBookingApi, type CheckinReturn } from "@/services/checkout-api";
import { createDamageReportApi } from "@/services/damage-api";
import { uploadBookingAttachmentApi } from "@/services/attachments.api";
import { getStaffApi } from "@/services/staff-api";
import { isChiefTechnicianRole } from "@/utils/staffRoles";
import { isDeclinedAssignment } from "@/utils/assignmentHelpers";
import {
  createAssignTechnicianAction,
  resolveBookingAction,
  type BookingAction,
} from "@/utils/bookingActions";

export interface UnfulfilledBomLine {
  lineId: string;
  poolId: string | null;
  itemId: string | null;
  name: string;
  requested: string;
  available: string;
  reason: string;
}

/**
 * Booking action state + mutations — mirrors web useBookingActions.
 */
export function useBookingActions(
  code: string,
  booking: Booking | undefined,
  options?: {
    canFetchStaff?: boolean;
    onGoToEquipmentTab?: () => void;
    canOverrideAvailability?: boolean;
  },
) {
  const queryClient = useQueryClient();
  const { authUser } = useAppContext();
  const canFetchStaff = options?.canFetchStaff ?? false;
  const onGoToEquipmentTab = options?.onGoToEquipmentTab;
  const canOverrideAvailability = options?.canOverrideAvailability ?? false;

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BookingAction | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [paymentType, setPaymentType] = useState<"advance" | "fully_paid">("advance");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [advancePayment, setAdvancePayment] = useState(0);
  const [dailyRate, setDailyRate] = useState(0);
  const [rentedDays, setRentedDays] = useState(0);

  const [checkoutDriver, setCheckoutDriver] = useState("");
  const [checkoutVehiclePlate, setCheckoutVehiclePlate] = useState("");
  const [checkoutMealBudget, setCheckoutMealBudget] = useState(0);
  const checkoutAttempt = useRef(new IdempotencyAttempt());

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [damageType, setDamageType] = useState<"DAMAGE" | "MISSING">("DAMAGE");
  const [damageSelectedAssetId, setDamageSelectedAssetId] = useState("");
  const [damageQty, setDamageQty] = useState("1");
  const [damageAttachments, setDamageAttachments] = useState<
    Array<{ uri: string; name: string; type: string }>
  >([]);

  const [staff, setStaff] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [checkoutConflicts, setCheckoutConflicts] = useState<UnfulfilledBomLine[]>([]);
  const [showCheckoutConflictModal, setShowCheckoutConflictModal] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setDailyRate(booking.dailyRate ?? 0);
    setRentedDays(booking.rentedDays ?? 0);

    if (booking.payment === "PAID") {
      setPaymentType("fully_paid");
      setAdvancePayment(booking.advanceAmount ?? booking.paymentAmount ?? 0);
    } else if (booking.payment === "ADVANCE") {
      setPaymentType("advance");
      setAdvancePayment(booking.advanceAmount ?? 0);
    } else {
      setPaymentType("advance");
      setAdvancePayment(0);
    }
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    setCheckoutDriver(booking.driver !== "None Assigned" ? booking.driver : "");
    setCheckoutVehiclePlate(booking.vehiclePlate || "");
    setCheckoutMealBudget(booking.mealBudget || 0);
  }, [booking]);

  useEffect(() => {
    if (!canFetchStaff) return;
    getStaffApi()
      .then((rows) => setStaff(rows.map((s) => ({ id: s.id, name: s.name, role: s.role }))))
      .catch((e) => console.error("Failed to load staff in useBookingActions", e));
  }, [canFetchStaff]);

  useEffect(() => {
    if (
      selectedAction?.id === "assignment.assign_technician" ||
      selectedAction?.requiresForm === "assign"
    ) {
      setSelectedTechnicianIds([]);
    }
  }, [selectedAction?.id, selectedAction?.requiresForm]);

  const myTechnicianAssignment = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return null;
    return (
      booking.assignments.find(
        (a) =>
          a.userId === authUser.id &&
          (a.roleContext === "TECHNICIAN" || a.roleContext === "technician"),
      ) || null
    );
  }, [booking, authUser]);

  const pendingAssignment = !!(
    myTechnicianAssignment && myTechnicianAssignment.respondedAt == null
  );

  const invalidateBooking = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["bookings", code] });
    queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions"] });
    queryClient.invalidateQueries({ queryKey: ["booking-assignments"] });
  };

  const acceptAssignment = useMutation({
    mutationFn: () => {
      if (!myTechnicianAssignment) throw new Error("No assignment found to accept");
      return acceptAssignmentApi(myTechnicianAssignment.id);
    },
    onSuccess: () => {
      Alert.alert("Success", "Assignment accepted successfully!");
      invalidateBooking();
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to accept assignment"),
  });

  const declineAssignment = useMutation({
    mutationFn: (reason: string) => {
      if (!myTechnicianAssignment) throw new Error("No assignment found to decline");
      return declineAssignmentApi(myTechnicianAssignment.id, reason);
    },
    onSuccess: () => {
      setShowDeclineModal(false);
      setDeclineReason("");
      invalidateBooking();
      router.push(to("/bookings"));
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to decline assignment"),
  });

  const submitDamageReport = useMutation({
    mutationFn: async (payload: {
      description?: string;
      poolId?: string;
      itemId?: string;
      reportType: "DAMAGE" | "MISSING";
      quantity?: string;
      attachments?: Array<{ uri: string; name: string; type: string }>;
    }) => {
      if (!booking) throw new Error("Booking is undefined");
      const { attachments: files = [], ...reportPayload } = payload;
      const report = await createDamageReportApi({
        bookingId: booking.id,
        ...reportPayload,
      });

      if (files.length > 0 && report?.id) {
        await Promise.all(
          files.map((file) =>
            uploadBookingAttachmentApi(booking.id, file, {
              relatedEntity: "damage_missing_report",
              relatedId: report.id,
            }),
          ),
        );
      }
      return report;
    },
    onSuccess: (_report, variables) => {
      const attachmentCount = variables.attachments?.length ?? 0;
      Alert.alert(
        "Submitted",
        attachmentCount > 0
          ? `Damage report submitted with ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}.`
          : "Damage report submitted successfully!",
      );
      setShowDamageModal(false);
      setDamageDescription("");
      setDamageSelectedAssetId("");
      setDamageQty("1");
      setDamageAttachments([]);
      invalidateBooking();
      queryClient.invalidateQueries({ queryKey: ["booking-attachments", booking?.id] });
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to submit damage report"),
  });

  const performCheckout = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("Booking is undefined");

      await updateBookingApi(booking.id, {
        vehiclePlate: checkoutVehiclePlate,
        mealProvision: String(checkoutMealBudget),
        vehicleText: `Driver: ${checkoutDriver}`,
        driver: checkoutDriver,
      });

      const assets = normalizeCheckoutAssets(
        booking.bomItems.map((item) =>
          item.itemId
            ? { itemId: item.itemId }
            : { poolId: item.poolId, quantity: String(item.qty) },
        ),
      );
      const payload = { assets };
      return checkoutBookingApi(booking.id, payload, checkoutAttempt.current.keyFor(payload));
    },
    onSuccess: () => {
      checkoutAttempt.current.complete();
      Alert.alert("Success", "Checkout completed successfully! Booking status updated to ONSITE.");
      invalidateBooking();
      queryClient.invalidateQueries({ queryKey: ["checkoutCustody", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status >= 400 && err.status < 500) {
          checkoutAttempt.current.failDefinitively();
        }
        const data = err.data as
          | {
              unfulfilledLines?: UnfulfilledBomLine[];
              message?: { unfulfilledLines?: UnfulfilledBomLine[] } | string;
            }
          | undefined;
        const unfulfilled =
          data?.unfulfilledLines ??
          (typeof data?.message === "object" ? data.message?.unfulfilledLines : undefined);
        if (err.status === 409 && Array.isArray(unfulfilled) && unfulfilled.length > 0) {
          setCheckoutConflicts(unfulfilled);
          setShowCheckoutConflictModal(true);
          return;
        }
        Alert.alert("Checkout failed", err.message || "Checkout failed");
        return;
      }
      Alert.alert("Checkout failed", err instanceof Error ? err.message : "Checkout failed");
    },
  });

  const performCheckin = useMutation({
    mutationFn: async (returns: CheckinReturn[]) => {
      if (!booking) throw new Error("Booking is undefined");
      return checkinBookingApi(booking.id, { returns });
    },
    onSuccess: (result) => {
      Alert.alert(
        "Success",
        result.status === "DONE"
          ? "All checked-out inventory was returned."
          : "Partial return recorded. Remaining custody is still outstanding.",
      );
      invalidateBooking();
      queryClient.invalidateQueries({ queryKey: ["checkoutCustody", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Check-in failed"),
  });

  const reverseCheckout = useMutation({
    mutationFn: async (reason: string) => {
      if (!booking) throw new Error("Booking is undefined");
      return checkoutReverseApi(booking.id, reason);
    },
    onSuccess: () => {
      Alert.alert("Success", "Checkout reversed and custody restored.");
      invalidateBooking();
      queryClient.invalidateQueries({ queryKey: ["checkoutCustody", booking?.id] });
      queryClient.invalidateQueries({ queryKey: ["booking-snapshots", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to reverse checkout"),
  });

  const transitionStatus = useMutation({
    mutationFn: ({
      toStatus,
      reason,
      override,
    }: {
      toStatus: BookingStatus;
      reason?: string;
      override?: boolean;
    }) => transitionBookingStatusApi(booking?.id || code, toStatus, reason, override ?? false),
    onSuccess: () => {
      Alert.alert("Success", "Booking state advanced successfully!");
      invalidateBooking();
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to advance booking state"),
  });

  const recordPayment = useMutation({
    mutationFn: ({ toStatus, amount }: { toStatus: string; amount: number }) =>
      recordBookingPaymentApi(booking?.id || code, toStatus as "advance" | "fully_paid", amount),
    onSuccess: () => {
      Alert.alert("Success", "Payment recorded successfully!");
      invalidateBooking();
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to record payment"),
  });

  const assignTechnicians = useMutation({
    mutationFn: async (techIds: string[]) => {
      if (!booking) throw new Error("Booking is undefined");

      const staffById = new Map(staff.map((s) => [s.id, s]));
      const alreadyAssigned = new Set(
        (booking.assignments || [])
          .filter((a) => a.roleContext === "TECHNICIAN" && !isDeclinedAssignment(a))
          .map((a) => a.userId),
      );

      const toAssign = techIds.filter((id) => !alreadyAssigned.has(id));
      if (toAssign.length === 0) {
        throw new Error("All selected technicians are already assigned to this booking");
      }

      for (const techId of toAssign) {
        const member = staffById.get(techId);
        await createAssignmentApi(booking.id, {
          userId: techId,
          roleContext: "TECHNICIAN",
          isTeamLead: member ? isChiefTechnicianRole(member.role) : false,
        });
      }
    },
    onSuccess: () => {
      Alert.alert("Success", "Technician assignment completed!");
      invalidateBooking();
      setShowActionModal(false);
      setSelectedAction(null);
      setSelectedTechnicianIds([]);
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to assign technicians"),
  });

  const confirmBookingWithPayment = useMutation({
    mutationFn: async ({
      toPaymentStatus,
      amount,
      totalAmount,
      pricingDailyRate,
      pricingRentedDays,
    }: {
      toPaymentStatus: "advance" | "fully_paid";
      amount: number;
      totalAmount: number;
      pricingDailyRate: number;
      pricingRentedDays: number;
    }) => {
      if (!booking) throw new Error("Booking is undefined");

      if (pricingDailyRate > 0 && pricingRentedDays > 0) {
        await updateBookingApi(booking.id, {
          dailyRate: String(pricingDailyRate),
          rentedDays: pricingRentedDays,
        });
      } else if (pricingDailyRate > 0) {
        await updateBookingApi(booking.id, {
          dailyRate: String(pricingDailyRate),
        });
      }

      const needsNewPayment =
        booking.payment === "UNPAID" ||
        (booking.payment === "ADVANCE" && toPaymentStatus === "fully_paid");

      if (needsNewPayment) {
        await recordBookingPaymentApi(
          booking.id,
          toPaymentStatus,
          toPaymentStatus === "fully_paid" ? totalAmount : amount,
        );
      }

      await transitionBookingStatusApi(booking.id, "CONFIRMED");
    },
    onSuccess: () => {
      Alert.alert("Success", "Booking confirmed and payment recorded successfully!");
      invalidateBooking();
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: Error) => Alert.alert("Error", err.message || "Failed to confirm booking"),
  });

  const openAction = (action: BookingAction) => {
    setSelectedAction(action);
    setCancellationReason("");
    setShowActionModal(true);
  };

  const openTransitionAction = (transition: {
    toStatus: BookingStatus;
    permissionKey: string;
    reasonRequired?: boolean;
    viaBypass?: boolean;
    actionId?: string;
  }) => {
    openAction(
      resolveBookingAction(
        transition.actionId,
        transition.permissionKey,
        transition.toStatus,
        transition.reasonRequired,
        transition.viaBypass,
      ),
    );
  };

  return {
    showActionModal,
    setShowActionModal,
    selectedAction,
    setSelectedAction,
    openAction,
    openTransitionAction,
    createAssignTechnicianAction,
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
    setRentedDays,
    checkoutDriver,
    setCheckoutDriver,
    checkoutVehiclePlate,
    setCheckoutVehiclePlate,
    checkoutMealBudget,
    setCheckoutMealBudget,
    showDeclineModal,
    setShowDeclineModal,
    declineReason,
    setDeclineReason,
    showDamageModal,
    setShowDamageModal,
    damageDescription,
    setDamageDescription,
    damageType,
    setDamageType,
    damageSelectedAssetId,
    setDamageSelectedAssetId,
    damageQty,
    setDamageQty,
    damageAttachments,
    setDamageAttachments,
    staff,
    selectedTechnicianIds,
    setSelectedTechnicianIds,
    assignTechnicians: assignTechnicians.mutate,
    isAssigningTechnicians: assignTechnicians.isPending,
    myTechnicianAssignment,
    pendingAssignment,
    acceptAssignment: () => acceptAssignment.mutate(),
    accepting: acceptAssignment.isPending,
    declineAssignment: (reason: string) => declineAssignment.mutate(reason),
    declining: declineAssignment.isPending,
    submitDamageReport: submitDamageReport.mutate,
    submittingDamage: submitDamageReport.isPending,
    performCheckout: () => performCheckout.mutate(),
    isCheckingOut: performCheckout.isPending,
    performCheckin: performCheckin.mutate,
    isCheckingIn: performCheckin.isPending,
    reverseCheckout: reverseCheckout.mutate,
    isReversingCheckout: reverseCheckout.isPending,
    transitionStatus: transitionStatus.mutate,
    isTransitioning: transitionStatus.isPending,
    recordPayment: recordPayment.mutate,
    isRecordingPayment: recordPayment.isPending,
    confirmBookingWithPayment: confirmBookingWithPayment.mutate,
    isConfirmingWithPayment: confirmBookingWithPayment.isPending,
    checkoutConflicts,
    showCheckoutConflictModal,
    setShowCheckoutConflictModal,
    onGoToEquipmentTab,
    canOverrideAvailability,
  };
}

export type BookingActions = ReturnType<typeof useBookingActions>;
