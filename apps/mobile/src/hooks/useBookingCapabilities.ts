import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useAllowedTransitions } from "@/hooks/useOperations";
import { PERMISSION } from "@/lib/auth/permission-keys";
import type { AllowedTransition } from "@/services/bookings-api";
import type { Booking, BookingAssignment, BookingStatus } from "@/types/domain";
import {
  createAssignTechnicianAction,
  resolveBookingAction,
  type BookingAction,
} from "@/utils/bookingActions";

export const BOOKING_TABS = [
  "Overview",
  "Schedule",
  "Team",
  "Equipment",
  "Payments",
  "Files",
  "Activity",
  "Evaluations",
] as const;

export type BookingTabName = (typeof BOOKING_TABS)[number];

const ASSIGNMENT_ACTION_IDS = new Set([
  "booking.accept",
  "assignment.accept",
  "assignment.decline",
  "assignment_accept",
  "assignment_decline",
]);

function isDeclinedAssignment(a: BookingAssignment & { declineReason?: string | null }): boolean {
  return !!(a as { declineReason?: string | null }).declineReason;
}

function isNonDeclinedAssignment(
  a: BookingAssignment & { declineReason?: string | null },
): boolean {
  return !isDeclinedAssignment(a);
}

/**
 * Permission + assignment + allowed-transitions capabilities for a booking.
 * Mirrors apps/web/src/features/bookings/hooks/useBookingCapabilities.ts.
 * Do not gate on role strings.
 */
