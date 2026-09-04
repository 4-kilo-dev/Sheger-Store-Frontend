import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { runWithPollTimeout } from "@vortex/utils";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import {
  getBookingAllowedTransitionsApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import { useBookingPollQueryOptions } from "@/features/bookings/hooks/useBookingPoll";
import {
  ASSIGNMENT_ACTION_IDS,
  TABS,
  resolveBookingActionUI,
  createAssignTechnicianAction,
  type BookingAction,
  type TabName,
} from "@/features/bookings/constants";
import {
  getActiveTechnicianAssignments,
  getDeclinedTechnicianAssignments,
  isAssignedTechnicianOnBooking,
  isDeclinedAssignment,
} from "@/features/bookings/utils/assignmentHelpers";

const BOOKING_UPDATE_LOCKED_STATUSES = new Set([
  "CANCELED",
  "COMPLETED",
  "PARTIALLY_RETURNED",
  "DONE",
]);

function isNonDeclinedAssignment(a: any): boolean {
  return !isDeclinedAssignment(a);
}

/**
 * Permission + assignment + allowed-transitions capabilities for a booking.
 * Do not gate on role strings.
 */
export function useBookingCapabilities(booking: Booking | undefined) {
  const authUser = useAuthUser();
  const { can, canAny, permissions } = usePermissions();

  const bookingId = booking?.id;
  const pollOptions = useBookingPollQueryOptions("transitions", booking?.status);
  const {
    data: transitionsResponse,
    isLoading: transitionsLoading,
    error: transitionsError,
  } = useQuery({
    queryKey: ["booking-allowed-transitions", bookingId],
    queryFn: ({ signal }) =>
      runWithPollTimeout(
        (pollSignal) => getBookingAllowedTransitionsApi(bookingId!, { signal: pollSignal }),
        signal,
      ),
    enabled: !!bookingId,
    ...pollOptions,
    retry: false,
  });

  const myAssignments = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return [];
    return booking.assignments.filter(
      (a: any) => a.userId === authUser.id && isNonDeclinedAssignment(a),
    );
  }, [booking?.assignments, authUser?.id]);

  const isAssigned = myAssignments.length > 0;

  const myTechAssignment = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return null;
    return (
      booking.assignments.find(
        (a: any) =>
          a.userId === authUser.id &&
          (a.roleContext === "TECHNICIAN" || a.roleContext === "technician"),
      ) || null
    );
  }, [booking?.assignments, authUser?.id]);

  const pendingTechAssignment = !!(
    myTechAssignment &&
    myTechAssignment.respondedAt == null &&
    !myTechAssignment.declineReason
  );

  const canAcceptAssignment = pendingTechAssignment && can(PERMISSION.ASSIGNMENT_ACCEPT);
  const canDeclineAssignment = pendingTechAssignment && can(PERMISSION.ASSIGNMENT_DECLINE);

  // Completed bookings remain visible, but their booking data is immutable.
  // Close-out actions such as check-in and reporting damage are handled separately.
  const isBookingUpdateLocked = !!booking && BOOKING_UPDATE_LOCKED_STATUSES.has(booking.status);

  const canEditBooking =
    !isBookingUpdateLocked &&
    (can(PERMISSION.BOOKING_EDIT) || (can(PERMISSION.BOOKING_VIEW_ASSIGNED) && isAssigned));

  const canDeleteBooking = can(PERMISSION.BOOKING_DELETE);
  const canForceDone = can(PERMISSION.BOOKING_FORCE_DONE);

  /**
   * Core booking / vehicle / logistics field edits.
   * Requires booking.edit plus an ops-facing grant so field technicians
   * (view_assigned only) stay read-only even if booking.edit was mis-granted.
   */
  const canEditLogistics =
    !isBookingUpdateLocked &&
    can(PERMISSION.BOOKING_EDIT) &&
    canAny([
      PERMISSION.BOOKING_VIEW_ALL,
      PERMISSION.BOOKING_CONFIRM,
      PERMISSION.BOOKING_CREATE,
      PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
      PERMISSION.ASSIGNMENT_ASSIGN_CREW,
      PERMISSION.CUSTOMER_MANAGE,
      PERMISSION.PAYMENT_MANAGE,
    ]);
  const canManageCustomer = can(PERMISSION.CUSTOMER_MANAGE);
  const canEditDriverLogistics = !isBookingUpdateLocked && can(PERMISSION.DRIVER_TRIP_EDIT);

  const canReportDamage = can(PERMISSION.DAMAGE_REPORT);
  const canSubmitEval =
    can(PERMISSION.EVAL_SUBMIT_INTERNAL) &&
    isAssignedTechnicianOnBooking(booking?.assignments, authUser?.id);
  const canViewEval = can(PERMISSION.EVAL_VIEW) || can(PERMISSION.EVAL_SUBMIT_INTERNAL);

  /** Finance surfaces (payments, revenue, financial figures) — Admin/CCR only. */
  const showFinancials = can(PERMISSION.PAYMENT_MANAGE);

  const canFetchStaff = canAny([
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
    PERMISSION.USER_VIEW,
  ]);

  const canAssignTechnician = can(PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN);
  const canAssignCrew = can(PERMISSION.ASSIGNMENT_ASSIGN_CREW);
  const canReverseCheckout = can(PERMISSION.INVENTORY_CHECKOUT_REVERSE);
  const canOverrideAvailability = can(PERMISSION.INVENTORY_OVERRIDE_AVAILABILITY);
  const bomEditableStatus = booking?.status === "ACCEPTED" || booking?.status === "PREPARATION";
  const canEditBom =
    bomEditableStatus &&
    (can(PERMISSION.BOM_CREATE) ||
      (can(PERMISSION.BOOKING_VIEW_ASSIGNED) && isAssigned) ||
      can(PERMISSION.BOOKING_EDIT));
  const canAddBomMaterials =
    canEditBom ||
    (booking?.status === "ONSITE" &&
      myAssignments.some(
        (assignment: any) =>
          assignment.roleContext === "TECHNICIAN" || assignment.roleContext === "OO",
      ) &&
      !can(PERMISSION.BOM_CREATE));
  /** Soft-hold create/release — inventory.reserve (not warehouse checkout). */
  const canWriteTechnicalHolds = !isBookingUpdateLocked && can(PERMISSION.INVENTORY_RESERVE);
  const showOpsSidebar = canAny([
    PERMISSION.BOOKING_VIEW_ALL,
    PERMISSION.BOOKING_CONFIRM,
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
  ]);
  /** Field-tech ACCEPTED workspace (brief + files) — assigned viewer without full ops sidebar. */
  const showTechAcceptedWorkspace =
    !!booking &&
    booking.status === "ACCEPTED" &&
    isAssigned &&
    can(PERMISSION.BOOKING_VIEW_ASSIGNED) &&
    !can(PERMISSION.BOOKING_VIEW_ALL);

  const statusActions: BookingAction[] = useMemo(() => {
    const edges = transitionsResponse?.transitions ?? [];
    const hasTechnicalHolds = !!(booking?.ctoNotes || booking?.itemServiceSpec);

    return edges
      .filter((t) => {
        const id = t.actionId || t.permissionKey;
        if (ASSIGNMENT_ACTION_IDS.has(id)) return false;
        const isConfirmAction =
          t.permissionKey === PERMISSION.BOOKING_CONFIRM ||
          t.actionId === "booking.confirm" ||
          t.actionId === "booking_confirm";
        if (isConfirmAction && booking?.status !== "RESERVED") return false;
        if (isConfirmAction && !hasTechnicalHolds) return false;
        if (t.toStatus === booking?.status) return false;
        return true;
      })
      .map((t) => {
        const ui = resolveBookingActionUI(t.actionId, t.permissionKey, t.toStatus);
        const requiresReason = !!(t.reasonRequired || ui.variant === "destructive");
        return {
          ...ui,
          id: ui.id,
          targetStatus: t.toStatus,
          permissionKey: t.permissionKey,
          reasonRequired: requiresReason,
          requiresReason,
          viaBypass: t.viaBypass,
          requiresForm: ui.requiresForm,
        } satisfies BookingAction;
      });
  }, [
    transitionsResponse?.transitions,
    booking?.ctoNotes,
    booking?.itemServiceSpec,
    booking?.status,
  ]);

  const advancePreparationAction = useMemo(
    () =>
      statusActions.find(
        (a) =>
          a.targetStatus === "PREPARATION" ||
          a.permissionKey === PERMISSION.BOM_CREATE ||
          a.id === "bom.create",
      ) || null,
    [statusActions],
  );

  const visibleTabs: TabName[] = useMemo(() => {
    const showPayments = can(PERMISSION.PAYMENT_MANAGE);
    const canViewOperationalDetails = canAny([
      PERMISSION.BOOKING_VIEW_ALL,
      PERMISSION.BOOKING_VIEW_ASSIGNED,
      PERMISSION.BOOKING_EDIT,
      PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
      PERMISSION.ASSIGNMENT_ASSIGN_CREW,
      PERMISSION.BOOKING_CONFIRM,
    ]);

    return TABS.filter((tab) => {
      if (tab === "Payments") return showPayments;
      if (tab === "Schedule" || tab === "Team") return canViewOperationalDetails;
      if (tab === "Evaluations") return canViewEval;
      return true;
    });
  }, [can, canAny, canViewEval]);

  const declinedTechnicianAssignments = useMemo(
    () => getDeclinedTechnicianAssignments(booking?.assignments),
    [booking?.assignments],
  );

  const activeTechnicianAssignments = useMemo(
    () => getActiveTechnicianAssignments(booking?.assignments),
    [booking?.assignments],
  );

  const assignTechnicianAction = useMemo((): BookingAction | null => {
    if (!canAssignTechnician || !booking) return null;

    const fromTransitions = statusActions.find(
      (a) => a.id === "assignment.assign_technician" || a.requiresForm === "assign",
    );
    if (fromTransitions) return fromTransitions;

    if (["CONFIRMED", "ASSIGNED", "ACCEPTED", "PREPARATION", "ONSITE"].includes(booking.status)) {
      return createAssignTechnicianAction();
    }

    return null;
  }, [canAssignTechnician, booking, statusActions]);

  const showDeclinedAssignmentBanner =
    canAssignTechnician &&
    declinedTechnicianAssignments.length > 0 &&
    assignTechnicianAction != null;

  const showFieldOpsBanner =
    canAcceptAssignment ||
    canDeclineAssignment ||
    !!advancePreparationAction ||
    (canReportDamage && (booking?.status === "ONSITE" || booking?.status === "COMPLETED")) ||
    (canSubmitEval && booking?.status === "ONSITE");

  return {
    permissions,
    can,
    canAny,
    isAssigned,
    myAssignments,
    myTechAssignment,
    pendingTechAssignment,
    canAcceptAssignment,
    canDeclineAssignment,
    canEditBooking,
    isBookingUpdateLocked,
    canDeleteBooking,
    canForceDone,
    canEditLogistics,
    canManageCustomer,
    canEditDriverLogistics,
    canReportDamage,
    canSubmitEval,
    canViewEval,
    showFinancials,
    canFetchStaff,
    canAssignTechnician,
    canAssignCrew,
    canReverseCheckout,
    canOverrideAvailability,
    canEditBom,
    canAddBomMaterials,
    canWriteTechnicalHolds,
    showOpsSidebar,
    showTechAcceptedWorkspace,
    statusActions,
    advancePreparationAction,
    visibleTabs,
    showFieldOpsBanner,
    declinedTechnicianAssignments,
    activeTechnicianAssignments,
    assignTechnicianAction,
    showDeclinedAssignmentBanner,
    transitionsLoading,
    transitionsError,
    transitionsResponse,
  };
}

export type BookingCapabilities = ReturnType<typeof useBookingCapabilities>;
