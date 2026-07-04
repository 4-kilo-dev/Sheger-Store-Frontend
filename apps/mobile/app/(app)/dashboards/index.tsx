import { router } from "expo-router";
import { to } from "@/utils/routes";
import {
  ArrowRight,
  ClipboardCheck,
  Headphones,
  PackageCheck,
  RadioTower,
  Wrench,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Screen, StatCard } from "@/components/ui";
import { BOOKINGS } from "@/data/mock";
import { colors, radius } from "@/theme/tokens";

const ROLES = [
  {
    key: "ccr",
    name: "Client Relations (CCR)",
    icon: Headphones,
    subtitle: "Intake & payments",
    description: "Register screen reservations, track payments, and confirm bookings with clients.",
    count: BOOKINGS.filter((b) => b.status === "RESERVED").length,
    label: "awaiting confirmation",
    tone: colors.accent,
  },
  {
    key: "cto",
    name: "Chief Technician (CTO)",
    icon: Wrench,
    subtitle: "Technical design",
    description:
      "Check setup feasibility, approve screen configurations, and assign lead technicians.",
    count: BOOKINGS.filter((b) => b.status === "CONFIRMED").length,
    label: "pending assignment",
    tone: colors.accent,
  },
  {
    key: "to",
    name: "Technician (TO)",
    icon: ClipboardCheck,
    subtitle: "Field setup & prep",
    description:
      "Accept briefs, prepare the bill of materials and cabling, then run the onsite setup.",
    count: BOOKINGS.filter((b) => b.status === "ASSIGNED").length,
    label: "new assignments",
    tone: colors.status.ACCEPTED,
  },
  {
    key: "oo",
    name: "Operations Officer (OO)",
    icon: RadioTower,
    subtitle: "Logistics & crew",
    description:
      "Dispatch transport, assign drivers and support crew, and manage onsite logistics.",
    count: BOOKINGS.filter((b) => b.status === "PREPARATION").length,
    label: "ready for dispatch",
    tone: colors.accent,
  },
  {
    key: "sk",
    name: "Storekeeper (SK)",
    icon: PackageCheck,
    subtitle: "Warehouse & inventory",
    description:
      "Track physical inventory, process equipment check-ins and check-outs, and flag damages.",
    count: BOOKINGS.filter((b) => b.status === "COMPLETED").length,
    label: "pending return",
    tone: colors.success,
  },
] as const;

export default function DashboardsIndexScreen() {
  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Dashboards</AppText>
        <AppText variant="title">Choose your workspace</AppText>
        <AppText variant="subtitle">
          Each workspace shows the queues, stats, and actions relevant to your role.
        </AppText>
      </View>
      {ROLES.map((role) => (
        <Pressable
          key={role.key}
          onPress={() => router.push(to(`/dashboards/${role.key}`))}
          style={styles.roleCard}
        >
          <View style={styles.roleTop}>
            <View style={[styles.roleIcon, { borderColor: role.tone }]}>
              <role.icon size={22} color={role.tone} />
            </View>
            {role.count > 0 ? (
              <StatCard label={role.label} value={role.count} tone={role.tone} />
            ) : (
              <AppText variant="small" color={colors.text3}>
                All clear
              </AppText>
            )}
          </View>
          <AppText style={styles.roleName}>{role.name}</AppText>
          <AppText variant="data" color={colors.text3}>
            {role.subtitle}
          </AppText>
          <AppText variant="subtitle">{role.description}</AppText>
          <View style={styles.openRow}>
            <AppText color={colors.accent} style={{ fontWeight: "900" }}>
              Open workspace
            </AppText>
            <ArrowRight size={18} color={colors.accent} />
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  roleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  roleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  roleName: {
    fontSize: 15,
    fontWeight: "900",
  },
  openRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
