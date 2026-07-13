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
  type Booking,
  type BookingStatus,
} from "@/features/bookings/services/bookings.api";
import { getStaffApi } from "@/features/users/services/staff.api";
import { checkoutBookingApi } from "@/features/checkout/services/operations.api";
import type { BookingAction } from "@/features/bookings/constants";

export function useBookingActions(
  code: string,
  booking: Booking | undefined,
  options?: { canFetchStaff?: boolean }
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const canFetchStaff = options?.canFetchStaff ?? false;

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BookingAction | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [paymentType, setPaymentType] = useState<"advance" | "fully_paid">("advance");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [advancePayment, setAdvancePayment] = useState(0);
  const [fullPayment, setfullPayment] = useState(0);

  const [checkoutTeamLeader, setCheckoutTeamLeader] = useState("");
  const [checkoutDriver, setCheckoutDriver] = useState("");
  const [checkoutVehiclePlate, setCheckoutVehiclePlate] = useState("");
  const [checkoutMealBudget, setCheckoutMealBudget] = useState(0);
  const [checkoutSignature, setCheckoutSignature] = useState("");

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [damageType, setDamageType] = useState<"DAMAGE" | "MISSING">("DAMAGE");
  const [damageSelectedAssetId, setDamageSelectedAssetId] = useState("");
  const [damageQty, setDamageQty] = useState("1");

  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    if (booking) {
      setfullPayment(booking.amount);
      const existingAdvance = booking.customFields?.advancePayment;
      setAdvancePayment(
        existingAdvance !== undefined ? parseFloat(existingAdvance) : booking.amount / 2
      );
    }
  }, [booking]);

  useEffect(() => {
    if (booking) {
      setCheckoutTeamLeader(booking.teamLeader || "");
      setCheckoutDriver(booking.driver || "");
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
    mutationFn: (payload: { description?: string; poolId?: string; itemId?: string; reportType: "DAMAGE" | "MISSING"; quantity?: string }) => {
      if (!booking) throw new Error("Booking is undefined");
      return createDamageReportApi(booking.code, payload);
    },
    onSuccess: () => {
      toast.success("Damage report submitted successfully!");
      setShowDamageModal(false);
      setDamageDescription("");
      setDamageSelectedAssetId("");
      setDamageQty("1");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
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

  const { mutate: confirmBookingWithPayment, isPending: isConfirmingWithPayment } = useMutation({
    mutationFn: async ({
      toPaymentStatus,
      amount,
      totalAmount,
    }: {
      toPaymentStatus: string;
      amount: number;
      totalAmount: number;
    }) => {
      if (!booking) throw new Error("Booking is undefined");

      // 1. Update the booking with total contract value
      await updateBookingApi(booking.code, {
        amount: totalAmount,
      });

      // 2. Record the payment
      await recordBookingPaymentApi(code, toPaymentStatus, amount);

      // 3. Transition booking status to CONFIRMED
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
    fullPayment,
    setfullPayment,
    checkoutTeamLeader,
    setCheckoutTeamLeader,
    checkoutDriver,
    setCheckoutDriver,
    checkoutVehiclePlate,
    setCheckoutVehiclePlate,
    checkoutMealBudget,
    setCheckoutMealBudget,
    checkoutSignature,
    setCheckoutSignature,
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
    staff,
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
  };
}
