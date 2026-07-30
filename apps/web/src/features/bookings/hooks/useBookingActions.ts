import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  acceptAssignmentApi,
  declineAssignmentApi,
  createDamageReportApi,
  updateBookingApi,
  transitionBookingStatusApi,
  recordBookingPaymentApi,
  createAssignmentApi,
  type Booking,
  type BookingStatus,
} from "@/features/bookings/services/bookings.api";
import { isChiefTechnicianRole } from "@/features/bookings/utils/staffRoles";
import { isDeclinedAssignment } from "@/features/bookings/utils/assignmentHelpers";
import { getStaffApi } from "@/features/users/services/staff.api";
import { checkoutBookingApi } from "@/features/checkout/services/operations.api";
import { uploadBookingAttachmentApi } from "@/features/bookings/services/attachments.api";
import type { BookingAction } from "@/features/bookings/constants";
import type { UnfulfilledBomLine } from "@/features/bookings/components/BomFulfillmentConflictModal";

export function useBookingActions(
  code: string,
  booking: Booking | undefined,
  options?: { canFetchStaff?: boolean; onGoToEquipmentTab?: () => void; canOverrideAvailability?: boolean }
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authUser = useAuthUser();
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

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [damageType, setDamageType] = useState<"DAMAGE" | "MISSING">("DAMAGE");
  const [damageSelectedAssetId, setDamageSelectedAssetId] = useState("");
  const [damageQty, setDamageQty] = useState("1");
  const [damageAttachments, setDamageAttachments] = useState<File[]>([]);

  const [staff, setStaff] = useState<any[]>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [checkoutConflicts, setCheckoutConflicts] = useState<UnfulfilledBomLine[]>([]);
  const [showCheckoutConflictModal, setShowCheckoutConflictModal] = useState(false);

  useEffect(() => {
    if (booking) {
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
    }
  }, [booking]);

  useEffect(() => {
    if (booking) {
      setCheckoutDriver(booking.driver !== "None Assigned" ? booking.driver : "");
      setCheckoutVehiclePlate((booking as any).vehiclePlate || "");
      setCheckoutMealBudget(booking.mealBudget || 0);
    }
  }, [booking]);

  useEffect(() => {
    if (!canFetchStaff) return;
    getStaffApi()
      .then(setStaff)
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
        (a: any) =>
          a.userId === authUser.id &&
          (a.roleContext === "TECHNICIAN" || a.roleContext === "technician")
      ) || null
    );
  }, [booking, authUser]);

  const pendingAssignment = !!(
    myTechnicianAssignment && myTechnicianAssignment.respondedAt == null
  );

  const { mutate: acceptAssignment, isPending: accepting } = useMutation({
    mutationFn: () => {
      if (!myTechnicianAssignment) throw new Error("No assignment found to accept");
      return acceptAssignmentApi(myTechnicianAssignment.id);
    },
    onSuccess: () => {
      toast.success("Assignment accepted successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to accept assignment");
    },
  });

  const { mutate: declineAssignment, isPending: declining } = useMutation({
    mutationFn: (reason: string) => {
      if (!myTechnicianAssignment) throw new Error("No assignment found to decline");
      return declineAssignmentApi(myTechnicianAssignment.id, reason);
    },
    onSuccess: () => {
      toast.success("Assignment declined.");
      setShowDeclineModal(false);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      navigate({ to: "/bookings" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to decline assignment");
    },
  });

  const { mutate: submitDamageReport, isPending: submittingDamage } = useMutation({
    mutationFn: async (payload: {
      description?: string;
      poolId?: string;
      itemId?: string;
      reportType: "DAMAGE" | "MISSING";
      quantity?: string;
      attachments?: File[];
    }) => {
      if (!booking) throw new Error("Booking is undefined");
      const { attachments: files = [], ...reportPayload } = payload;
      const report = await createDamageReportApi(booking.code, reportPayload);

      if (files.length > 0 && report?.id) {
        await Promise.all(
          files.map((file) =>
            uploadBookingAttachmentApi(booking.id, file, {
              relatedEntity: "damage_missing_report",
              relatedId: report.id,
            })
          )
        );
      }

      return report;
    },
    onSuccess: (_report, variables) => {
      const attachmentCount = variables.attachments?.length ?? 0;
      toast.success(
        attachmentCount > 0
          ? `Damage report submitted with ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}.`
          : "Damage report submitted successfully!"
      );
      setShowDamageModal(false);
      setDamageDescription("");
      setDamageSelectedAssetId("");
      setDamageQty("1");
      setDamageAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["booking-attachments", booking?.id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit damage report");
    },
  });

  const { mutate: performCheckout, isPending: isCheckingOut } = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("Booking is undefined");
      
      // 1. Update logistics details
      await updateBookingApi(booking.code, {
        vehiclePlate: checkoutVehiclePlate,
        mealProvision: String(checkoutMealBudget),
        vehicleText: `Driver: ${checkoutDriver}`,
      });

      // 2. Perform the checkout
      const assets = booking.bomItems.map((item) => {
        if (item.itemId) {
          return { itemId: item.itemId };
        } else {
          return {
            poolId: item.poolId,
            quantity: String(item.qty),
          };
        }
      });
      return await checkoutBookingApi(booking.code, { assets });
    },
    onSuccess: () => {
      toast.success("Checkout completed successfully! Booking status updated to ONSITE.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      const data = err.data;
      const unfulfilled = (
        data?.unfulfilledLines ??
        (typeof data?.message === "object" ? data.message?.unfulfilledLines : undefined)
      ) as UnfulfilledBomLine[] | undefined;
      if (err.status === 409 && Array.isArray(unfulfilled) && unfulfilled.length > 0) {
        setCheckoutConflicts(unfulfilled);
        setShowCheckoutConflictModal(true);
        return;
      }
      toast.error(err.message || "Checkout failed");
    },
  });

  const { mutate: transitionStatus, isPending: isTransitioning } = useMutation({
    mutationFn: ({
      toStatus,
      reason,
      override,
    }: {
      toStatus: BookingStatus;
      reason?: string;
      override?: boolean;
    }) => transitionBookingStatusApi(code, toStatus, reason, override ?? false),
    onSuccess: () => {
      toast.success("Booking state advanced successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to advance booking state");
    },
  });

  const { mutate: recordPayment, isPending: isRecordingPayment } = useMutation({
    mutationFn: ({ toStatus, amount }: { toStatus: string; amount: number }) =>
      recordBookingPaymentApi(code, toStatus, amount),
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  const { mutate: assignTechnicians, isPending: isAssigningTechnicians } = useMutation({
    mutationFn: async (techIds: string[]) => {
      if (!booking) throw new Error("Booking is undefined");

      const staffById = new Map(staff.map((s) => [s.id, s]));
      const alreadyAssigned = new Set(
        (booking.assignments || [])
          .filter(
            (a: any) =>
              a.roleContext === "TECHNICIAN" &&
              !isDeclinedAssignment(a)
          )
          .map((a: any) => a.userId)
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
      toast.success("Technician assignment completed!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
      setSelectedTechnicianIds([]);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign technicians");
    },
  });

  const { mutate: confirmBookingWithPayment, isPending: isConfirmingWithPayment } = useMutation({
    mutationFn: async ({
      toPaymentStatus,
      amount,
      totalAmount,
      pricingDailyRate,
      pricingRentedDays,
    }: {
      toPaymentStatus: string;
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
          code,
          toPaymentStatus,
          toPaymentStatus === "fully_paid" ? totalAmount : amount,
        );
      }

      await transitionBookingStatusApi(code, "CONFIRMED");
    },
    onSuccess: () => {
      toast.success("Booking confirmed and payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions", booking?.id] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to confirm booking");
    },
  });

  return {
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
    assignTechnicians,
    isAssigningTechnicians,
    myTechnicianAssignment,
    pendingAssignment,
    acceptAssignment,
    accepting,
    declineAssignment,
    declining,
    submitDamageReport,
    submittingDamage,
    performCheckout,
    isCheckingOut,
    transitionStatus,
    isTransitioning,
    recordPayment,
    isRecordingPayment,
    confirmBookingWithPayment,
    isConfirmingWithPayment,
    checkoutConflicts,
    showCheckoutConflictModal,
    setShowCheckoutConflictModal,
    onGoToEquipmentTab,
    canOverrideAvailability,
  };
}
