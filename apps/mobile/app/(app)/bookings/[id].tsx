import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import type { LucideIcon } from "lucide-react-native";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  PhoneCall,
  Paperclip,
  ShieldAlert,
  Star,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  Wrench,
  XCircle,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { PaymentBadge, StatusBadge, StatusStepper, ToneBadge } from "@/components/status";
import {
  AppText,
  BackLink,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  KV,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
  TextArea,
} from "@/components/ui";
import { getBookingPollCopy } from "@vortex/utils";
import { BookingActionSheet } from "@/components/booking/BookingActionSheet";
import { BomFulfillmentConflictSheet } from "@/components/booking/BomFulfillmentConflictSheet";
import { DamageReportSheet } from "@/components/booking/DamageReportSheet";
import { AccessLockOverlay } from "@/components/booking/AccessLockOverlay";
import { BookingSyncStatus } from "@/components/booking/BookingSyncStatus";
import { alpha, colors, radius } from "@/theme/tokens";
import type { Booking, BookingStatus } from "@/types/domain";
import { STATUS_LABELS } from "@/types/domain";
import { daysUntil, formatCurrency } from "@/utils/format";
import {
  useBooking,
  useRecordBookingPayment,
  useBomLines,
  useBookingAssignments,
  useInternalEvaluation,
  useClientEvaluation,
  useBookingAttachments,
  useCreateBomLine,
  useDeleteBomLine,
  useDeleteAttachment,
  useDownloadAttachment,
  useInventory,
  usePerformanceMetrics,
  useSubmitInternalEvaluation,
  useUpdateBooking,
  useUpdateCustomer,
  useCreateHandoffSnapshot,
  useCheckoutReverse,
  useBookingSnapshots,
  useBookingReservations,
  useReplacePoolReservations,
  useCustomFieldDefinitions,
  useDeleteAssignment,
} from "@/hooks/useOperations";
import { useBookingActions } from "@/hooks/useBookingActions";
import { usePermissions } from "@/hooks/use-permissions";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { getPaymentSummary, transitionBookingStatusApi } from "@/services/bookings-api";
import { getInventoryCategoriesApi, getInventoryPoolsApi } from "@/services/inventory-api";
import { filterScreenPools, isScreenPool } from "@/utils/screen-pools";
import { uploadBookingAttachmentApi } from "@/services/attachments.api";
import {
  useBookingCapabilities,
  type BookingTabName,
} from "@/hooks/useBookingCapabilities";
import { getBookingPollPhaseFromQuery } from "@/hooks/useBookingPoll";
import { createAssignTechnicianAction } from "@/utils/bookingActions";
import * as Linking from "expo-linking";

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const {
    data: booking,
    isLoading,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useBooking(params.id);
  const pollPhase = getBookingPollPhaseFromQuery({
    data: booking,
    isPending,
    isFetching,
    isError,
    error,
  });
  const bookingId = booking?.id ?? "";
  const { data: bomLines = [] } = useBomLines(bookingId);
  const safeBomLines = Array.isArray(bomLines) ? bomLines : [];
  const { data: assignments = [] } = useBookingAssignments(bookingId);
  const { data: internalEval } = useInternalEvaluation(bookingId);
  const { data: clientEval } = useClientEvaluation(bookingId);
  const { data: attachments = [] } = useBookingAttachments(bookingId);
  const createHandoff = useCreateHandoffSnapshot();
  const checkoutReverse = useCheckoutReverse();
  const [tab, setTab] = useState<BookingTabName>("Overview");
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const bookingWithAssignments = useMemo(() => {
    if (!booking) return undefined;
    if (!assignments.length) return booking;
    return {
      ...booking,
      assignments: assignments.map((a: any) => ({
        id: a.id,
        userId: a.userId || a.user?.id,
        roleContext: a.roleContext,
        isTeamLead: a.isTeamLead,
        phase: a.phase,
        respondedAt: a.respondedAt ?? null,
        declineReason: a.declineReason ?? null,
        user: a.user?.id ? { id: a.user.id, name: a.user.name || "" } : undefined,
      })),
    };
  }, [booking, assignments]);

  const caps = useBookingCapabilities(bookingWithAssignments);
  const actions = useBookingActions(params.id, bookingWithAssignments, {
    canFetchStaff: caps.canFetchStaff,
    onGoToEquipmentTab: () => setTab("Equipment"),
    canOverrideAvailability: caps.canReverseCheckout,
  });

  const { data: checkoutSnapshots = [] } = useBookingSnapshots(
    booking &&
      (booking.status === "ONSITE" ||
        booking.status === "COMPLETED" ||
        booking.status === "DONE" ||
        booking.status === "PARTIALLY_RETURNED")
      ? booking.id
      : "",
    "CHECKOUT",
  );
  const checkoutSnapshot = checkoutSnapshots[0] || null;

  const safeTab = caps.visibleTabs.includes(tab) ? tab : caps.visibleTabs[0] || "Overview";

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label={getBookingPollCopy("loading").title} />
      </Screen>
    );
  }

  if (!booking) {
    const failedPhase = pollPhase === "timeout" || pollPhase === "failure" ? pollPhase : "failure";
    const copy = isError
      ? getBookingPollCopy(failedPhase)
      : {
          title: "Booking not found",
          detail: "Return to bookings and choose another booking.",
        };
    return (
      <Screen>
        <ErrorState
          title={copy.title}
          detail={copy.detail}
          onRetry={isError ? () => refetch() : undefined}
        />
      </Screen>
    );
  }

  const barActions = caps.statusActions.filter((a) => {
    if (caps.showFieldOpsBanner && a.targetStatus === "PREPARATION") return false;
    if (caps.showFieldOpsBanner && a.permissionKey === "eval.submit_internal") return false;
    return true;
  });
  const reverseAction = barActions.find(
    (a) =>
      a.permissionKey === PERMISSION.INVENTORY_CHECKOUT_REVERSE ||
      a.id === "booking.checkout_reverse" ||
      a.id === "inventory.checkout_reverse",
  );
  const primaryAction = barActions[0] ?? caps.assignTechnicianAction ?? null;

  const isSubmittingAction =
    actions.isTransitioning ||
    actions.isConfirmingWithPayment ||
    actions.isCheckingOut ||
    actions.isAssigningTechnicians ||
    createHandoff.isPending;

  return (
    <Screen
      footer={
        primaryAction ? (
          <Button icon={CheckCircle2} onPress={() => actions.openAction(primaryAction)}>
            {primaryAction.label}
          </Button>
        ) : null
      }
    >
      <BackLink label="Back to Bookings" href="/bookings" />

      {barActions.length > 1 ? (
        <View style={styles.actionBar}>
          {barActions.slice(1).map((act) => (
            <Button
              key={`${act.id}-${act.targetStatus}`}
              variant={act.variant === "destructive" ? "danger" : act.variant === "outline" ? "outline" : "primary"}
              onPress={() => actions.openAction(act)}
            >
              {act.label}
            </Button>
          ))}
        </View>
      ) : null}

      <Card style={styles.hero}>
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <AppText variant="title" color={colors.accent}>
                {booking.code}
              </AppText>
              <StatusBadge status={booking.status} large />
              <PaymentBadge status={booking.payment} />
            </View>
            <View style={{ gap: 6, marginTop: 8 }}>
              <Meta icon={User} text={booking.client} />
              <Meta icon={MapPin} text={booking.venue} />
              <Meta icon={Calendar} text={booking.eventDate} />
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="eyebrow">Total Contract Value</AppText>
            <AppText variant="stat">{formatCurrency(booking.amount)}</AppText>
          </View>
        </View>
        {booking.ctoNotes ? (
          <View style={styles.noteBox}>
            <Wrench size={14} color={colors.accent} />
            <AppText variant="small" color={colors.text2} style={{ flex: 1 }}>
              CTO Note: {booking.ctoNotes}
            </AppText>
          </View>
        ) : null}
        <StatusStepper current={booking.status} />
      </Card>

      <BookingSyncStatus phase={pollPhase} onRetry={() => refetch()} />

      {caps.showFieldOpsBanner ? (
        <Card style={styles.techBanner}>
          <View style={styles.techBannerRow}>
            <AlertTriangle size={16} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: "800" }}>Field Operations</AppText>
              <AppText variant="small" color={colors.text2}>
                {booking.status === "ASSIGNED" && caps.pendingTechAssignment
                  ? "You have a pending crew assignment for this booking. Please accept or decline below."
                  : booking.status === "ACCEPTED"
                    ? "BOM Preparation: specify equipment in Equipment, upload schematics in Files, then submit to Operations."
                    : booking.status === "ONSITE"
                      ? "Event active. Report equipment failures or submit the post-event crew evaluation."
                      : booking.status === "COMPLETED"
                        ? "Event completed. Damage reports can still be filed if needed."
                        : "Review booking details and take the available field action."}
              </AppText>
            </View>
          </View>
          <View style={styles.techBannerActions}>
            {caps.canAcceptAssignment ? (
              <Button
                variant="success"
                icon={CheckCircle2}
                disabled={actions.accepting}
                onPress={() =>
                  Alert.alert("Accept Assignment", "Confirm you accept this job assignment.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Accept", onPress: () => actions.acceptAssignment() },
                  ])
                }
              >
                {actions.accepting ? "Accepting..." : "Accept"}
              </Button>
            ) : null}
            {caps.canDeclineAssignment ? (
              <Button
                variant="danger"
                icon={XCircle}
                onPress={() => actions.setShowDeclineModal(true)}
              >
                Decline
              </Button>
            ) : null}
            {caps.advancePreparationAction && booking.status === "ACCEPTED" ? (
              <Button
                icon={Package}
                disabled={isSubmittingAction}
                onPress={async () => {
                  try {
                    await createHandoff.mutateAsync(booking.id);
                    if (caps.advancePreparationAction?.requiresForm) {
                      actions.openAction(caps.advancePreparationAction);
                    } else {
                      actions.transitionStatus({ toStatus: "PREPARATION" });
                    }
                  } catch (error) {
                    Alert.alert(
                      "Submit BOM failed",
                      error instanceof Error ? error.message : "Failed to submit BOM",
                    );
                  }
                }}
              >
                {isSubmittingAction
                  ? "Submitting..."
                  : caps.advancePreparationAction.viaBypass
                    ? "Submit BOM to Operations"
                    : caps.advancePreparationAction.label}
              </Button>
            ) : null}
            {(booking.status === "ONSITE" || booking.status === "COMPLETED") &&
            caps.canReportDamage ? (
              <Button
                variant="danger"
                icon={ShieldAlert}
                onPress={() => actions.setShowDamageModal(true)}
              >
                Report Damaged Gear
              </Button>
            ) : null}
            {booking.status === "ONSITE" && caps.canSubmitEval ? (
              <Button icon={Star} onPress={() => setTab("Evaluations")}>
                Submit Crew Evaluation
              </Button>
            ) : null}
          </View>
        </Card>
      ) : null}

      {caps.showDeclinedAssignmentBanner && caps.assignTechnicianAction ? (
        <Card
          style={{
            ...styles.techBanner,
            borderColor: colors.destructive,
          }}
        >
          <AppText style={{ fontWeight: "800" }}>Technician declined assignment</AppText>
          <AppText variant="small" color={colors.text2}>
            {caps.declinedTechnicianAssignments.length} decline
            {caps.declinedTechnicianAssignments.length === 1 ? "" : "s"} recorded. Re-assign a
            technician to continue.
          </AppText>
          <Button
            icon={Users}
            onPress={() => actions.openAction(caps.assignTechnicianAction!)}
          >
            Re-assign Technician
          </Button>
        </Card>
      ) : null}

      {caps.canReverseCheckout && reverseAction ? (
        <Button variant="outline" onPress={() => setReverseOpen(true)}>
          Reverse Checkout
        </Button>
      ) : null}

      <SegmentedTabs
        tabs={caps.visibleTabs}
        value={safeTab}
        onChange={(next) => setTab(next as BookingTabName)}
      />
      {safeTab === "Overview" ? <OverviewTab booking={booking} caps={caps} /> : null}
      {safeTab === "Schedule" ? <ScheduleTab booking={booking} /> : null}
      {safeTab === "Team" ? (
        <TeamTab
          booking={booking}
          assignments={assignments}
          canAssignTechnician={caps.canAssignTechnician}
          onAssignPress={() =>
            actions.openAction(caps.assignTechnicianAction ?? createAssignTechnicianAction())
          }
        />
      ) : null}
      {safeTab === "Equipment" ? (
        <EquipmentTab booking={booking} bomLines={safeBomLines} canEditBom={caps.canEditBom} />
      ) : null}
      {safeTab === "Payments" ? <PaymentsTab booking={booking} /> : null}
      {safeTab === "Files" ? <FilesTab booking={booking} attachments={attachments} /> : null}
      {safeTab === "Evaluations" ? (
        <EvaluationsTab
          booking={bookingWithAssignments || booking}
          canSubmitEval={caps.canSubmitEval}
          internalEval={internalEval}
          clientEval={clientEval}
        />
      ) : null}
      {safeTab === "Activity" ? <ActivityTab statusHistory={booking.statusHistory} /> : null}

      <BookingActionSheet booking={booking} actions={actions} />
      <DamageReportSheet
        booking={booking}
        checkoutSnapshot={checkoutSnapshot}
        actions={actions}
      />
      <BomFulfillmentConflictSheet
        open={actions.showCheckoutConflictModal}
        lines={actions.checkoutConflicts}
        onClose={() => actions.setShowCheckoutConflictModal(false)}
        onGoToEquipment={() => {
          setTab("Equipment");
          actions.onGoToEquipmentTab?.();
        }}
        canOverride={actions.canOverrideAvailability}
      />

      <BottomSheet
        visible={actions.showDeclineModal}
        title="Decline Assignment"
        onClose={() => actions.setShowDeclineModal(false)}
      >
        <AppText variant="subtitle">
          Please provide a reason for declining this assignment. This will be visible to the
          assigning manager.
        </AppText>
        <Field label="Reason for declining">
          <TextArea
            value={actions.declineReason}
            onChangeText={actions.setDeclineReason}
            placeholder="e.g. Schedule conflict, equipment unavailable..."
          />
        </Field>
        {actions.declineReason.trim().length > 0 && actions.declineReason.trim().length < 10 ? (
          <AppText variant="small" color={colors.destructive}>
            Reason must be at least 10 characters.
          </AppText>
        ) : null}
        <Button
          variant="danger"
          disabled={actions.declining || actions.declineReason.trim().length < 10}
          onPress={() => actions.declineAssignment(actions.declineReason)}
        >
          {actions.declining ? "Declining..." : "Decline Assignment"}
        </Button>
        <Button variant="outline" onPress={() => actions.setShowDeclineModal(false)}>
          Cancel
        </Button>
      </BottomSheet>

      <BottomSheet
        visible={reverseOpen}
        title="Reverse Checkout"
        onClose={() => setReverseOpen(false)}
      >
        <AppText variant="subtitle">
          Reverse the warehouse checkout for this booking. A reason is required.
        </AppText>
        <Field label="Reason">
          <TextArea
            value={reverseReason}
            onChangeText={setReverseReason}
            placeholder="e.g. Wrong booking checked out, gear recalled..."
          />
        </Field>
        <Button
          variant="danger"
          disabled={checkoutReverse.isPending || reverseReason.trim().length < 5}
          onPress={async () => {
            try {
              await checkoutReverse.mutateAsync({
                bookingId: booking.id,
                reason: reverseReason.trim(),
              });
              setReverseOpen(false);
              setReverseReason("");
              Alert.alert("Checkout reversed", "The booking checkout was reversed.");
            } catch (error) {
              Alert.alert(
                "Reverse failed",
                error instanceof Error ? error.message : "Could not reverse checkout.",
              );
            }
          }}
        >
          {checkoutReverse.isPending ? "Reversing..." : "Confirm Reverse Checkout"}
        </Button>
        <Button variant="outline" onPress={() => setReverseOpen(false)}>
          Cancel
        </Button>
      </BottomSheet>
    </Screen>
  );
}

