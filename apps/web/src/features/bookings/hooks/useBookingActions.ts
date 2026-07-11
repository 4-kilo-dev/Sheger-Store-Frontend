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
import { BOOKING_ACTIONS, type BookingAction } from "@/features/bookings/constants";

export function useBookingActions(
  code: string,
  booking: Booking | undefined,
  userRole: string,
  isUserDriver: boolean
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authUser = useAuthUser();

  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BookingAction | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [paymentType, setPaymentType] = useState<"advance" | "fully_paid">("advance");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [amountReceived, setAmountReceived] = useState(0);

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

  // Initialize amountReceived from booking when booking changes
  useEffect(() => {
    if (booking && amountReceived === 0) {
      setAmountReceived(booking.amount);
    }
  }, [booking]);

  // Initialize checkout fields when booking changes
  useEffect(() => {
    if (booking) {
      setCheckoutTeamLeader(booking.teamLeader || "");
      setCheckoutDriver(booking.driver || "");
      setCheckoutVehiclePlate((booking as any).vehiclePlate || "");
      setCheckoutMealBudget(booking.mealBudget || 0);
    }
  }, [booking]);

  // Load staff list if allowed
  useEffect(() => {
    if (userRole === "technician") return;
    getStaffApi()
      .then(setStaff)
      .catch((e) => console.error("Failed to load staff in useBookingActions", e));
  }, [userRole]);

  // Find technician's pending assignment
  const myTechnicianAssignment = useMemo(() => {
    if (!booking || !booking.assignments) return null;
    return booking.assignments.find(
      (a: any) => a.userId === authUser?.id && a.roleContext === "TECHNICIAN"
    );
  }, [booking, authUser]);

  const pendingAssignment = useMemo(() => {
    return !!(myTechnicianAssignment && myTechnicianAssignment.respondedAt === null);
  }, [myTechnicianAssignment]);

  const computedActions = useMemo(() => {
    if (!booking || !userRole) return [];
    const list = BOOKING_ACTIONS[booking.status] || [];
    const hasTechnicalHolds = !!booking.ctoNotes || !!booking.itemServiceSpec;

    return list.filter((act) => {
      const isRoleAllowed = act.allowedRoles.includes(userRole);
      if (!isRoleAllowed) return false;

      // Special case: Confirm Booking is gated by technical holds being saved
      if (booking.status === "RESERVED" && act.id === "booking.confirm") {
        return hasTechnicalHolds;
      }

      // Special case: Accept/Decline is driver-restricted
      if (booking.status === "ASSIGNED" && (act.id === "assignment.accept" || act.id === "assignment.decline")) {
        const isSupervisorOrAdmin = ["admin", "supervisor"].includes(userRole);
        return isUserDriver || isSupervisorOrAdmin;
      }
      return true;
    });
  }, [booking, userRole, isUserDriver]);

  const { mutate: acceptAssignment, isPending: accepting } = useMutation({
    mutationFn: () => {
      if (!myTechnicianAssignment) throw new Error("No assignment found to accept");
      return acceptAssignmentApi(myTechnicianAssignment.id);
    },
    onSuccess: () => {
      toast.success("Assignment accepted successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
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
      return createDamageReportApi(booking.id, payload);
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
      await updateBookingApi(booking.id, {
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
      return await checkoutBookingApi(booking.id, { assets });
    },
    onSuccess: () => {
      toast.success("Checkout completed successfully! Booking status updated to ONSITE.");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Checkout failed");
    },
  });

  const { mutate: transitionStatus, isPending: isTransitioning } = useMutation({
    mutationFn: ({ toStatus, reason }: { toStatus: BookingStatus; reason?: string }) =>
      transitionBookingStatusApi(code, toStatus, reason),
    onSuccess: () => {
      toast.success("Booking state advanced successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
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
      setShowActionModal(false);
      setSelectedAction(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  const { mutate: confirmBookingWithPayment, isPending: isConfirmingWithPayment } = useMutation({
    mutationFn: async ({ toPaymentStatus, amount }: { toPaymentStatus: string; amount: number }) => {
      if (!booking) throw new Error("Booking is undefined");
      await recordBookingPaymentApi(code, toPaymentStatus, amount);
      await transitionBookingStatusApi(code, "CONFIRMED");
    },
    onSuccess: () => {
      toast.success("Booking confirmed and payment recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
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
    amountReceived,
    setAmountReceived,
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
    computedActions,
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
