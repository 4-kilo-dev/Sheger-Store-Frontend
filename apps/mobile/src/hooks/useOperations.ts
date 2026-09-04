import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { runWithPollTimeout } from "@vortex/utils";
import {
  acceptAssignmentApi,
  checkoutReverseApi,
  confirmBookingWithPaymentApi,
  createAssignmentApi,
  createBookingApi,
  createBomLineApi,
  createHandoffSnapshotApi,
  createReservationApi,
  declineAssignmentApi,
  deleteAssignmentApi,
  setCrewTeamLeadApi,
  deleteBomLineApi,
  deleteReservationApi,
  getBookingAllowedTransitionsApi,
  getBookingAssignmentsApi,
  getBookingBomLinesApi,
  getBookingDetailApi,
  getBookingDamageReportsApi,
  getBookingReservationsApi,
  getBookingSnapshotsApi,
  getBookingsApi,
  deleteBookingApi,
  forceDoneBookingApi,
  recordBookingPaymentApi,
  replacePoolReservationsApi,
  transitionBookingStatusApi,
  updateBomLineApi,
  updateBookingApi,
  updateCustomerApi,
} from "@/services/bookings-api";
import {
  checkinBookingApi,
  checkoutBookingApi,
  getBookingCustodyApi,
  type CheckinReturn,
  type CheckoutAsset,
} from "@/services/checkout-api";
import {
  createDamageReportApi,
  getDamageReportsApi,
  resolveDamageReportApi,
} from "@/services/damage-api";
import {
  createInventoryCategoryApi,
  createInventoryItemApi,
  createInventoryPoolApi,
  deactivateInventoryCategoryApi,
  deactivateInventoryEntityApi,
  getInventoryApi,
  getInventoryCategoriesApi,
  getInventoryItemApi,
  updateInventoryCategoryApi,
  updateInventoryItemApi,
  updateInventoryPoolApi,
  type InventoryEntityKind,
  type UpdateCategoryPayload,
  type UpdateItemPayload,
  type UpdatePoolPayload,
} from "@/services/inventory-api";
import {
  getNotificationsApi,
  getPendingTasksApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  getNotificationEventTypesApi,
  createNotificationEventTypeApi,
  updateNotificationEventTypeApi,
  getNotificationRoutingRulesApi,
  createNotificationRoutingRuleApi,
  updateNotificationRoutingRuleApi,
  deleteNotificationRoutingRuleApi,
} from "@/services/notifications-api";
import {
  getPerformanceMetricsApi,
  toggleMetricActiveApi,
} from "@/services/performance-metrics-api";
import {
  createStaffApi,
  getRolesApi,
  getStaffApi,
  resetPasswordApi,
  setStaffFreelancerApi,
  toggleUserActiveApi,
  updateStaffApi,
} from "@/services/staff-api";
import {
  approveDriverTripApi,
  createDriverTripApi,
  listDriverTripsApi,
  updateDriverTripApi,
} from "@/services/driver-trips.api";
import {
  addRolePermissionApi,
  createRoleApi,
  createCustomFieldDefinitionApi,
  deleteRoleApi,
  deleteCustomFieldDefinitionApi,
  getCustomFieldDefinitionsApi,
  getPermissionsApi,
  getRolesWithPermissionsApi,
  getSettingsApi,
  removeRolePermissionApi,
  updateCustomFieldDefinitionApi,
  updateSettingsApi,
  UpdateCustomFieldDefinitionDto,
} from "@/services/settings.api";
import {
  deleteAttachmentApi,
  getBookingAttachmentsApi,
  getDownloadUrlApi,
} from "@/services/attachments.api";
import {
  createPerformanceMetricApi,
  getClientEvaluationApi,
  getInternalEvaluationApi,
  submitClientEvaluationApi,
  submitInternalEvaluationApi,
  updatePerformanceMetricApi,
} from "@/services/evaluations.api";
import type { Booking, BookingStatus } from "@/types/domain";
import { useBookingPollQueryOptions } from "@/hooks/useBookingPoll";

export function useBookings(options?: { poll?: boolean }) {
  const pollOptions = useBookingPollQueryOptions("list", undefined, options?.poll === true);
  return useQuery({
    queryKey: ["bookings"],
    queryFn: ({ signal }) =>
      runWithPollTimeout((pollSignal) => getBookingsApi({ signal: pollSignal }), signal),
    ...(options?.poll === true ? pollOptions : {}),
  });
}