function OverviewTab({
  booking,
  caps,
}: {
  booking: Booking;
  caps: ReturnType<typeof useBookingCapabilities>;
}) {
  const { formatDate } = useDateFormatter();
  const isOnsiteSurface =
    booking.status === "ONSITE" ||
    booking.status === "COMPLETED" ||
    booking.status === "DONE" ||
    booking.status === "PARTIALLY_RETURNED";
  const { data: snapshots = [] } = useBookingSnapshots(
    isOnsiteSurface ? booking.id : "",
    "CHECKOUT",
  );
  const holdEditableStatuses = new Set([
    "RESERVED",
    "CONFIRMED",
    "ASSIGNED",
    "ACCEPTED",
    "PREPARATION",
  ]);
  const { data: reservationsData } = useBookingReservations(
    holdEditableStatuses.has(booking.status) ? booking.id : "",
  );
  const updateBooking = useUpdateBooking();
  const updateCustomer = useUpdateCustomer();
  const replacePoolReservations = useReplacePoolReservations();
  const [ctoNotes, setCtoNotes] = useState(booking.ctoNotes || "");
  const [clientName, setClientName] = useState(booking.client || "");
  const [contactPerson, setContactPerson] = useState(booking.contactPerson || "");
  const [contactPhone, setContactPhone] = useState(booking.contactPhone || "");
  const [savingClient, setSavingClient] = useState(false);
  const [allocations, setAllocations] = useState<Array<{ poolId: string; quantity: string }>>([
    { poolId: "", quantity: "" },
  ]);
  const [pools, setPools] = useState<Array<{ id: string; name: string; categoryId?: string }>>([]);
  const [poolsRestricted, setPoolsRestricted] = useState(false);
  const [savingHolds, setSavingHolds] = useState(false);
  const [isEditingHolds, setIsEditingHolds] = useState(true);
  const [vehiclePlate, setVehiclePlate] = useState(booking.vehiclePlate || "");
  const [driverName, setDriverName] = useState(booking.driver || "");
  const [teamLeader, setTeamLeader] = useState(booking.teamLeader || "");
  const customFieldsQuery = useCustomFieldDefinitions();

  useEffect(() => {
    setClientName(booking.client || "");
    setContactPerson(booking.contactPerson || "");
    setContactPhone(booking.contactPhone || "");
  }, [booking.client, booking.contactPerson, booking.contactPhone]);

  useEffect(() => {
    if (!caps.showTechnicalHolds) return;
    Promise.all([getInventoryCategoriesApi(), getInventoryPoolsApi()])
      .then(([cats, rows]) => {
        const screens = filterScreenPools(
          rows.map((p) => ({
            id: p.id,
            name: p.name,
            categoryId: p.categoryId,
          })),
          cats,
        );
        setPools(screens.map((p) => ({ id: p.id!, name: p.name || "", categoryId: p.categoryId || undefined })));
      })
      .catch((error) => {
        setPools([]);
        if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 403) {
          setPoolsRestricted(true);
        }
      });
  }, [booking.status, caps.showTechnicalHolds]);

  const checkoutSnapshot = snapshots[0] || null;
  const reservations = reservationsData?.reservations ?? [];

  useEffect(() => {
    const screenPoolIds = new Set(pools.map((p) => p.id));
    const filteredReservations = reservations.filter((r) => {
      if (r.poolId && screenPoolIds.has(r.poolId)) return true;
      if ((r as any).pool && isScreenPool((r as any).pool)) return true;
      return false;
    });
    const mapped = filteredReservations.map((r) => ({
      poolId: r.poolId || "",
      quantity: String(r.quantity ?? ""),
    }));
    if (mapped.length > 0) {
      setAllocations(mapped);
      setIsEditingHolds(false);
    } else if (booking.ctoNotes) {
      setIsEditingHolds(false);
    } else {
      setAllocations([{ poolId: "", quantity: "" }]);
      setIsEditingHolds(true);
    }
  }, [reservationsData, pools, booking.ctoNotes]);

  const saveTechnicalHolds = async () => {
    const valid = allocations.filter((a) => a.poolId && Number(a.quantity) > 0);
    if (valid.length === 0 && !ctoNotes.trim()) {
      Alert.alert(
        "Incomplete",
        "Please add at least one screen type and quantity or provide CTO notes.",
      );
      return;
    }
    setSavingHolds(true);
    try {
      if (valid.length > 0) {
        await replacePoolReservations.mutateAsync({
          bookingId: booking.id,
          lines: valid.map((a) => ({ poolId: a.poolId, quantity: a.quantity })),
        });
      }
      const spec = valid
        .map((a) => {
          const poolName = pools.find((p) => p.id === a.poolId)?.name || "LED Screen";
          return `${a.quantity}sqm of ${poolName}`;
        })
        .join("; ");
      const totalSqm = valid.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
      await updateBooking.mutateAsync({
        bookingId: booking.id,
        payload: {
          ctoConsultationNotes: ctoNotes,
          ...(spec
            ? {
                itemServiceSpec: spec,
                screenAreaSqm: totalSqm,
              }
            : {}),
        },
      });
      setIsEditingHolds(false);
      Alert.alert("Saved", "Technical allocation holds saved.");
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Could not save technical holds.",
      );
    } finally {
      setSavingHolds(false);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {caps.showTechAcceptedWorkspace ? (
        <Section title="Technician Accepted Workspace" icon={Wrench}>
          <AppText variant="subtitle">
            Review CTO notes, build the BOM in Equipment, and upload schematics in Files before
            submitting to Operations.
          </AppText>
          {booking.ctoNotes ? (
            <AppText variant="small" color={colors.text2}>
              CTO Note: {booking.ctoNotes}
            </AppText>
          ) : null}
          {booking.itemServiceSpec ? (
            <KV label="Intake Spec" value={booking.itemServiceSpec} />
          ) : null}
        </Section>
      ) : null}

      {booking.status === "ONSITE" ? (
        <>
          <Card style={{ borderColor: colors.status.ONSITE, gap: 8 }}>
            <AppText variant="eyebrow" color={colors.status.ONSITE}>
              ONSITE (Active Job)
            </AppText>
            <AppText variant="small" color={colors.text2}>
              Equipment has been checked out and dispatched. Crew is executing onsite setup.
            </AppText>
          </Card>
          <Section title="Dispatched Equipment" icon={Package}>
            {checkoutSnapshot?.lines?.length ? (
              checkoutSnapshot.lines.map((line) => (
                <KV
                  key={line.id}
                  label={line.item?.name || line.pool?.name || line.name || "Equipment"}
                  value={String(line.quantity ?? "—")}
                  mono
                />
              ))
            ) : (
              <AppText variant="subtitle">
                No checkout snapshot found. Warehouse check-out may still be pending.
              </AppText>
            )}
          </Section>
          <Section title="Onsite Logistics" icon={Truck}>
            <KV label="Driver" value={booking.driver || "No driver assigned"} />
            <KV label="Plate" value={booking.vehiclePlate || "—"} mono />
            <KV label="Lead" value={booking.teamLeader || "—"} />
            <KV label="Stage Hand" value={booking.stageHand || "—"} />
          </Section>
        </>
      ) : null}

      {caps.showTechnicalHolds ? (
        <Section
          title="Technical Hold Specifications"
          icon={Wrench}
          action={
            !isEditingHolds && caps.canWriteTechnicalHolds ? (
              <Button variant="ghost" onPress={() => setIsEditingHolds(true)}>
                Edit holds
              </Button>
            ) : undefined
          }
        >
          {poolsRestricted ? (
            <AccessLockOverlay
              sectionName="Technical Holds Allocation"
              permissionKey={PERMISSION.INVENTORY_RESERVE}
            />
          ) : null}
          {!isEditingHolds ? (
            <>
              {allocations
                .filter((a) => a.poolId)
                .map((alloc) => (
                  <KV
                    key={alloc.poolId}
                    label={pools.find((p) => p.id === alloc.poolId)?.name || "LED Screen"}
                    value={`${alloc.quantity} sqm`}
                    mono
                  />
                ))}
              {booking.ctoNotes ? <KV label="CTO Notes" value={booking.ctoNotes} /> : null}
              {!allocations.some((a) => a.poolId) && !booking.ctoNotes ? (
                <AppText variant="subtitle">
                  Awaiting technical hold allocation and notes by Chief Technical Officer.
                </AppText>
              ) : null}
            </>
          ) : caps.canWriteTechnicalHolds && !poolsRestricted ? (
            <>
              <Field label="CTO Consultation Notes">
                <TextArea value={ctoNotes} onChangeText={setCtoNotes} />
              </Field>
              {allocations.map((alloc, idx) => (
                <View key={`alloc-${idx}`} style={{ gap: 8 }}>
                  <Field label={`Screen Pool ${idx + 1}`}>
                    <View style={styles.choiceWrap}>
                      {pools.slice(0, 12).map((pool) => (
                        <Choice
                          key={pool.id}
                          label={pool.name}
                          active={alloc.poolId === pool.id}
                          onPress={() =>
                            setAllocations((prev) =>
                              prev.map((a, i) => (i === idx ? { ...a, poolId: pool.id } : a)),
                            )
                          }
                        />
                      ))}
                    </View>
                  </Field>
                  <Field label="Quantity (sqm)">
                    <Input
                      value={alloc.quantity}
                      onChangeText={(v) =>
                        setAllocations((prev) =>
                          prev.map((a, i) => (i === idx ? { ...a, quantity: v } : a)),
                        )
                      }
                      keyboardType="numeric"
                    />
                  </Field>
                  {allocations.length > 1 ? (
                    <Button
                      variant="ghost"
                      icon={Trash2}
                      onPress={() => setAllocations((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove row
                    </Button>
                  ) : null}
                </View>
              ))}
              <Button
                variant="outline"
                onPress={() => setAllocations((prev) => [...prev, { poolId: "", quantity: "" }])}
              >
                Add another screen type
              </Button>
              <Button disabled={savingHolds} onPress={saveTechnicalHolds}>
                {savingHolds ? "Saving..." : "Save Technical Holds"}
              </Button>
            </>
          ) : null}
        </Section>
      ) : null}

      {booking.status === "PREPARATION" && (caps.canAssignCrew || caps.canEditLogistics || caps.canEditBooking) ? (
        <Section title="Dispatch Logistics" icon={Truck}>
          {caps.canEditLogistics ? (
            <>
              <Field label="Team Leader">
                <Input value={teamLeader} onChangeText={setTeamLeader} />
              </Field>
              <Field label="Driver">
                <Input value={driverName} onChangeText={setDriverName} />
              </Field>
              <Field label="Vehicle Plate">
                <Input value={vehiclePlate} onChangeText={setVehiclePlate} />
              </Field>
              <Button
                disabled={updateBooking.isPending}
                onPress={async () => {
                  try {
                    await updateBooking.mutateAsync({
                      bookingId: booking.id,
                      payload: {
                        teamLeader,
                        driver: driverName,
                        vehiclePlate,
                      },
                    });
                    Alert.alert("Saved", "Dispatch logistics updated.");
                  } catch (error) {
                    Alert.alert(
                      "Save failed",
                      error instanceof Error ? error.message : "Could not update logistics.",
                    );
                  }
                }}
              >
                {updateBooking.isPending ? "Saving..." : "Save Logistics"}
              </Button>
            </>
          ) : (
            <>
              <KV label="Team Leader" value={booking.teamLeader || "—"} />
              <KV label="Driver" value={booking.driver || "—"} />
              <KV label="Plate" value={booking.vehiclePlate || "—"} mono />
            </>
          )}
        </Section>
      ) : null}

      <Section title="Client & Contact" icon={User}>
        {caps.canManageCustomer && booking.customerId ? (
          <>
            <Field label="Client">
              <Input value={clientName} onChangeText={setClientName} placeholder="Client name" />
            </Field>
            <Field label="Contact Person">
              <Input
                value={contactPerson}
                onChangeText={setContactPerson}
                placeholder="Contact person"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="Phone"
                keyboardType="phone-pad"
              />
            </Field>
            {contactPhone.trim() ? (
              <Button
                icon={PhoneCall}
                onPress={async () => {
                  const phone = contactPhone.trim().replace(/\s+/g, "");
                  const url = `tel:${phone}`;
                  try {
                    await Linking.openURL(url);
                  } catch {
                    Alert.alert("Call failed", "Could not open your phone dialer.");
                  }
                }}
              >
                Call Client Now
              </Button>
            ) : null}
            <KV label="Booking Code" value={booking.code} mono />
            <Button
              onPress={async () => {
                if (!clientName.trim() || !contactPhone.trim()) {
                  Alert.alert("Incomplete", "Client name and phone are required.");
                  return;
                }
                setSavingClient(true);
                try {
                  await updateCustomer.mutateAsync({
                    customerId: booking.customerId!,
                    payload: {
                      name: clientName.trim(),
                      phone: contactPhone.trim(),
                      notes: contactPerson.trim() || clientName.trim(),
                    },
                  });
                  Alert.alert("Saved", "Client & contact saved.");
                } catch (error) {
                  Alert.alert(
                    "Save failed",
                    error instanceof Error ? error.message : "Could not save client details.",
                  );
                } finally {
                  setSavingClient(false);
                }
              }}
            >
              {savingClient ? "Saving..." : "Save Client Info"}
            </Button>
          </>
        ) : (
          <>
            <KV label="Client" value={booking.client} />
            <KV label="Contact Person" value={booking.contactPerson} />
            <KV label="Phone" value={booking.contactPhone} phone />
            <KV label="Booking Code" value={booking.code} mono />
          </>
        )}
      </Section>
      <Section title="Venue & Setup" icon={MapPin}>
        <KV label="Venue" value={booking.venue} />
        <KV label="Arrangement" value={booking.arrangement} mono />
        <KV label="Screen Type" value={booking.screenType} mono />
        <KV label="Size (sqm)" value={booking.size} mono />
        {booking.itemServiceSpec ? (
          <KV label="Intake Specification" value={booking.itemServiceSpec} />
        ) : null}
      </Section>
      {caps.showOpsSidebar ? (
        <Section title="Logistics & Team" icon={Truck}>
          <KV label="Team Leader" value={booking.teamLeader} />
          <KV label="Stage Hand" value={booking.stageHand} />
          <KV label="Driver" value={booking.driver} />
          <KV label="Meal Budget" value={formatCurrency(booking.mealBudget)} mono />
        </Section>
      ) : null}
      <Section title="Schedule" icon={Calendar}>
        <KV label="Assembly" value={formatDate(booking.assemblyDate)} mono />
        <KV label="Event" value={formatDate(booking.eventDate)} mono />
        <KV label="Dismantle" value={formatDate(booking.dismantleDate)} mono />
        {booking.rentedDays != null && booking.rentedDays > 0 ? (
          <KV label="Number of Days" value={String(booking.rentedDays)} mono />
        ) : null}
      </Section>
      {caps.showFinancials ? (
        <Section title="Financial" icon={DollarSign}>
          {booking.dailyRate != null && booking.dailyRate > 0 ? (
            <KV label="Daily Rate" value={formatCurrency(booking.dailyRate)} mono />
          ) : null}
          <KV label="Total" value={formatCurrency(booking.paymentAmount ?? booking.amount)} mono />
          <KV label="Paid" value={formatCurrency(getPaymentSummary(booking).paid)} mono />
          <KV
            label="Balance"
            value={
              getPaymentSummary(booking).remaining != null
                ? formatCurrency(getPaymentSummary(booking).remaining as number)
                : "Unknown — awaiting pricing"
            }
            mono
          />
        </Section>
      ) : null}
      <Section title="Quick Stats" icon={CheckCircle2}>
        <KV label="Days to Event" value={daysUntil(booking.eventDate)} mono />
        <KV label="Crew Size" value={booking.assignments.length} mono />
        <KV label="BOM Items" value={booking.bomItems.length} mono />
        <KV label="Created" value={formatDate(booking.createdAt)} mono />
      </Section>
      {(customFieldsQuery.data || []).length > 0 ? (
        <Section title="Booking Specifications" icon={MessageSquare}>
          {(customFieldsQuery.data || []).map((field) => {
            const rawVal = booking.customFields?.[field.key];
            let displayVal = rawVal;
            if (field.type === "multi_select") {
              const selectedValues = Array.isArray(rawVal)
                ? rawVal
                : typeof rawVal === "string" && rawVal
                ? rawVal.split(",").map((s) => s.trim()).filter(Boolean)
                : [];
              displayVal = selectedValues.length > 0 ? selectedValues.join(", ") : "—";
            } else if (field.type === "boolean") {
              displayVal = rawVal === true || rawVal === "true" ? "Yes" : rawVal === false || rawVal === "false" ? "No" : "—";
            }
            return (
              <KV
                key={field.id}
                label={field.name}
                value={String(displayVal ?? "—")}
              />
            );
          })}
        </Section>
      ) : null}
      <Section title="Notes & Special Requirements" icon={MessageSquare}>
        <AppText variant="subtitle">
          {booking.ctoNotes ||
            "No special requirements noted. Coordinate with venue AV for power distribution."}
        </AppText>
      </Section>
    </View>
  );
}

function ScheduleTab({ booking }: { booking: Booking }) {
  const { formatDateTime } = useDateFormatter();

  const assemblyWhen = booking.assemblyDate || booking.rentalStart;
  const eventWhen = booking.eventDate;
  const dismantleWhen = booking.dismantleDate || booking.rentalEnd;

  const items = [
    {
      key: "assembly",
      title: "Assembly Start",
      when: assemblyWhen,
      detail: booking.venue || undefined,
      accent: false,
    },
    {
      key: "event",
      title: "Event Start",
      when: eventWhen,
      detail: [booking.client, booking.venue].filter(Boolean).join(" · ") || undefined,
      accent: true,
    },
    {
      key: "dismantle",
      title: "Dismantle Start",
      when: dismantleWhen,
      detail: booking.venue || undefined,
      accent: false,
    },
  ].filter((item) => {
    if (!item.when) return false;
    const d = new Date(item.when);
    return !Number.isNaN(d.getTime());
  });

  return (
    <Section title="Timeline" icon={Clock}>
      {items.length === 0 ? (
        <AppText variant="subtitle">No schedule dates recorded for this booking yet.</AppText>
      ) : (
        items.map((event) => {
          const when = new Date(event.when!);
          const timeLabel = when.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          return (
            <View key={event.key} style={styles.timelineRow}>
              <AppText
                variant="data"
                color={event.accent ? colors.accent : colors.text2}
                style={{ width: 48, fontWeight: "900" }}
              >
                {timeLabel}
              </AppText>
              <View
                style={[styles.timelineDot, event.accent ? { borderColor: colors.accent } : null]}
              />
              <View style={styles.timelineCard}>
                <View style={styles.rowBetween}>
                  <AppText style={{ fontWeight: "800" }}>{event.title}</AppText>
                  <AppText variant="data" color={colors.text3}>
                    {formatDateTime(event.when)}
                  </AppText>
                </View>
                {event.detail ? (
                  <AppText variant="small" color={colors.text2}>
                    {event.detail}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </Section>
  );
}

function TeamTab({
  booking,
  assignments,
  canAssignTechnician,
  onAssignPress,
}: {
  booking: Booking;
  assignments: Array<{
    id: string;
    isTeamLead?: boolean;
    roleContext?: string;
    userId?: string;
    respondedAt?: string | null;
    declineReason?: string | null;
    status?: string;
    user?: { id?: string; name?: string };
  }>;
  canAssignTechnician: boolean;
  onAssignPress: () => void;
}) {
  const { canAny } = usePermissions();
  const deleteAssignment = useDeleteAssignment();
  const canAssign = canAny([
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
  ]);

  type MemberStatus = "UNASSIGNED" | "PENDING" | "ASSIGNED" | "ACCEPTED" | "DECLINED";

  function getAssignmentStatus(a: (typeof assignments)[number]): MemberStatus {
    if (a.status === "DECLINED" || a.declineReason) return "DECLINED";
    if (a.respondedAt == null) return "PENDING";
    return "ACCEPTED";
  }

  const STATUS_TONE: Record<MemberStatus, string> = {
    UNASSIGNED: colors.text3,
    PENDING: colors.status.ASSIGNED,
    ASSIGNED: colors.status.CONFIRMED,
    ACCEPTED: colors.status.ACCEPTED,
    DECLINED: colors.destructive,
  };

  function isEmptyName(v?: string | null) {
    return !v || v.trim() === "" || v === "None Assigned" || v === "Unassigned";
  }

  // Build roster from live assignments, mirroring web TeamTab buildTeamRoster
  const activeTech = assignments.filter(
    (a) => (a.roleContext === "TECHNICIAN") && !a.declineReason && a.status !== "DECLINED",
  );
  const declinedTech = assignments.filter(
    (a) => (a.roleContext === "TECHNICIAN") && (a.declineReason || a.status === "DECLINED"),
  );
  const chief = activeTech.find((a) => a.isTeamLead);
  const technicians = activeTech.filter((a) => !a.isTeamLead);
  const oo = assignments.find(
    (a) => a.roleContext === "OO" && !a.declineReason && a.status !== "DECLINED",
  );
  const crew = assignments.filter(
    (a) => a.roleContext === "CREW" && !a.declineReason && a.status !== "DECLINED",
  );

  type RosterRow = { role: string; name: string; statusKey: MemberStatus; assignmentId?: string };

  const roster: RosterRow[] = [
    {
      role: "Chief Technician",
      name: chief?.user?.name || (isEmptyName(booking.teamLeader) ? "Unassigned" : booking.teamLeader),
      statusKey: chief ? getAssignmentStatus(chief) : "UNASSIGNED",
      assignmentId: chief?.id,
    },
    {
      role: "Technician",
      name:
        technicians.map((a) => a.user?.name).filter(Boolean).join(", ") || "Unassigned",
      statusKey:
        technicians.length === 0
          ? "UNASSIGNED"
          : technicians.some((a) => a.respondedAt == null && !a.declineReason)
            ? "PENDING"
            : technicians.every((a) => a.declineReason || a.status === "DECLINED")
              ? "DECLINED"
              : "ACCEPTED",
    },
    ...declinedTech.map((a) => ({
      role: a.isTeamLead ? "Chief Technician (Declined)" : "Technician (Declined)",
      name: a.user?.name ?? "Unknown",
      statusKey: "DECLINED" as MemberStatus,
    })),
    {
      role: "Operation Officer",
      name: oo?.user?.name || "Unassigned",
      statusKey: oo ? getAssignmentStatus(oo) : "UNASSIGNED",
      assignmentId: oo?.id,
    },
    {
      role: "Team Leader",
      name: isEmptyName(booking.teamLeader) ? "Unassigned" : booking.teamLeader,
      statusKey: isEmptyName(booking.teamLeader) ? "UNASSIGNED" : "ASSIGNED",
    },
    {
      role: "Stage Hand Team",
      name:
        crew.length > 0
          ? crew.map((a) => a.user?.name).filter(Boolean).join(", ")
          : isEmptyName(booking.stageHand)
            ? "Unassigned"
            : booking.stageHand.replace(/^TEAM · /, ""),
      statusKey: crew.length > 0 ? "ASSIGNED" : "UNASSIGNED",
    },
    {
      role: "Driver",
      name: isEmptyName(booking.driver) ? "Unassigned" : booking.driver,
      statusKey: isEmptyName(booking.driver) ? "UNASSIGNED" : "ASSIGNED",
    },
  ];

  function initialsFor(name: string) {
    if (isEmptyName(name)) return "—";
    return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  }

  const handleUnassign = (assignmentId: string, name: string) => {
    Alert.alert("Remove assignment?", `Unassign ${name} from this booking?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteAssignment.mutate(assignmentId, {
            onError: (e) =>
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to remove assignment."),
          });
        },
      },
    ]);
  };

  return (
    <Section
      title="Assigned Team"
      icon={Users}
      action={
        canAssign ? (
          <Button variant="ghost" onPress={onAssignPress}>
            + Assign
          </Button>
        ) : undefined
      }
    >
      {roster.map((person) => {
        const tone = STATUS_TONE[person.statusKey];
        const unassigned = person.statusKey === "UNASSIGNED";
        const canRemove =
          canAssignTechnician &&
          !!person.assignmentId &&
          person.statusKey !== "UNASSIGNED" &&
          person.statusKey !== "DECLINED";
        return (
          <View key={`${person.role}-${person.name}`} style={styles.personRow}>
            <View style={styles.personAvatar}>
              <AppText
                variant="small"
                color={unassigned ? colors.text3 : colors.accent}
                style={{ fontWeight: "900" }}
              >
                {initialsFor(person.name)}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{ fontWeight: "800" }}
                color={unassigned ? colors.text3 : colors.foreground}
              >
                {person.name}
              </AppText>
              <AppText variant="eyebrow">{person.role}</AppText>
            </View>
            <ToneBadge label={person.statusKey} tone={tone} />
            {canRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${person.name}`}
                onPress={() => handleUnassign(person.assignmentId!, person.name)}
                style={styles.rowIconButton}
              >
                <Trash2 size={16} color={colors.destructive} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {canAssignTechnician && activeTech.length > 1 ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <AppText variant="eyebrow">Technician assignments</AppText>
          {activeTech.map((a) => (
            <View key={a.id} style={styles.personRow}>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: "800" }}>{a.user?.name || "Technician"}</AppText>
                <AppText variant="small" color={colors.text3}>
                  {a.isTeamLead ? "Chief / lead" : "Technician"}
                </AppText>
              </View>
              <Button
                variant="ghost"
                disabled={deleteAssignment.isPending}
                onPress={() => handleUnassign(a.id, a.user?.name || "technician")}
              >
                Unassign
              </Button>
            </View>
          ))}
        </View>
      ) : null}
    </Section>
  );
}

function EquipmentTab({
  booking,
  bomLines,
  canEditBom: canEditBomProp,
}: {
  booking: Booking;
  bomLines: Array<{
    id: string;
    quantity: string;
    acceptedShortfall?: boolean;
    poolId?: string;
    item?: { name?: string };
    pool?: { name?: string };
  }>;
  canEditBom?: boolean;
}) {
  const { can } = usePermissions();
  const canEditBom = canEditBomProp ?? can(PERMISSION.BOM_CREATE);
  const { data: inventoryRows } = useInventory();
  const pools = Array.isArray(inventoryRows) ? inventoryRows : [];
  const createBomLine = useCreateBomLine();
  const deleteBomLine = useDeleteBomLine();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [bomError, setBomError] = useState<string | null>(null);
  const [poolQuery, setPoolQuery] = useState("");

  const lines = Array.isArray(bomLines) ? bomLines : [];

  const items = lines.map((line) => ({
    id: line.id,
    name: line.item?.name || line.pool?.name || "Equipment Line",
    qty: parseFloat(String(line.quantity ?? "0")),
    status: line.acceptedShortfall ? "Checked Out" : "Reserved",
  }));

  const filteredPools = useMemo(() => {
    const stagedPoolIds = new Set(
      lines.map((line) => line.poolId).filter((id): id is string => Boolean(id)),
    );
    const selectable = pools.filter((pool) => {
      if (pool.entityKind === "item") return false;
      const poolId = pool.poolId || pool.entityId || pool.id;
      if (!poolId || stagedPoolIds.has(poolId)) return false;
      return true;
    });
    const q = poolQuery.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter((pool) => {
      const haystack = [pool.name, pool.category, pool.sku, String(pool.total ?? "")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [pools, poolQuery, lines]);

  const handleAddLine = async () => {
    if (!selectedPoolId) return;
    setBomError(null);
    try {
      await createBomLine.mutateAsync({
        bookingId: booking.id,
        payload: { poolId: selectedPoolId, quantity },
      });
      setAddOpen(false);
      setSelectedPoolId("");
      setQuantity("1");
      setPoolQuery("");
    } catch (e) {
      setBomError(e instanceof Error ? e.message : "Failed to add equipment line.");
    }
  };

  return (
    <Section
      title="Bill of Materials"
      icon={Package}
      action={
        canEditBom ? (
          <Button variant="ghost" onPress={() => setAddOpen(true)}>
            + Add Item
          </Button>
        ) : undefined
      }
    >
      {items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
              {item.id}
            </AppText>
            <AppText>{item.name}</AppText>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <AppText variant="data" style={{ fontWeight: "900" }}>
              {item.qty}
            </AppText>
            <ToneBadge
              label={item.status}
              tone={
                item.status === "Returned"
                  ? colors.success
                  : item.status === "Checked Out"
                    ? colors.destructive
                    : colors.text2
              }
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report damage for this item"
            onPress={() =>
              router.push(
                to(
                  `/damage-report?bookingCode=${encodeURIComponent(booking.code)}&itemId=${encodeURIComponent(item.id)}`,
                ),
              )
            }
            style={styles.rowIconButton}
          >
            <ShieldAlert size={16} color={colors.text3} />
          </Pressable>
          {canEditBom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove equipment line"
              onPress={() =>
                Alert.alert(
                  "Remove equipment line?",
                  `This removes "${item.name}" from the bill of materials.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => {
                        if (typeof deleteBomLine.mutate !== "function") return;
                        deleteBomLine.mutate({ bookingId: booking.id, lineId: item.id });
                      },
                    },
                  ],
                )
              }
              style={styles.rowIconButton}
            >
              <Trash2 size={16} color={colors.destructive} />
            </Pressable>
          ) : null}
        </View>
      ))}

      <BottomSheet
        visible={addOpen}
        title="Add Equipment Line"
        onClose={() => {
          setAddOpen(false);
          setPoolQuery("");
        }}
      >
        {addOpen ? (
          <>
            <Field label="Search equipment">
              <Input
                value={poolQuery}
                onChangeText={setPoolQuery}
                placeholder="Search equipment, category, stock…"
              />
            </Field>
            <Field label="Equipment Pool">
              <View style={styles.choiceWrap}>
                {filteredPools.map((pool) => {
                  const poolId = pool.poolId || pool.entityId || pool.id;
                  return (
                    <Choice
                      key={poolId || pool.id}
                      label={`${pool.name} (${pool.category || "General"})${
                        pool.total != null ? ` — stock ${pool.total}` : ""
                      }`}
                      active={selectedPoolId === poolId}
                      onPress={() => setSelectedPoolId(poolId)}
                    />
                  );
                })}
                {filteredPools.length === 0 ? (
                  <AppText variant="small" color={colors.text3}>
                    No equipment matches.
                  </AppText>
                ) : null}
              </View>
            </Field>
            <Field label="Quantity">
              <Input value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            </Field>
            {bomError ? (
              <AppText variant="small" color={colors.destructive}>
                {bomError}
              </AppText>
            ) : null}
            <Button disabled={createBomLine.isPending} onPress={handleAddLine}>
              {createBomLine.isPending ? "Adding..." : "Add Line"}
            </Button>
          </>
        ) : null}
      </BottomSheet>
    </Section>
  );
}

function PaymentsTab({ booking }: { booking: Booking }) {
  const { can } = usePermissions();
  const canManagePayments = can(PERMISSION.PAYMENT_MANAGE);
  const summary = getPaymentSummary(booking);
  const paymentMutation = useRecordBookingPayment();
  const updateBookingMutation = useUpdateBooking();
  const [recordOpen, setRecordOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dailyRate, setDailyRate] = useState(String(booking.dailyRate ?? ""));
  const [rentedDays, setRentedDays] = useState(String(booking.rentedDays ?? ""));
  const [toStatus, setToStatus] = useState<"advance" | "fully_paid">("advance");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const screenSize = booking.size > 0 ? booking.size : 0;
  const computedTotal =
    Number(dailyRate) > 0 && Number(rentedDays) > 0
      ? screenSize > 0
        ? screenSize * Number(dailyRate) * Number(rentedDays)
        : Number(dailyRate) * Number(rentedDays)
      : null;

  const tx =
    booking.payment === "PAID"
      ? [{ n: "Full payment", a: summary.paid }]
      : booking.payment === "ADVANCE" && (booking.advanceAmount ?? 0) > 0
        ? [{ n: "Advance payment", a: booking.advanceAmount ?? 0 }]
        : [];

  const alreadyPaid = summary.paid;
  const activeTotal = computedTotal ?? summary.total ?? 0;
  const remainingAmount =
    summary.remaining != null
      ? summary.remaining
      : activeTotal > 0
        ? Math.max(0, activeTotal - alreadyPaid)
        : null;

  const parsedAmount = Number(amount);
  const isExceedingRemaining =
    remainingAmount != null && remainingAmount > 0 && parsedAmount > remainingAmount;
  const isSettlingFully =
    remainingAmount != null && remainingAmount > 0 ? parsedAmount >= remainingAmount : toStatus === "fully_paid";

  const targetToStatus: "advance" | "fully_paid" = isSettlingFully ? "fully_paid" : "advance";

  const handleRecordPayment = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPaymentError("Enter a valid amount.");
      return;
    }
    if (parsed < 1000) {
      setPaymentError("Minimum payment amount is ETB 1,000.");
      return;
    }
    if (remainingAmount != null && remainingAmount > 0 && parsed > remainingAmount) {
      setPaymentError(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}.`);
      return;
    }
    setPaymentError(null);
    try {
      const apiAmount = targetToStatus === "advance" ? alreadyPaid + parsed : parsed;
      await paymentMutation.mutateAsync({ bookingId: booking.id, toStatus: targetToStatus, amount: apiAmount });
      setRecordOpen(false);
      setAmount("");
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Failed to record payment.");
    }
  };

  const handleSavePricing = async () => {
    const rate = Number(dailyRate);
    const days = Number(rentedDays);
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(days) || days <= 0) {
      setPaymentError("Daily rate and number of days must be greater than zero.");
      return;
    }
    setPaymentError(null);
    try {
      await updateBookingMutation.mutateAsync({
        bookingId: booking.id,
        payload: { dailyRate: String(rate), rentedDays: days },
      });
      setPricingOpen(false);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Failed to update pricing.");
    }
  };

  if (!canManagePayments && tx.length === 0) {
    return <EmptyState title="You don't have access to payment details for this booking." />;
  }

  return (
    <View style={{ gap: 14 }}>
      {canManagePayments ? (
        <Section
          title="Pricing"
          icon={DollarSign}
          action={
            <Button variant="ghost" onPress={() => setPricingOpen(true)}>
              Edit
            </Button>
          }
        >
          {screenSize > 0 ? (
            <KV label="Screen Size" value={`${screenSize} sqm`} mono />
          ) : null}
          {booking.dailyRate != null && booking.dailyRate > 0 ? (
            <KV label="Daily Rate" value={formatCurrency(booking.dailyRate)} mono />
          ) : null}
          {booking.rentedDays != null && booking.rentedDays > 0 ? (
            <KV label="Number of Days" value={String(booking.rentedDays)} mono />
          ) : null}
          <KV
            label="Computed Total"
            value={computedTotal != null ? formatCurrency(computedTotal) : (summary.total != null ? formatCurrency(summary.total) : "Not set")}
            mono
          />
        </Section>
      ) : null}

      <Section
        title="Transactions"
        icon={DollarSign}
        action={
          canManagePayments && booking.payment !== "PAID" ? (
            <Button
              variant="ghost"
              onPress={() => {
                const nextStatus = booking.payment === "ADVANCE" ? "fully_paid" : "advance";
                setToStatus(nextStatus);
                setAmount(
                  booking.payment === "ADVANCE" && summary.remaining != null
                    ? String(summary.remaining)
                    : ""
                );
                setRecordOpen(true);
              }}
            >
              + Record Payment
            </Button>
          ) : undefined
        }
      >
        {tx.length === 0 ? (
          <EmptyState title="No payments recorded yet." />
        ) : (
          tx.map((item) => (
            <View key={item.n} style={styles.itemRow}>
              <AppText>{item.n}</AppText>
              <AppText variant="data" style={{ fontWeight: "900" }}>
                {formatCurrency(item.a)}
              </AppText>
            </View>
          ))
        )}
      </Section>
      <Section title="Summary" icon={DollarSign}>
        <KV label="Total" value={formatCurrency(summary.total ?? booking.amount)} mono />
        <KV label="Paid" value={formatCurrency(summary.paid)} mono />
        <KV
          label="Balance Due"
          value={summary.remaining != null ? formatCurrency(summary.remaining) : "Pending"}
          mono
        />
      </Section>

      <BottomSheet visible={pricingOpen} title="Edit Pricing" onClose={() => setPricingOpen(false)}>
        <Field label="Daily Rate (ETB)">
          <Input value={dailyRate} onChangeText={setDailyRate} keyboardType="numeric" />
        </Field>
        <Field label="Number of Days">
          <Input value={rentedDays} onChangeText={setRentedDays} keyboardType="numeric" />
        </Field>
        {computedTotal != null ? (
          <Field label="Computed Total">
            <Input editable={false} value={formatCurrency(computedTotal)} />
          </Field>
        ) : null}
        {paymentError ? (
          <AppText variant="small" color={colors.destructive}>
            {paymentError}
          </AppText>
        ) : null}
        <Button disabled={updateBookingMutation.isPending} onPress={handleSavePricing}>
          {updateBookingMutation.isPending ? "Saving..." : "Save Pricing"}
        </Button>
      </BottomSheet>

      <BottomSheet visible={recordOpen} title="Record Payment" onClose={() => setRecordOpen(false)}>
        <Field label="Amount (ETB)">
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder={
              booking.payment === "ADVANCE" && summary.remaining != null
                ? String(summary.remaining)
                : "50000"
            }
          />
        </Field>
        <Field label="Payment Status">
          <View style={styles.choiceWrap}>
            {booking.payment !== "ADVANCE" ? (
              <Choice
                label="Advance"
                active={toStatus === "advance"}
                onPress={() => setToStatus("advance")}
              />
            ) : null}
            <Choice
              label="Fully Paid"
              active={toStatus === "fully_paid"}
              onPress={() => setToStatus("fully_paid")}
            />
          </View>
        </Field>
        {paymentError ? (
          <AppText variant="small" color={colors.destructive}>
            {paymentError}
          </AppText>
        ) : null}
        <Button disabled={paymentMutation.isPending} onPress={handleRecordPayment}>
          {paymentMutation.isPending ? "Recording..." : "Record Payment"}
        </Button>
      </BottomSheet>
    </View>
  );
}

function FilesTab({
  booking,
  attachments,
}: {
  booking: Booking;
  attachments: Array<{
    id: string;
    originalName: string;
    fileSizeBytes: number;
    createdAt: string;
  }>;
}) {
  const deleteAttachment = useDeleteAttachment();
  const downloadAttachment = useDownloadAttachment();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { can } = usePermissions();

  const files = attachments.map((att) => ({
    id: att.id,
    n: att.originalName,
    s: `${(att.fileSizeBytes / 1024).toFixed(0)} KB`,
    d: att.createdAt.slice(0, 10),
  }));

  const handleDownload = async (id: string) => {
    try {
      const { downloadUrl } = await downloadAttachment.mutateAsync(id);
      await Linking.openURL(downloadUrl);
    } catch {
      Alert.alert("Error", "Could not open download URL.");
    }
  };

  const handleUpload = async () => {
    try {
      setUploadError(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError("Photo library access is needed to attach files.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploading(true);
      const ext = asset.uri.split(".").pop() || "jpg";
      const mimeType = asset.type === "video" ? `video/${ext}` : `image/${ext}`;
      await uploadBookingAttachmentApi(booking.id, {
        uri: asset.uri,
        name: asset.fileName || `attachment_${Date.now()}.${ext}`,
        type: mimeType,
      });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Section
      title="Files & Attachments"
      icon={Paperclip}
      action={
        <Button variant="ghost" icon={Upload} disabled={uploading} onPress={handleUpload}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      }
    >
      {uploadError ? (
        <AppText variant="small" color={colors.destructive}>
          {uploadError}
        </AppText>
      ) : null}
      {files.length === 0 ? (
        <EmptyState
          title="No files attached yet."
          detail="Tap Upload to attach contracts, photos, or documents to this booking."
        />
      ) : (
        files.map((file) => (
          <View key={file.id} style={styles.fileCard}>
            <FileText size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: "800" }} numberOfLines={1}>{file.n}</AppText>
              <AppText variant="small" color={colors.text3}>
                {file.s} · {file.d}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download file"
              onPress={() => handleDownload(file.id)}
              style={styles.rowIconButton}
            >
              <Download size={16} color={colors.text3} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete file"
              onPress={() =>
                Alert.alert("Delete file?", `This permanently deletes "${file.n}".`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteAttachment.mutate(file.id),
                  },
                ])
              }
              style={styles.rowIconButton}
            >
              <Trash2 size={16} color={colors.destructive} />
            </Pressable>
          </View>
        ))
      )}
    </Section>
  );
}

function EvaluationsTab({
  booking,
  canSubmitEval,
  internalEval,
  clientEval,
}: {
  booking: Booking;
  canSubmitEval: boolean;
  internalEval?: {
    evaluatorId?: string;
    createdAt?: string;
    clientNameVenue?: string;
    teamSize?: number;
    scores: Array<{ metricId?: string; label?: string; score: number; valueType?: string; description?: string }>;
    notes?: string;
  };
  clientEval?: {
    respondentName: string;
    submittedAt?: string;
    scores: Array<{ metricId?: string; label?: string; score: number; valueType?: string; description?: string }>;
  };
}) {
  const canSubmit = canSubmitEval;
  const { data: metrics = [] } = usePerformanceMetrics();
  const internalMetrics = metrics.filter((m) => m.category === "internal" && m.isActive);
  const submitEval = useSubmitInternalEvaluation();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [evalError, setEvalError] = useState<string | null>(null);

  /** Render a score value according to its metric type, mirroring web's ScoreDisplay. */
  function renderScore(score: number, valueType?: string): string {
    if (valueType === "boolean") return score >= 1 ? "✓ Yes" : "✗ No";
    if (valueType === "rating_5") return `${score} / 5`;
    if (valueType === "rating_10") return `${score} / 10`;
    if (valueType === "percentage") return `${score}%`;
    return String(score);
  }

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setEvalError(null);
    const scoreEntries = internalMetrics
      .map((m) => ({ metricId: m.id, score: Number(scores[m.id]) }))
      .filter((s) => Number.isFinite(s.score));
    if (scoreEntries.length === 0) {
      setEvalError("Enter at least one score before submitting.");
      return;
    }
    try {
      await submitEval.mutateAsync({
        bookingId: booking.id,
        payload: {
          clientNameVenue: booking.venue,
          teamSize: booking.assignments.length,
          notes: notes.trim() || undefined,
          scores: scoreEntries,
        },
      });
      // Eval does not auto-transition — separate status call when permitted (web parity)
      try {
        await transitionBookingStatusApi(booking.id, "COMPLETED");
      } catch {
        // Non-fatal: eval saved even if COMPLETED transition is blocked
      }
      setSubmitOpen(false);
      setScores({});
      setNotes("");
    } catch (e) {
      setEvalError(e instanceof Error ? e.message : "Failed to submit evaluation.");
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* Internal Crew Review */}
      <Section
        title="Internal Crew Review"
        icon={CheckCircle2}
        action={
          canSubmit && !internalEval ? (
            <Button variant="ghost" onPress={() => setSubmitOpen(true)}>
              + Submit
            </Button>
          ) : undefined
        }
      >
        {!internalEval ? (
          <EmptyState
            title="No internal review submitted yet."
            detail="Technicians and administrators can complete the operations review after the event."
          />
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.evalMeta}>
              <AppText variant="small" color={colors.text3}>
                Evaluated by: <AppText variant="small" style={{ fontWeight: "800" }}>{internalEval.evaluatorId || "Staff"}</AppText>
              </AppText>
              {internalEval.createdAt ? (
                <AppText variant="data" color={colors.text3}>
                  {new Date(internalEval.createdAt).toLocaleDateString()}
                </AppText>
              ) : null}
            </View>
            {internalEval.scores.map((s, index) => (
              <View key={s.metricId || index} style={styles.scoreRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: "700" }}>{s.label || "Metric"}</AppText>
                  {s.description ? (
                    <AppText variant="small" color={colors.text3}>{s.description}</AppText>
                  ) : null}
                </View>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {renderScore(s.score, s.valueType)}
                </AppText>
              </View>
            ))}
            {internalEval.notes ? (
              <View style={styles.evalNoteBox}>
                <AppText variant="eyebrow">Evaluator Notes</AppText>
                <AppText variant="small" color={colors.text2}>{internalEval.notes}</AppText>
              </View>
            ) : null}
          </View>
        )}
      </Section>

      {/* Client Satisfaction Review */}
      <Section title="Client Satisfaction Review" icon={Star}>
        {!clientEval ? (
          <EmptyState
            title="Awaiting client feedback."
            detail="This card updates automatically once the client completes the post-event evaluation form."
          />
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.evalMeta}>
              <AppText variant="small" color={colors.text3}>
                Respondent: <AppText variant="small" style={{ fontWeight: "800" }}>{clientEval.respondentName}</AppText>
              </AppText>
              {clientEval.submittedAt ? (
                <AppText variant="data" color={colors.text3}>
                  {new Date(clientEval.submittedAt).toLocaleDateString()}
                </AppText>
              ) : null}
            </View>
            {clientEval.scores.map((s, index) => (
              <View key={s.metricId || index} style={styles.scoreRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: "700" }}>{s.label || "Metric"}</AppText>
                  {s.description ? (
                    <AppText variant="small" color={colors.text3}>{s.description}</AppText>
                  ) : null}
                </View>
                <AppText variant="data" color={colors.status.ACCEPTED} style={{ fontWeight: "900" }}>
                  {renderScore(s.score, s.valueType)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Submit internal eval bottom sheet */}
      <BottomSheet
        visible={submitOpen}
        title="Submit Internal Crew Review"
        onClose={() => setSubmitOpen(false)}
      >
        <AppText variant="subtitle">
          Rate each criterion for the crew's performance on this booking.
        </AppText>
        {internalMetrics.map((metric) => (
          <Field key={metric.id} label={`${metric.label} (${metric.valueType.replace(/_/g, " ")})`}>
            {metric.valueType === "boolean" ? (
              <View style={styles.choiceWrap}>
                <Choice
                  label="Yes"
                  active={scores[metric.id] === "1"}
                  onPress={() => setScores((prev) => ({ ...prev, [metric.id]: "1" }))}
                />
                <Choice
                  label="No"
                  active={scores[metric.id] === "0"}
                  onPress={() => setScores((prev) => ({ ...prev, [metric.id]: "0" }))}
                />
              </View>
            ) : (
              <Input
                value={scores[metric.id] || ""}
                onChangeText={(v) => setScores((prev) => ({ ...prev, [metric.id]: v }))}
                keyboardType="numeric"
                placeholder={
                  metric.valueType === "rating_5"
                    ? "1–5"
                    : metric.valueType === "rating_10"
                      ? "1–10"
                      : metric.valueType === "percentage"
                        ? "0–100"
                        : "Score"
                }
              />
            )}
            {metric.description ? (
              <AppText variant="small" color={colors.text3}>{metric.description}</AppText>
            ) : null}
          </Field>
        ))}
        <Field label="Evaluator Notes (optional)">
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Any observations about this event's execution..."
          />
        </Field>
        {evalError ? (
          <AppText variant="small" color={colors.destructive}>{evalError}</AppText>
        ) : null}
        <Button disabled={submitEval.isPending} onPress={handleSubmit}>
          {submitEval.isPending ? "Submitting..." : "Submit Review"}
        </Button>
        <Button variant="outline" onPress={() => setSubmitOpen(false)}>Cancel</Button>
      </BottomSheet>
    </View>
  );
}

function ActivityTab({ statusHistory }: { statusHistory: Booking["statusHistory"] }) {
  const log = [...(statusHistory || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (log.length === 0) {
    return (
      <Section title="Activity Log" icon={Clock}>
        <EmptyState title="No activity recorded yet." />
      </Section>
    );
  }

  return (
    <Section title="Activity Log" icon={Clock}>
      {log.map((item, index) => {
        const toLabel = STATUS_LABELS[item.toStatus as keyof typeof STATUS_LABELS] || item.toStatus;
        const fromLabel = item.fromStatus
          ? STATUS_LABELS[item.fromStatus as keyof typeof STATUS_LABELS] || item.fromStatus
          : null;
        return (
          <View key={item.id} style={styles.activityRow}>
            <View
              style={[styles.activityDot, index === 0 ? { backgroundColor: colors.accent } : null]}
            />
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.rowBetween}>
                <AppText style={{ fontWeight: "800", flex: 1 }}>{item.actorName}</AppText>
                <AppText variant="data" color={colors.text3} style={{ fontSize: 10 }}>
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </AppText>
              </View>
              <AppText variant="small" color={colors.text2}>
                {fromLabel ? `Moved from ${fromLabel} to ` : "Set status to "}
                <AppText
                  variant="small"
                  color={index === 0 ? colors.accent : colors.foreground}
                  style={{ fontWeight: "800" }}
                >
                  {toLabel}
                </AppText>
              </AppText>
              {item.reason ? (
                <View style={styles.reasonBox}>
                  <AppText variant="small" color={colors.text3} style={{ fontStyle: "italic" }}>
                    "{item.reason}"
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </Section>
  );
}

function Meta({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View style={styles.meta}>
      <Icon size={14} color={colors.text3} />
      <AppText variant="small" color={colors.text2}>
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
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.choice, active ? styles.choiceActive : null]}
    >
      <AppText
        variant="data"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "900", textAlign: "center" }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  rowIconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    padding: 16,
    gap: 16,
  },
  heroHeader: {
    gap: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  techBanner: {
    padding: 14,
    gap: 12,
    borderColor: colors.accent,
    backgroundColor: alpha(colors.accent, 0.06),
  },
  techBannerRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  techBannerActions: {
    flexDirection: "row",
    gap: 8,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  timelineCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: 10,
    gap: 4,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  fileCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 12,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  activityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text3,
    marginTop: 6,
  },
  reasonBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    padding: 8,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    minWidth: "47%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  choiceActive: {
    borderColor: colors.accent,
    backgroundColor: alpha(colors.accent, 0.1),
  },
  evalMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 10,
    gap: 8,
  },
  evalNoteBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
