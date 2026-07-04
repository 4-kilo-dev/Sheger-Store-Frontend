import { useLocalSearchParams } from "expo-router";
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
  Field,
  Input,
  KV,
  Screen,
  Section,
  SegmentedTabs,
  TextArea,
} from "@/components/ui";
import { BOOKINGS } from "@/data/mock";
import { colors } from "@/theme/tokens";
import type { Booking, BookingStatus } from "@/types/domain";
import { daysUntil, formatCurrency } from "@/utils/format";

const TABS = [
  "Overview",
  "Schedule",
  "Team",
  "Equipment",
  "Payments",
  "Files",
  "Activity",
] as const;

const STATUS_ACTIONS: Partial<
  Record<
    BookingStatus,
    { label: string; nextStatus: BookingStatus | "DONE"; role: string; tone?: string }
  >
> = {
  RESERVED: { label: "Confirm & Record Payment", nextStatus: "CONFIRMED", role: "CCR" },
  CONFIRMED: { label: "Assign Technician", nextStatus: "ASSIGNED", role: "CTO" },
  ASSIGNED: { label: "Accept Task", nextStatus: "ACCEPTED", role: "Technician" },
  ACCEPTED: {
    label: "Submit BOM & Mark Preparation",
    nextStatus: "PREPARATION",
    role: "Technician",
  },
  PREPARATION: { label: "Dispatch to Site", nextStatus: "ONSITE", role: "Operation Officer" },
  ONSITE: {
    label: "Mark Completed",
    nextStatus: "COMPLETED",
    role: "TO / OO",
    tone: colors.success,
  },
  COMPLETED: {
    label: "Check-In Materials & Close",
    nextStatus: "DONE",
    role: "Storekeeper",
    tone: colors.status.DONE,
  },
};

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const booking = BOOKINGS.find((item) => item.code === params.id);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [actionOpen, setActionOpen] = useState(false);

  if (!booking) {
    return (
      <Screen>
        <EmptyState
          title="Booking not found"
          detail="Return to bookings and choose another booking."
        />
      </Screen>
    );
  }

  const action = STATUS_ACTIONS[booking.status];

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
      {tab === "Team" ? <TeamTab booking={booking} /> : null}
      {tab === "Equipment" ? <EquipmentTab booking={booking} /> : null}
      {tab === "Payments" ? <PaymentsTab booking={booking} /> : null}
      {tab === "Files" ? <FilesTab /> : null}
      {tab === "Activity" ? <ActivityTab /> : null}

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
            <Button onPress={() => setActionOpen(false)}>Confirm: {action.label}</Button>
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
        <KV
          label="Paid"
          value={
            booking.payment === "PAID"
              ? formatCurrency(booking.amount)
              : booking.payment === "ADVANCE"
                ? formatCurrency(booking.amount / 2)
                : "ETB 0"
          }
          mono
        />
        <KV
          label="Balance"
          value={booking.payment === "PAID" ? "ETB 0" : formatCurrency(booking.amount / 2)}
          mono
        />
      </Section>
      <Section title="Quick Stats" icon={CheckCircle2}>
        <KV label="Days to Event" value={daysUntil(booking.eventDate)} mono />
        <KV label="Crew Size" value={booking.assignees.length + 4} mono />
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

