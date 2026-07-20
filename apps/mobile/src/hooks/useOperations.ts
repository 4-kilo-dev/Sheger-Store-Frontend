import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptAssignmentApi,
  createAssignmentApi,
  createBookingApi,
  createBomLineApi,
  declineAssignmentApi,
  deleteAssignmentApi,
  deleteBomLineApi,
  getBookingAllowedTransitionsApi,
  getBookingAssignmentsApi,
  getBookingBomLinesApi,
  getBookingDetailApi,
  getBookingsApi,
  recordBookingPaymentApi,
  transitionBookingStatusApi,
  updateBomLineApi,
} from "@/services/bookings-api";
import {
  checkinBookingApi,
  checkoutBookingApi,
  type CheckinReturn,
  type CheckoutAsset,
} from "@/services/checkout-api";
import { createDamageReportApi } from "@/services/damage-api";
import {
  createInventoryCategoryApi,
  createInventoryItemApi,
  createInventoryPoolApi,
  getInventoryApi,
  getInventoryCategoriesApi,
  getInventoryItemApi,
} from "@/services/inventory-api";
import {
  getNotificationsApi,
  getPendingTasksApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
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
} from "@/services/staff-api";
import {
  approveDriverTripApi,
  createDriverTripApi,
  listDriverTripsApi,
  updateDriverTripApi,
} from "@/services/driver-trips.api";
import {
  addRolePermissionApi,
  createCustomFieldDefinitionApi,
  deleteCustomFieldDefinitionApi,
  getCustomFieldDefinitionsApi,
  getPermissionsApi,
  getRolesWithPermissionsApi,
  getSettingsApi,
  removeRolePermissionApi,
  updateSettingsApi,
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
import type { BookingStatus } from "@/types/domain";

export function useBookings() {
  return useQuery({ queryKey: ["bookings"], queryFn: getBookingsApi });
}

export function useBooking(code: string) {
  return useQuery({
    queryKey: ["bookings", code],
    queryFn: () => getBookingDetailApi(code),
    enabled: !!code,
  });
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

export function useCheckoutBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, assets }: { bookingId: string; assets: CheckoutAsset[] }) =>
      checkoutBookingApi(bookingId, assets),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCheckinBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, returns }: { bookingId: string; returns: CheckinReturn[] }) =>
      checkinBookingApi(bookingId, returns),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCreateDamageReport() {
  return useMutation({ mutationFn: createDamageReportApi });
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

export function useAllowedTransitions(bookingId: string) {
  return useQuery({
    queryKey: ["booking-allowed-transitions", bookingId],
    queryFn: () => getBookingAllowedTransitionsApi(bookingId),
    enabled: !!bookingId,
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
