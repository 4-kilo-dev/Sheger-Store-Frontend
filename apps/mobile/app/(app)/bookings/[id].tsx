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
  Paperclip,
  Printer,
  Share2,
  ShieldAlert,
  Trash2,
  Truck,
  Upload,
  User,
  Users,
  Wrench,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
import { colors } from "@/theme/tokens";
import type { Booking, BookingStatus } from "@/types/domain";
import { daysUntil, formatCurrency } from "@/utils/format";
import {
  useBooking,
  useRecordBookingPayment,
  useTransitionBookingStatus,
  useBomLines,
  useBookingAssignments,
  useInternalEvaluation,
  useClientEvaluation,
  useBookingAttachments,
  useCreateAssignment,
  useAllowedTransitions,
  useStaff,
  useCreateBomLine,
  useDeleteBomLine,
  useDeleteAttachment,
  useDownloadAttachment,
  useInventory,
  usePerformanceMetrics,
  useSubmitInternalEvaluation,
} from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { getPaymentSummary, type AllowedTransition } from "@/services/bookings-api";
import * as Linking from "expo-linking";

const TABS = [
  "Overview",
  "Schedule",
  "Team",
  "Equipment",
  "Payments",
  "Files",
  "Evaluations",
  "Activity",
] as const;

/** Display metadata for a transition's target status. Mirrors the copy web shows per action. */
const ACTION_META: Partial<Record<BookingStatus, { label: string; role: string; tone?: string }>> =
  {
    CONFIRMED: { label: "Confirm & Record Payment", role: "CCR" },
    ASSIGNED: { label: "Assign Technician", role: "CTO" },
    ACCEPTED: { label: "Accept Task", role: "Technician" },
    PREPARATION: { label: "Submit BOM & Mark Preparation", role: "Technician" },
    ONSITE: { label: "Dispatch to Site", role: "Operation Officer" },
    COMPLETED: { label: "Mark Completed", role: "TO / OO", tone: colors.success },
    DONE: { label: "Check-In Materials & Close", role: "Storekeeper", tone: colors.status.DONE },
    CANCELED: { label: "Cancel Booking", role: "Admin", tone: colors.destructive },
  };