function TeamTab({ booking }: { booking: Booking }) {
  const roster = [
    { role: "Chief Technician", name: booking.assignees[0], status: "ACCEPTED" },
    { role: "Technician", name: booking.assignees[1], status: "ACCEPTED" },
    { role: "Operation Officer", name: "Eyob D.", status: "ASSIGNED" },
    { role: "Team Leader", name: booking.teamLeader, status: "CONFIRMED" },
    { role: "Stage Hand Team", name: booking.stageHand, status: "CONFIRMED" },
    { role: "Driver", name: booking.driver, status: "CONFIRMED" },
    { role: "CCR", name: "Selam M.", status: "CONFIRMED" },
  ];
  return (
    <Section
      title="Assigned Team"
      icon={Users}
      action={<Button variant="ghost">+ Assign Member</Button>}
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

function EquipmentTab({ booking }: { booking: Booking }) {
  return (
    <Section
      title="Bill of Materials"
      icon={Package}
      action={<Button variant="ghost">+ Add Item</Button>}
    >
      {booking.bomItems.map((item) => (
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
        </View>
      ))}
      <Button variant="outline" icon={Printer}>
        Print Packing Slip
      </Button>
    </Section>
  );
}

function PaymentsTab({ booking }: { booking: Booking }) {
  const tx =
    booking.payment === "PAID"
      ? [{ d: "2026-05-12", n: "Full payment", a: booking.amount, m: "Bank Transfer" }]
      : booking.payment === "ADVANCE"
        ? [{ d: "2026-05-12", n: "Advance 50%", a: booking.amount / 2, m: "Bank Transfer" }]
        : [];
  const paid = tx.reduce((sum, item) => sum + item.a, 0);
  return (
    <View style={{ gap: 14 }}>
      <Section
        title="Transactions"
        icon={DollarSign}
        action={<Button variant="ghost">+ Record Payment</Button>}
      >
        {tx.length === 0 ? (
          <EmptyState title="No payments recorded yet." />
        ) : (
          tx.map((item) => (
            <View key={item.n} style={styles.itemRow}>
              <View>
                <AppText variant="data">{item.d}</AppText>
                <AppText>{item.n}</AppText>
                <AppText variant="small" color={colors.text2}>
                  {item.m}
                </AppText>
              </View>
              <AppText variant="data" style={{ fontWeight: "900" }}>
                {formatCurrency(item.a)}
              </AppText>
            </View>
          ))
        )}
      </Section>
      <Section title="Summary" icon={DollarSign}>
        <KV label="Contract" value={formatCurrency(booking.amount)} mono />
        <KV label="Paid" value={formatCurrency(paid)} mono />
        <KV label="Balance Due" value={formatCurrency(booking.amount - paid)} mono />
      </Section>
    </View>
  );
}

function FilesTab() {
  const files = [
    { n: "Contract_signed.pdf", s: "1.2 MB", d: "2026-05-10" },
    { n: "Site_survey_photos.zip", s: "18 MB", d: "2026-05-11" },
    { n: "Stage_diagram.pdf", s: "640 KB", d: "2026-05-11" },
    { n: "BOM_approved.xlsx", s: "120 KB", d: "2026-05-13" },
  ];
  return (
    <Section
      title="Files & Attachments"
      icon={Paperclip}
      action={
        <Button variant="ghost" icon={Upload}>
          Upload
        </Button>
      }
    >
      {files.map((file) => (
        <View key={file.n} style={styles.fileCard}>
          <FileText size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontWeight: "800" }}>{file.n}</AppText>
            <AppText variant="small" color={colors.text3}>
              {file.s} · {file.d}
            </AppText>
          </View>
          <Download size={16} color={colors.text3} />
        </View>
      ))}
    </Section>
  );
}

function ActivityTab() {
  const log = [
    { t: "2 hours ago", who: "Nathan B.", a: "advanced status to", what: "ONSITE", accent: true },
    { t: "3 hours ago", who: "Samuel T.", a: "dispatched team with", what: "Truck MED-04" },
    {
      t: "5 hours ago",
      who: "Selam W.",
      a: "checked out materials:",
      what: "48 panels, 5 PSUs, 1 processor",
    },
    { t: "Yesterday", who: "Bereket A.", a: "approved BOM with", what: "6 items, 82 units" },
    { t: "Yesterday", who: "Eyob D.", a: "assigned", what: "Bereket as Chief Technician" },
    { t: "2 days ago", who: "System", a: "auto-reserved equipment from", what: "BOM" },
  ];
  return (
    <Section title="Activity Log" icon={Clock}>
      {log.map((item) => (
        <View key={`${item.t}-${item.who}`} style={styles.activityRow}>
          <View
            style={[styles.activityDot, item.accent ? { backgroundColor: colors.accent } : null]}
          />
          <View style={{ flex: 1 }}>
            <AppText>
              <AppText style={{ fontWeight: "800" }}>{item.who}</AppText>{" "}
              <AppText color={colors.text2}>{item.a}</AppText>{" "}
              <AppText
                color={item.accent ? colors.accent : colors.foreground}
                style={{ fontWeight: "800" }}
              >
                {item.what}
              </AppText>
            </AppText>
          </View>
          <AppText variant="data" color={colors.text3}>
            {item.t}
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
});