export function useBooking(code: string) {
  const queryClient = useQueryClient();
  const pollOptions = useBookingPollQueryOptions("detail");
  const query = useQuery({
    queryKey: ["bookings", code],
    queryFn: ({ signal }) =>
      runWithPollTimeout((pollSignal) => getBookingDetailApi(code, { signal: pollSignal }), signal),
    enabled: !!code,
    ...pollOptions,
  });

  const booking = query.data;
  const relatedStamp = `${booking?.id ?? ""}:${booking?.status ?? ""}:${(booking?.assignments ?? [])
    .map((a) => `${a.id ?? ""}:${a.respondedAt ?? ""}:${a.declineReason ?? ""}`)
    .join("|")}`;
  const prevRelatedStamp = useRef(relatedStamp);

  useEffect(() => {
    if (!booking?.id) return;
    if (prevRelatedStamp.current === relatedStamp) return;
    const hadBooking = prevRelatedStamp.current.split(":")[0] !== "";
    prevRelatedStamp.current = relatedStamp;
    if (!hadBooking) return;
    void queryClient.invalidateQueries({
      queryKey: ["booking-allowed-transitions", booking.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ["booking-assignments", booking.id],
    });
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  }, [booking?.id, queryClient, relatedStamp]);

  return query;
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBookingApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useTransitionBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      toStatus,
      reason,
    }: {
      bookingId: string;
      toStatus: BookingStatus;
      reason?: string;
    }) => transitionBookingStatusApi(bookingId, toStatus, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useForceDoneBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      forceDoneBookingApi(bookingId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", variables.bookingId] });
    },
  });
}

export function useRecordBookingPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      toStatus,
      amount,
    }: {
      bookingId: string;
      toStatus: "advance" | "fully_paid";
      amount: number;
    }) => recordBookingPaymentApi(bookingId, toStatus, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: string; payload: Record<string, unknown> }) =>
      updateBookingApi(bookingId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: string;
      payload: { name?: string; phone?: string; notes?: string };
    }) => updateCustomerApi(customerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking"] });
    },
  });
}

export function useBookingDamageReports(bookingId: string) {
  return useQuery({
    queryKey: ["booking-damage-reports", bookingId],
    queryFn: () => getBookingDamageReportsApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBookingApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useConfirmBookingWithPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      booking,
      toPaymentStatus,
      amount,
      totalAmount,
      pricingDailyRate,
      pricingRentedDays,
      pricingScreenSize,
    }: {
      booking: Booking;
      toPaymentStatus: "advance" | "fully_paid";
      amount: number;
      totalAmount: number;
      pricingDailyRate: number;
      pricingRentedDays: number;
      pricingScreenSize: number;
    }) =>
      confirmBookingWithPaymentApi(booking, {
        toPaymentStatus,
        amount,
        totalAmount,
        pricingDailyRate,
        pricingRentedDays,
        pricingScreenSize,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions"] });
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: { userId: string; roleContext: string; isTeamLead?: boolean; phase?: string };
    }) => createAssignmentApi(bookingId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useBookingCustody(bookingId: string) {
  return useQuery({
    queryKey: ["checkoutCustody", bookingId],
    queryFn: () => getBookingCustodyApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useCheckoutBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      assets,
      idempotencyKey,
    }: {
      bookingId: string;
      assets: CheckoutAsset[];
      idempotencyKey?: string;
    }) => checkoutBookingApi(bookingId, { assets }, idempotencyKey),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutCustody", variables.bookingId] });
    },
  });
}

export function useCheckinBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, returns }: { bookingId: string; returns: CheckinReturn[] }) =>
      checkinBookingApi(bookingId, { returns }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["checkoutCustody", variables.bookingId] });
    },
  });
}

export function useCreateDamageReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      ...payload
    }: {
      bookingId?: string | null;
      poolId?: string;
      itemId?: string;
      reportType: "DAMAGE" | "MISSING";
      quantity?: string;
      description?: string;
    }) => createDamageReportApi(bookingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDamageReports() {
  return useQuery({ queryKey: ["damage-reports"], queryFn: getDamageReportsApi });
}

export function useResolveDamageReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: string } & Parameters<typeof resolveDamageReportApi>[1]) =>
      resolveDamageReportApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["damage-reports"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useInventory() {
  return useQuery({ queryKey: ["inventory"], queryFn: getInventoryApi });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: () => getInventoryItemApi(id),
    enabled: !!id,
  });
}