function describeAction(transition: AllowedTransition) {
  const meta = ACTION_META[transition.toStatus];
  return {
    label: meta?.label ?? `Advance to ${transition.toStatus}`,
    role: meta?.role ?? "",
    tone: meta?.tone,
    nextStatus: transition.toStatus,
    permissionKey: transition.permissionKey,
    reasonRequired: transition.reasonRequired,
  };
}

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading, isError, refetch } = useBooking(params.id);
  const b = booking!;
  const { data: bomLines = [], isLoading: bomLoading } = useBomLines(b.id);
  const { data: assignments = [], isLoading: assignmentsLoading } = useBookingAssignments(b.id);
  const { data: internalEval } = useInternalEvaluation(b.id);
  const { data: clientEval } = useClientEvaluation(b.id);
  const { data: attachments = [], isLoading: attachmentsLoading } = useBookingAttachments(b.id);
  const { data: transitionsData } = useAllowedTransitions(b.id);
  const { data: staff = [] } = useStaff();
  const { canAny } = usePermissions();
  const createAssignment = useCreateAssignment();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeRole, setAssigneeRole] = useState("CREW");
  const transitionMutation = useTransitionBookingStatus();
  const paymentMutation = useRecordBookingPayment();

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading booking..." />
      </Screen>
    );
  }

  if (isError || !booking) {
    return (
      <Screen>
        <ErrorState
          title={isError ? "Could not load booking" : "Booking not found"}
          detail={
            isError
              ? "Check your connection and try again."
              : "Return to bookings and choose another booking."
          }
          onRetry={isError ? () => refetch() : undefined}
        />
      </Screen>
    );
  }

  // Permission-gated, backend-driven transitions — mirrors web's useBookingCapabilities,
  // which never lets the client invent a transition the backend didn't offer.
  const permittedTransitions = (transitionsData?.transitions || []).filter((t) =>
    canAny([t.permissionKey]),
  );
  const primaryTransition = permittedTransitions[0];
  const action = primaryTransition ? describeAction(primaryTransition) : null;
  const isSubmittingAction = transitionMutation.isPending || paymentMutation.isPending;

  const handleConfirmAction = async () => {
    if (!action) return;
    setActionError(null);
    try {
      if (booking.status === "RESERVED" && action.nextStatus === "CONFIRMED") {
        await paymentMutation.mutateAsync({
          bookingId: booking.id,
          toStatus: "advance",
          amount: booking.amount,
        });
      }
      await transitionMutation.mutateAsync({
        bookingId: booking.id,
        toStatus: action.nextStatus as BookingStatus,
      });
      setActionOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update booking.");
    }
  };

  const handleAssignMember = async () => {
    if (!assigneeId) return;
    try {
      await createAssignment.mutateAsync({
        bookingId: booking.id,
        payload: {
          userId: assigneeId,
          roleContext: assigneeRole,
          isTeamLead: assigneeRole === "CTO",
        },
      });
      setAssigneeId("");
      setActionOpen(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to assign member.");
    }
  };

  return (
    <Screen
      footer={
        action ? (
          <Button icon={CheckCircle2} onPress={() => setActionOpen(true)}>
            {action.label}
          </Button>
        ) : null
      }
    >
      <View style={styles.actionRow}>
        <BackLink label="Back to Bookings" href="/bookings" />
        <View style={styles.inlineActions}>
          <Button variant="outline" icon={Printer}>
            Print
          </Button>
          <Button variant="outline" icon={Share2}>
            Share
          </Button>
        </View>
      </View>

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

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Overview" ? <OverviewTab booking={booking} /> : null}
      {tab === "Schedule" ? <ScheduleTab booking={booking} /> : null}
      {tab === "Team" ? (
        <TeamTab
          booking={booking}
          assignments={assignments}
          onAssignPress={() => setActionOpen(true)}
        />
      ) : null}
      {tab === "Equipment" ? <EquipmentTab booking={booking} bomLines={bomLines} /> : null}
      {tab === "Payments" ? <PaymentsTab booking={booking} /> : null}
      {tab === "Files" ? <FilesTab attachments={attachments} /> : null}
      {tab === "Evaluations" ? (
        <EvaluationsTab booking={booking} internalEval={internalEval} clientEval={clientEval} />
      ) : null}
      {tab === "Activity" ? <ActivityTab statusHistory={booking.statusHistory} /> : null}

      <BottomSheet
        visible={actionOpen}
        title={action?.label ?? "Booking action"}
        onClose={() => setActionOpen(false)}
      >
        {action ? (
          <>
            <AppText variant="subtitle">
              This will advance the booking from {booking.status} to {action.nextStatus}.
              Responsible role: {action.role}.
            </AppText>
            {booking.status === "RESERVED" ? (
              <>
                <Field label="Payment Method">
                  <Input defaultValue="Bank Transfer" />
                </Field>
                <Field label="Amount Received">
                  <Input defaultValue={String(booking.amount)} keyboardType="numeric" />
                </Field>
              </>
            ) : null}
            {booking.status === "CONFIRMED" ? (
              <>
                <Field label="Assign Chief Technician">
                  <Input defaultValue="Bereket Alemu" />
                </Field>
                <Field label="Assign Technician">
                  <Input defaultValue="Yeabtsega" />
                </Field>
              </>
            ) : null}
            {booking.status === "PREPARATION" ? (
              <>
                <Field label="Team Leader">
                  <Input defaultValue={booking.teamLeader} />
                </Field>
                <Field label="Driver">
                  <Input defaultValue={booking.driver} />
                </Field>
                <Field label="Meal Budget (ETB)">
                  <Input defaultValue={String(booking.mealBudget)} keyboardType="numeric" />
                </Field>
              </>
            ) : null}
            {booking.status === "ASSIGNED" || booking.status === "ACCEPTED" ? (
              <>
                <Field label="Assign Member">
                  <View style={styles.choiceWrap}>
                    {staff.map((member) => (
                      <Choice
                        key={member.id}
                        label={member.name}
                        active={assigneeId === member.id}
                        onPress={() => setAssigneeId(member.id)}
                      />
                    ))}
                  </View>
                </Field>
                <Field label="Role">
                  <View style={styles.choiceWrap}>
                    {["CREW", "CTO", "OO", "TECHNICIAN", "STOREKEEPER"].map((role) => (
                      <Choice
                        key={role}
                        label={role}
                        active={assigneeRole === role}
                        onPress={() => setAssigneeRole(role)}
                      />
                    ))}
                  </View>
                </Field>
                <Button onPress={handleAssignMember} disabled={createAssignment.isPending}>
                  {createAssignment.isPending ? "Assigning..." : "Assign Member"}
                </Button>
              </>
            ) : null}
            {actionError ? (
              <AppText variant="small" color={colors.destructive}>
                {actionError}
              </AppText>
            ) : null}
            <Button disabled={isSubmittingAction} onPress={handleConfirmAction}>
              {isSubmittingAction ? "Submitting..." : `Confirm: ${action.label}`}
            </Button>
            <Button variant="outline" onPress={() => setActionOpen(false)}>
              Cancel
            </Button>
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

function OverviewTab({ booking }: { booking: Booking }) {
  return (
    <View style={{ gap: 14 }}>
      <Section title="Client & Contact" icon={User}>
        <KV label="Client" value={booking.client} />
        <KV label="Contact Person" value={booking.contactPerson} />
        <KV label="Phone" value={booking.contactPhone} mono />
        <KV label="Booking Code" value={booking.code} mono />
      </Section>
      <Section title="Venue & Setup" icon={MapPin}>
        <KV label="Venue" value={booking.venue} />
        <KV label="Arrangement" value={booking.arrangement} mono />
        <KV label="Screen Type" value={booking.screenType} mono />
        <KV label="Size (sqm)" value={booking.size} mono />
      </Section>
      <Section title="Logistics & Team" icon={Truck}>
        <KV label="Team Leader" value={booking.teamLeader} />
        <KV label="Stage Hand" value={booking.stageHand} />
        <KV label="Driver" value={booking.driver} />
        <KV label="Meal Budget" value={formatCurrency(booking.mealBudget)} mono />
      </Section>
      <Section title="Schedule" icon={Calendar}>
        <KV label="Assembly" value={booking.assemblyDate} mono />
        <KV label="Event" value={booking.eventDate} mono />
        <KV label="Dismantle" value={booking.dismantleDate} mono />
      </Section>
      <Section title="Financial" icon={DollarSign}>
        <KV label="Contract" value={formatCurrency(booking.amount)} mono />
        <KV label="Paid" value={formatCurrency(getPaymentSummary(booking).paid)} mono />
        <KV
          label="Balance"
          value={
            getPaymentSummary(booking).remaining != null
              ? formatCurrency(getPaymentSummary(booking).remaining as number)
              : "Unknown — awaiting full payment"
          }
          mono
        />
      </Section>
      <Section title="Quick Stats" icon={CheckCircle2}>
        <KV label="Days to Event" value={daysUntil(booking.eventDate)} mono />
        <KV label="Crew Size" value={booking.assignments.length} mono />
        <KV label="BOM Items" value={booking.bomItems.length} mono />
        <KV label="Created" value={booking.createdAt} mono />
      </Section>
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
  const events = [
    { t: "07:00", title: "Load Out from Warehouse", who: "Storekeeper · Storeroom A" },
    { t: "09:30", title: "Arrive at Venue", who: booking.venue },
    {
      t: "10:00",
      title: "Assembly Start",
      who: booking.assignees.join(" · "),
      date: booking.assemblyDate,
    },
    { t: "16:00", title: "Test Run & Calibration", who: "Chief Technician" },
    { t: "18:00", title: "Live Event", who: booking.client, date: booking.eventDate, accent: true },
    { t: "23:30", title: "Dismantle", who: booking.stageHand, date: booking.dismantleDate },
    { t: "00:30", title: "Material Return & Check-in", who: "Storekeeper" },
  ];
  return (
    <Section title="Timeline" icon={Clock}>
      {events.map((event) => (
        <View key={`${event.t}-${event.title}`} style={styles.timelineRow}>
          <AppText
            variant="data"
            color={event.accent ? colors.accent : colors.text2}
            style={{ width: 48, fontWeight: "900" }}
          >
            {event.t}
          </AppText>
          <View
            style={[styles.timelineDot, event.accent ? { borderColor: colors.accent } : null]}
          />
          <View style={styles.timelineCard}>
            <View style={styles.rowBetween}>
              <AppText style={{ fontWeight: "800" }}>{event.title}</AppText>
              {event.date ? (
                <AppText variant="data" color={colors.text3}>
                  {event.date}
                </AppText>
              ) : null}
            </View>
            <AppText variant="small" color={colors.text2}>
              {event.who}
            </AppText>
          </View>
        </View>
      ))}
    </Section>
  );
}

function TeamTab({
  booking,
  assignments,
  onAssignPress,
}: {
  booking: Booking;
  assignments: Array<{ isTeamLead?: boolean; roleContext?: string; user?: { name?: string } }>;
  onAssignPress: () => void;
}) {
  const { canAny } = usePermissions();
  const canAssign = canAny([
    PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN,
    PERMISSION.ASSIGNMENT_ASSIGN_CREW,
  ]);
  const roster = [
    {
      role: "Chief Technician",
      name: assignments.find((a) => a.isTeamLead)?.user?.name || booking.teamLeader || "Unassigned",
      status: "CONFIRMED",
    },
    {
      role: "Technician",
      name: assignments.find((a) => a.roleContext === "TECHNICIAN")?.user?.name || "Unassigned",
      status: "CONFIRMED",
    },
    {
      role: "Operation Officer",
      name: assignments.find((a) => a.roleContext === "OO")?.user?.name || "Unassigned",
      status: "CONFIRMED",
    },
    { role: "Team Leader", name: booking.teamLeader || "Unassigned", status: "CONFIRMED" },
    { role: "Stage Hand Team", name: booking.stageHand || "Unassigned", status: "CONFIRMED" },
    { role: "Driver", name: booking.driver || "Unassigned", status: "CONFIRMED" },
    ...assignments
      .filter((a) => a.roleContext === "CREW" && a.user?.name)
      .map((a) => ({ role: "Crew", name: a.user?.name ?? "", status: "CONFIRMED" })),
  ];
  return (
    <Section
      title="Assigned Team"
      icon={Users}
      action={
        canAssign ? (
          <Button variant="ghost" onPress={onAssignPress}>
            + Assign Member
          </Button>
        ) : undefined
      }
    >
      {roster.map((person) => (
        <View key={`${person.role}-${person.name}`} style={styles.personRow}>
          <View>
            <AppText style={{ fontWeight: "800" }}>{person.name}</AppText>
            <AppText variant="eyebrow">{person.role}</AppText>
          </View>
          <ToneBadge
            label={person.status}
            tone={person.status === "ACCEPTED" ? colors.status.ACCEPTED : colors.status.CONFIRMED}
          />
        </View>
      ))}
    </Section>
  );
}

function EquipmentTab({
  booking,
  bomLines,
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
}) {
  const { can } = usePermissions();
  const canEditBom = can(PERMISSION.BOM_CREATE);
  const { data: pools = [] } = useInventory();
  const createBomLine = useCreateBomLine();
  const deleteBomLine = useDeleteBomLine();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [bomError, setBomError] = useState<string | null>(null);

  const items = bomLines.map((line) => ({
    id: line.id,
    name: line.item?.name || line.pool?.name || "Equipment Line",
    qty: parseFloat(line.quantity),
    status: line.acceptedShortfall ? "Checked Out" : "Reserved",
  }));

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
            style={{ paddingLeft: 10 }}
          >
            <ShieldAlert size={16} color={colors.text3} />
          </Pressable>
          {canEditBom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove equipment line"
              onPress={() => deleteBomLine.mutate({ bookingId: booking.id, lineId: item.id })}
              style={{ paddingLeft: 10 }}
            >
              <Trash2 size={16} color={colors.destructive} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <Button variant="outline" icon={Printer}>
        Print Packing Slip
      </Button>

      <BottomSheet visible={addOpen} title="Add Equipment Line" onClose={() => setAddOpen(false)}>
        <Field label="Equipment Pool">
          <View style={styles.choiceWrap}>
            {pools.map((pool) => (
              <Choice
                key={pool.id}
                label={pool.name}
                active={selectedPoolId === (pool.poolId || pool.id)}
                onPress={() => setSelectedPoolId(pool.poolId || pool.id)}
              />
            ))}
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
      </BottomSheet>
    </Section>
  );
}

function PaymentsTab({ booking }: { booking: Booking }) {
  const { can } = usePermissions();
  const canManagePayments = can(PERMISSION.PAYMENT_MANAGE);
  const summary = getPaymentSummary(booking);
  const paymentMutation = useRecordBookingPayment();
  const [recordOpen, setRecordOpen] = useState(false);
  const [amount, setAmount] = useState(String(booking.amount));
  const [toStatus, setToStatus] = useState<"advance" | "fully_paid">("advance");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const tx =
    booking.payment === "PAID" || booking.payment === "ADVANCE"
      ? [
          {
            n: booking.payment === "PAID" ? "Full payment" : "Advance payment",
            a: summary.paid,
          },
        ]
      : [];

  const handleRecordPayment = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPaymentError("Enter a valid amount.");
      return;
    }
    setPaymentError(null);
    try {
      await paymentMutation.mutateAsync({ bookingId: booking.id, toStatus, amount: parsed });
      setRecordOpen(false);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : "Failed to record payment.");
    }
  };

  if (!canManagePayments && tx.length === 0) {
    return <EmptyState title="You don't have access to payment details for this booking." />;
  }

  return (
    <View style={{ gap: 14 }}>
      <Section
        title="Transactions"
        icon={DollarSign}
        action={
          canManagePayments ? (
            <Button variant="ghost" onPress={() => setRecordOpen(true)}>
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
        <KV label="Contract" value={formatCurrency(booking.amount)} mono />
        <KV label="Paid" value={formatCurrency(summary.paid)} mono />
        <KV
          label="Balance Due"
          value={summary.remaining != null ? formatCurrency(summary.remaining) : "Unknown"}
          mono
        />
      </Section>

      <BottomSheet visible={recordOpen} title="Record Payment" onClose={() => setRecordOpen(false)}>
        <Field label="Amount (ETB)">
          <Input value={amount} onChangeText={setAmount} keyboardType="numeric" />
        </Field>
        <Field label="Payment Status">
          <View style={styles.choiceWrap}>
            <Choice
              label="Advance"
              active={toStatus === "advance"}
              onPress={() => setToStatus("advance")}
            />
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
  attachments,
}: {
  attachments: Array<{
    id: string;
    originalName: string;
    fileSizeBytes: number;
    createdAt: string;
  }>;
}) {
  const deleteAttachment = useDeleteAttachment();
  const downloadAttachment = useDownloadAttachment();

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
      // Surfaced implicitly by the disabled row state; no dedicated error UI in this view.
    }
  };

  return (
    <Section
      title="Files & Attachments"
      icon={Paperclip}
      action={
        <Button variant="ghost" icon={Upload} disabled>
          Upload
        </Button>
      }
    >
      {files.length === 0 ? (
        <EmptyState title="No files attached yet." />
      ) : (
        files.map((file) => (
          <View key={file.id} style={styles.fileCard}>
            <FileText size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: "800" }}>{file.n}</AppText>
              <AppText variant="small" color={colors.text3}>
                {file.s} · {file.d}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Download file"
              onPress={() => handleDownload(file.id)}
            >
              <Download size={16} color={colors.text3} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete file"
              onPress={() => deleteAttachment.mutate(file.id)}
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
  internalEval,
  clientEval,
}: {
  booking: Booking;
  internalEval?: { scores: Array<{ label?: string; score: number }>; notes?: string };
  clientEval?: { respondentName: string; scores: Array<{ label?: string; score: number }> };
}) {
  const { can } = usePermissions();
  const canSubmit = can(PERMISSION.EVAL_SUBMIT_INTERNAL);
  const { data: metrics = [] } = usePerformanceMetrics();
  const internalMetrics = metrics.filter((m) => m.category === "internal" && m.isActive);
  const submitEval = useSubmitInternalEvaluation();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [evalError, setEvalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setEvalError(null);
    try {
      await submitEval.mutateAsync({
        bookingId: booking.id,
        payload: {
          scores: internalMetrics
            .map((m) => ({ metricId: m.id, score: Number(scores[m.id]) }))
            .filter((s) => Number.isFinite(s.score)),
        },
      });
      setSubmitOpen(false);
    } catch (e) {
      setEvalError(e instanceof Error ? e.message : "Failed to submit evaluation.");
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <Section
        title="Internal Crew Evaluation"
        icon={CheckCircle2}
        action={
          canSubmit ? (
            <Button variant="ghost" onPress={() => setSubmitOpen(true)}>
              {internalEval ? "Update" : "+ Submit"}
            </Button>
          ) : undefined
        }
      >
        {!internalEval ? (
          <EmptyState title="No internal evaluation submitted yet." />
        ) : (
          <>
            {internalEval.scores.map((s, index) => (
              <KV key={`${s.label}-${index}`} label={s.label || "Metric"} value={s.score} mono />
            ))}
            {internalEval.notes ? (
              <AppText variant="small" color={colors.text2}>
                {internalEval.notes}
              </AppText>
            ) : null}
          </>
        )}
      </Section>
      <Section title="Client Feedback" icon={MessageSquare}>
        {!clientEval ? (
          <EmptyState title="No client feedback received yet." />
        ) : (
          <>
            <KV label="Respondent" value={clientEval.respondentName} />
            {clientEval.scores.map((s, index) => (
              <KV key={`${s.label}-${index}`} label={s.label || "Metric"} value={s.score} mono />
            ))}
          </>
        )}
      </Section>

      <BottomSheet
        visible={submitOpen}
        title="Submit Internal Evaluation"
        onClose={() => setSubmitOpen(false)}
      >
        {internalMetrics.map((metric) => (
          <Field key={metric.id} label={metric.label}>
            <Input
              value={scores[metric.id] || ""}
              onChangeText={(v) => setScores((prev) => ({ ...prev, [metric.id]: v }))}
              keyboardType="numeric"
              placeholder="Score"
            />
          </Field>
        ))}
        {evalError ? (
          <AppText variant="small" color={colors.destructive}>
            {evalError}
          </AppText>
        ) : null}
        <Button disabled={submitEval.isPending} onPress={handleSubmit}>
          {submitEval.isPending ? "Submitting..." : "Submit Evaluation"}
        </Button>
      </BottomSheet>
    </View>
  );
}

function ActivityTab({ statusHistory }: { statusHistory: Booking["statusHistory"] }) {
  const log = [...statusHistory].sort(
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
      {log.map((item, index) => (
        <View key={item.id} style={styles.activityRow}>
          <View
            style={[styles.activityDot, index === 0 ? { backgroundColor: colors.accent } : null]}
          />
          <View style={{ flex: 1 }}>
            <AppText>
              <AppText style={{ fontWeight: "800" }}>{item.actorName}</AppText>{" "}
              <AppText color={colors.text2}>
                {item.fromStatus ? `moved from ${item.fromStatus} to` : "set status to"}
              </AppText>{" "}
              <AppText
                color={index === 0 ? colors.accent : colors.foreground}
                style={{ fontWeight: "800" }}
              >
                {item.toStatus}
              </AppText>
            </AppText>
            {item.reason ? (
              <AppText variant="small" color={colors.text3}>
                {item.reason}
              </AppText>
            ) : null}
          </View>
          <AppText variant="data" color={colors.text3}>
            {new Date(item.createdAt).toLocaleString()}
          </AppText>
        </View>
      ))}
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
    <Pressable onPress={onPress} style={[styles.choice, active ? styles.choiceActive : null]}>
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8,
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
    borderRadius: 8,
    padding: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
    borderRadius: 8,
    backgroundColor: colors.surface2,
    padding: 10,
    gap: 4,
  },
  personRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
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
    borderRadius: 8,
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
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    minWidth: "47%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  choiceActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.10)",
  },
});
