import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import {
  getBookingAllowedTransitionsApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import {
  ASSIGNMENT_ACTION_IDS,
  TABS,
  resolveBookingActionUI,
  type BookingAction,
  type TabName,
} from "@/features/bookings/constants";

function isNonDeclinedAssignment(a: any): boolean {
  if (!a) return false;
  const status = (a.status || a.responseStatus || "").toString().toUpperCase();
  if (status === "DECLINED") return false;
  // Legacy: declined rows often have respondedAt + declineReason
  if (a.declineReason && a.respondedAt) return false;
  return true;
}

/**
 * Permission + assignment + allowed-transitions capabilities for a booking.
 * Do not gate on role strings.
 */
export function useBookingCapabilities(booking: Booking | undefined) {
  const authUser = useAuthUser();
  const { can, canAny, permissions } = usePermissions();

  const bookingId = booking?.id;
  const {
    data: transitionsResponse,
    isLoading: transitionsLoading,
    error: transitionsError,
  } = useQuery({
    queryKey: ["booking-allowed-transitions", bookingId],
    queryFn: () => getBookingAllowedTransitionsApi(bookingId!),
    enabled: !!bookingId,
    retry: false,
  });

  const myAssignments = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return [];
    return booking.assignments.filter(
      (a: any) => a.userId === authUser.id && isNonDeclinedAssignment(a)
    );
  }, [booking?.assignments, authUser?.id]);

  const isAssigned = myAssignments.length > 0;

  const myTechAssignment = useMemo(() => {
    if (!booking?.assignments || !authUser?.id) return null;
    return (
      booking.assignments.find(
        (a: any) =>
          a.userId === authUser.id &&
          (a.roleContext === "TECHNICIAN" || a.roleContext === "technician")
      ) || null
    );
  }, [booking?.assignments, authUser?.id]);

  const pendingTechAssignment = !!(
    myTechAssignment &&
    myTechAssignment.respondedAt == null &&
    !myTechAssignment.declineReason
  );

  const canAcceptAssignment =
    pendingTechAssignment && can(PERMISSION.ASSIGNMENT_ACCEPT);
  const canDeclineAssignment =
    pendingTechAssignment && can(PERMISSION.ASSIGNMENT_DECLINE);

  const canEditBooking =
    can(PERMISSION.BOOKING_EDIT) ||
    (can(PERMISSION.BOOKING_VIEW_ASSIGNED) && isAssigned);

  const canReportDamage = can(PERMISSION.DAMAGE_REPORT);
  const canSubmitEval = can(PERMISSION.EVAL_SUBMIT_INTERNAL);
  const canViewEval = can(PERMISSION.EVAL_VIEW) || canSubmitEval;

  const canFetchStaff = canAny([
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
    PERMISSION.USER_MANAGE,
  ]);

  const canAssignTechnician = can(PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN);
  const canAssignCrew = can(PERMISSION.ASSIGNMENT_ASSIGN_CREW);
  const canReverseCheckout = can(PERMISSION.INVENTORY_CHECKOUT_REVERSE);
  const canEditBom =
    can(PERMISSION.BOM_CREATE) ||
    (can(PERMISSION.BOOKING_VIEW_ASSIGNED) && isAssigned && booking?.status === "ACCEPTED");
  const canWriteTechnicalHolds = can(PERMISSION.BOM_CREATE);
  const showOpsSidebar = canAny([
    PERMISSION.BOOKING_VIEW_ALL,
    PERMISSION.BOOKING_EDIT,
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
        // Soft UX: confirm usually needs tech holds (API may still 400)
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
  }, [transitionsResponse?.transitions, booking?.ctoNotes, booking?.itemServiceSpec]);

  const advancePreparationAction = useMemo(
    () =>
      statusActions.find(
        (a) =>
          a.targetStatus === "PREPARATION" ||
          a.permissionKey === PERMISSION.BOM_CREATE ||
          a.id === "bom.create"
      ) || null,
    [statusActions]
  );

  const visibleTabs: TabName[] = useMemo(() => {
    const showPayments = can(PERMISSION.BOOKING_CONFIRM);
    const showOpsTabs = canAny([
      PERMISSION.BOOKING_VIEW_ALL,
      PERMISSION.BOOKING_EDIT,
      PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
      PERMISSION.ASSIGNMENT_ASSIGN_CREW,
      PERMISSION.BOOKING_CONFIRM,
    ]);

    return TABS.filter((tab) => {
      if (tab === "Payments") return showPayments;
      if (tab === "Schedule" || tab === "Team") return showOpsTabs;
      if (tab === "Evaluations") return canViewEval;
      return true;
    });
  }, [can, canAny, canViewEval]);

  const showFieldOpsBanner =
    canAcceptAssignment ||
    canDeclineAssignment ||
    !!advancePreparationAction ||
    (canReportDamage &&
      (booking?.status === "ONSITE" || booking?.status === "COMPLETED")) ||
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
    canReportDamage,
    canSubmitEval,
    canViewEval,
    canFetchStaff,
    canAssignTechnician,
    canAssignCrew,
    canReverseCheckout,
    canEditBom,
    canWriteTechnicalHolds,
    showOpsSidebar,
    showTechAcceptedWorkspace,
    statusActions,
    advancePreparationAction,
    visibleTabs,
    showFieldOpsBanner,
    transitionsLoading,
    transitionsError,
    transitionsResponse,
  };
}

export type BookingCapabilities = ReturnType<typeof useBookingCapabilities>;