export function useInventoryCategories() {
  return useQuery({ queryKey: ["inventory-categories"], queryFn: getInventoryCategoriesApi });
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryCategoryApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });
}

export function useCreateInventoryPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryPoolApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryItemApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      updateInventoryCategoryApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });
}

export function useUpdateInventoryPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePoolPayload }) =>
      updateInventoryPoolApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateItemPayload }) =>
      updateInventoryItemApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeactivateInventoryEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: InventoryEntityKind; id: string }) =>
      deactivateInventoryEntityApi(kind, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeactivateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateInventoryCategoryApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory-categories"] }),
  });
}

export function useStaff() {
  return useQuery({ queryKey: ["staff"], queryFn: getStaffApi });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStaffApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => resetPasswordApi(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleUserActiveApi(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: getRolesApi });
}

export function useSetStaffFreelancer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFreelancer }: { id: string; isFreelancer: boolean }) =>
      setStaffFreelancerApi(id, isFreelancer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateStaffApi>[1] }) =>
      updateStaffApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => getNotificationsApi() });
}

export function usePendingTasks() {
  return useQuery({ queryKey: ["notifications", "tasks"], queryFn: getPendingTasksApi });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useNotificationAdmin() {
  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ["notification-event-types"],
    queryFn: getNotificationEventTypesApi,
  });
  const rules = useQuery({
    queryKey: ["notification-routing-rules"],
    queryFn: getNotificationRoutingRulesApi,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notification-event-types"] });
    queryClient.invalidateQueries({ queryKey: ["notification-routing-rules"] });
  };
  const createEvent = useMutation({
    mutationFn: createNotificationEventTypeApi,
    onSuccess: invalidate,
  });
  const updateEvent = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string;
      payload: Parameters<typeof updateNotificationEventTypeApi>[1];
    }) => updateNotificationEventTypeApi(key, payload),
    onSuccess: invalidate,
  });
  const createRule = useMutation({
    mutationFn: createNotificationRoutingRuleApi,
    onSuccess: invalidate,
  });
  const updateRule = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateNotificationRoutingRuleApi(id, isActive),
    onSuccess: invalidate,
  });
  const deleteRule = useMutation({
    mutationFn: deleteNotificationRoutingRuleApi,
    onSuccess: invalidate,
  });
  return { events, rules, createEvent, updateEvent, createRule, updateRule, deleteRule };
}

export function usePerformanceMetrics() {
  return useQuery({ queryKey: ["performance-metrics"], queryFn: getPerformanceMetricsApi });
}

export function useToggleMetricActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleMetricActiveApi(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance-metrics"] }),
  });
}

export function useDriverTrips(
  filters: { from?: string; to?: string; driverUserId?: string; bookingId?: string } = {},
) {
  return useQuery({
    queryKey: ["driver-trips", filters],
    queryFn: () => listDriverTripsApi(filters),
  });
}

export function useCreateDriverTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDriverTripApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver-trips"] }),
  });
}

export function useUpdateDriverTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateDriverTripApi>[1];
    }) => updateDriverTripApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver-trips"] }),
  });
}

export function useApproveDriverTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      approveDriverTripApi(id, isApproved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver-trips"] }),
  });
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: getSettingsApi });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettingsApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useRolesWithPermissions() {
  return useQuery({ queryKey: ["roles-with-permissions"], queryFn: getRolesWithPermissionsApi });
}

export function usePermissionsCatalog() {
  return useQuery({ queryKey: ["permissions-catalog"], queryFn: getPermissionsApi });
}

export function useCustomFieldDefinitions() {
  return useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomFieldDefinitionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] }),
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomFieldDefinitionApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] }),
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomFieldDefinitionDto }) =>
      updateCustomFieldDefinitionApi(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] }),
  });
}