export function useBookingCapabilities(booking: Booking | undefined) {
  const { authUser } = useAppContext();
  const { can, canAny, permissions } = usePermissions();
  const bookingId = booking?.id ?? "";
  const {
    data: transitionsResponse,
    isLoading: transitionsLoading,
    error: transitionsError,
  } = useAllowedTransitions(bookingId, booking?.status);

  const myAssignments = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return [];
    return booking.assignments.filter(
      (a) => a.userId === authUser.id && isNonDeclinedAssignment(a),
    );
  }, [booking?.assignments, authUser?.id]);

  const isAssigned = myAssignments.length > 0;

  const myTechAssignment = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return null;
    return (
      booking.assignments.find(
        (a) =>
          a.userId === authUser.id &&
          (a.roleContext === "TECHNICIAN" || a.roleContext === "technician"),
      ) || null
    );
  }, [booking?.assignments, authUser?.id]);

  const pendingTechAssignment = !!(
    myTechAssignment &&
    (myTechAssignment as { respondedAt?: string | null }).respondedAt == null &&
    !(myTechAssignment as { declineReason?: string | null }).declineReason
  );

  const canAcceptAssignment = pendingTechAssignment && can(PERMISSION.ASSIGNMENT_ACCEPT);
  const canDeclineAssignment = pendingTechAssignment && can(PERMISSION.ASSIGNMENT_DECLINE);

  const canEditBooking =
    can(PERMISSION.BOOKING_EDIT) || (can(PERMISSION.BOOKING_VIEW_ASSIGNED) && isAssigned);

  /**
   * Core booking / vehicle / logistics field edits.
   * Field technicians (view_assigned only) stay read-only even if booking.edit was mis-granted.
   */
  const canEditLogistics =
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
  const canReportDamage = can(PERMISSION.DAMAGE_REPORT);
  const canSubmitEval =
    can(PERMISSION.EVAL_SUBMIT_INTERNAL) &&
    !!booking?.assignments?.some(
      (a) =>
        a.userId === authUser?.id &&
        (a.roleContext === "TECHNICIAN" || a.roleContext === "technician") &&
        isNonDeclinedAssignment(a),
    );
  const canViewEval = can(PERMISSION.EVAL_VIEW) || can(PERMISSION.EVAL_SUBMIT_INTERNAL);
  const showFinancials = can(PERMISSION.PAYMENT_MANAGE);

  const canFetchStaff = canAny([
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
    PERMISSION.USER_VIEW,
  ]);

  const canAssignTechnician = can(PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN);
  const canAssignCrew = can(PERMISSION.ASSIGNMENT_ASSIGN_CREW);
  const canReverseCheckout = can(PERMISSION.INVENTORY_CHECKOUT_REVERSE);
  const bomEditableStatus = booking?.status === "ACCEPTED" || booking?.status === "PREPARATION";
  const canEditBom =
    !!bomEditableStatus &&
    (can(PERMISSION.BOM_CREATE) ||
      (can(PERMISSION.BOOKING_VIEW_ASSIGNED) && isAssigned) ||
      can(PERMISSION.BOOKING_EDIT));
  const canWriteTechnicalHolds = can(PERMISSION.INVENTORY_RESERVE);
  /** Writers see holds beyond RESERVED; others only at RESERVED (web registry parity). */
  const showTechnicalHolds =
    !!booking &&
    (canWriteTechnicalHolds || booking.status === "RESERVED") &&
    booking.status !== "DONE" &&
    booking.status !== "CANCELED";
  const showOpsSidebar = canAny([
    PERMISSION.BOOKING_VIEW_ALL,
    PERMISSION.BOOKING_CONFIRM,
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
  ]);
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
      .filter((t: AllowedTransition) => {
        const id = t.actionId || t.permissionKey;
        if (ASSIGNMENT_ACTION_IDS.has(id)) return false;
        if (
          (t.permissionKey === PERMISSION.BOOKING_CONFIRM ||
            t.actionId === "booking.confirm" ||
            t.actionId === "booking_confirm") &&
          !hasTechnicalHolds
        ) {
          return false;
        }
        return true;
      })
      .map((t) =>
        resolveBookingAction(
          t.actionId,
          t.permissionKey,
          t.toStatus,
          t.reasonRequired,
          t.viaBypass,
        ),
      );
  }, [transitionsResponse?.transitions, booking?.ctoNotes, booking?.itemServiceSpec]);

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

  const assignTechnicianAction = useMemo((): BookingAction | null => {
    if (!canAssignTechnician || !booking) return null;

    const fromTransitions = statusActions.find(
      (a) => a.id === "assignment.assign_technician" || a.requiresForm === "assign",
    );
    if (fromTransitions) return fromTransitions;

    if (booking.status === "CONFIRMED" || booking.status === "ASSIGNED") {
      return createAssignTechnicianAction();
    }

    return null;
  }, [canAssignTechnician, booking, statusActions]);

  const visibleTabs: BookingTabName[] = useMemo(() => {
    const showPayments = can(PERMISSION.PAYMENT_MANAGE);
    const showOpsTabs = canAny([
      PERMISSION.BOOKING_VIEW_ALL,
      PERMISSION.BOOKING_EDIT,
      PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
      PERMISSION.ASSIGNMENT_ASSIGN_CREW,
      PERMISSION.BOOKING_CONFIRM,
    ]);

    return BOOKING_TABS.filter((tab) => {
      if (tab === "Payments") return showPayments;
      if (tab === "Schedule" || tab === "Team") return showOpsTabs;
      if (tab === "Evaluations") return canViewEval;
      return true;
    });
  }, [can, canAny, canViewEval]);

  const declinedTechnicianAssignments = useMemo(
    () =>
      (booking?.assignments || []).filter(
        (a) =>
          (a.roleContext === "TECHNICIAN" || a.roleContext === "technician") &&
          isDeclinedAssignment(a),
      ),
    [booking?.assignments],
  );

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
    canEditLogistics,
    canManageCustomer,
    canReportDamage,
    canSubmitEval,
    canViewEval,
    showFinancials,
    canFetchStaff,
    canAssignTechnician,
    canAssignCrew,
    canReverseCheckout,
    canEditBom,
    canWriteTechnicalHolds,
    showTechnicalHolds,
    showOpsSidebar,
    showTechAcceptedWorkspace,
    statusActions,
    advancePreparationAction,
    assignTechnicianAction,
    visibleTabs,
    showFieldOpsBanner,
    declinedTechnicianAssignments,
    showDeclinedAssignmentBanner,
    transitionsLoading,
    transitionsError,
    transitionsResponse,
  };
}

export type BookingCapabilities = ReturnType<typeof useBookingCapabilities>;

export type { BookingStatus };