export function useToggleRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      permissionId,
      active,
    }: {
      roleId: string;
      permissionId: string;
      active: boolean;
    }) =>
      active
        ? addRolePermissionApi(roleId, permissionId)
        : removeRolePermissionApi(roleId, permissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] }),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRoleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRoleApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useCreateMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPerformanceMetricApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["all-settings-metrics"] });
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updatePerformanceMetricApi>[1];
    }) => updatePerformanceMetricApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["all-settings-metrics"] });
    },
  });
}

export function useBookingAttachments(bookingId: string) {
  return useQuery({
    queryKey: ["booking-attachments", bookingId],
    queryFn: () => getBookingAttachmentsApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useInternalEvaluation(bookingId: string) {
  return useQuery({
    queryKey: ["booking-internal-eval", bookingId],
    queryFn: () => getInternalEvaluationApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useClientEvaluation(bookingId: string) {
  return useQuery({
    queryKey: ["booking-client-eval", bookingId],
    queryFn: () => getClientEvaluationApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useSubmitInternalEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: Parameters<typeof submitInternalEvaluationApi>[1];
    }) => submitInternalEvaluationApi(bookingId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-internal-eval", variables.bookingId] });
    },
  });
}

export function useSubmitClientEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: Parameters<typeof submitClientEvaluationApi>[1];
    }) => submitClientEvaluationApi(bookingId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-client-eval", variables.bookingId] });
    },
  });
}

export function useBomLines(bookingId: string) {
  return useQuery({
    queryKey: ["booking-bom-lines", bookingId],
    queryFn: () => getBookingBomLinesApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useCreateBomLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: Parameters<typeof createBomLineApi>[1];
    }) => createBomLineApi(bookingId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-bom-lines", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useUpdateBomLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      lineId,
      payload,
    }: {
      bookingId: string;
      lineId: string;
      payload: Parameters<typeof updateBomLineApi>[2];
    }) => updateBomLineApi(bookingId, lineId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-bom-lines", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDeleteBomLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, lineId }: { bookingId: string; lineId: string }) =>
      deleteBomLineApi(bookingId, lineId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-bom-lines", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useBookingAssignments(bookingId: string) {
  return useQuery({
    queryKey: ["booking-assignments", bookingId],
    queryFn: () => getBookingAssignmentsApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useAllowedTransitions(bookingId: string, status?: string) {
  const pollOptions = useBookingPollQueryOptions("transitions", status, !!bookingId);
  return useQuery({
    queryKey: ["booking-allowed-transitions", bookingId],
    queryFn: ({ signal }) =>
      runWithPollTimeout(
        (pollSignal) => getBookingAllowedTransitionsApi(bookingId, { signal: pollSignal }),
        signal,
      ),
    enabled: !!bookingId,
    ...pollOptions,
  });
}

export function useAcceptAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => acceptAssignmentApi(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-assignments"] });
    },
  });
}

export function useDeclineAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      declineAssignmentApi(assignmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-assignments"] });
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => deleteAssignmentApi(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-assignments"] });
    },
  });
}

export function useSetCrewTeamLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => setCrewTeamLeadApi(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-assignments"] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachmentApi(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["booking-attachments"] }),
  });
}

export function useDownloadAttachment() {
  return useMutation({ mutationFn: (attachmentId: string) => getDownloadUrlApi(attachmentId) });
}

export function useCreateHandoffSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => createHandoffSnapshotApi(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-snapshots"] });
    },
  });
}

export function useCheckoutReverse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason: string }) =>
      checkoutReverseApi(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking-allowed-transitions"] });
    },
  });
}

export function useBookingReservations(bookingId: string) {
  return useQuery({
    queryKey: ["booking-reservations", bookingId],
    queryFn: () => getBookingReservationsApi(bookingId),
    enabled: !!bookingId,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: { poolId?: string; itemId?: string; quantity?: string };
    }) => createReservationApi(bookingId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-reservations", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useReplacePoolReservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      lines,
    }: {
      bookingId: string;
      lines: Array<{ poolId: string; quantity: string }>;
    }) => replacePoolReservationsApi(bookingId, lines),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-reservations", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, id }: { bookingId: string; id: string }) =>
      deleteReservationApi(bookingId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["booking-reservations", variables.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useBookingSnapshots(bookingId: string, kind?: string) {
  return useQuery({
    queryKey: ["booking-snapshots", bookingId, kind],
    queryFn: () => getBookingSnapshotsApi(bookingId, kind ? { kind } : undefined),
    enabled: !!bookingId,
  });
}
