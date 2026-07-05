import {
  BellRing,
  Building2,
  Check,
  ClipboardCheck,
  Languages,
  LockKeyhole,
  Plus,
  Save,
  Shield,
  UsersRound,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
} from "@/components/ui";
import { usePerformanceMetrics, useToggleMetricActive } from "@/hooks/useOperations";
import { colors, radius } from "@/theme/tokens";

const PANELS = [
  "Company",
  "Roles & permissions",
  "Notifications",
  "Language",
  "Security",
  "Performance Metrics",
] as const;

export default function SettingsScreen() {
  const [active, setActive] = useState<(typeof PANELS)[number]>("Company");

  return (
    <Screen footer={<Button icon={Save}>Save Changes</Button>}>
      <View>
        <AppText variant="eyebrow">Administration</AppText>
        <AppText variant="title">Settings</AppText>
        <AppText variant="subtitle">
          Company defaults, role permissions, notifications, and language preferences.
        </AppText>
      </View>
      <SegmentedTabs tabs={PANELS} value={active} onChange={setActive} />

      {active === "Company" ? (
        <>
          <Section title="Company Information" icon={Building2} aside="System defaults">
            <Field label="Company name">
              <Input defaultValue="Vortex Visual" />
            </Field>
            <Field label="Operations email">
              <Input defaultValue="operations@vortexvisual.et" />
            </Field>
            <Field label="Primary phone">
              <Input defaultValue="+251 911 000 040" />
            </Field>
            <Field label="Timezone">
              <Input defaultValue="Africa/Addis_Ababa" />
            </Field>
          </Section>
          <Section title="Business Details">
            <Field label="Tax ID / TIN">
              <Input defaultValue="0012345678" />
            </Field>
            <Field label="Business Address">
              <Input defaultValue="Bole, Addis Ababa, Ethiopia" />
            </Field>
            <Field label="Warehouse Location">
              <Input defaultValue="Bole Sub-City, Warehouse Zone" />
            </Field>
            <Field label="Default Currency">
              <Input defaultValue="ETB — Ethiopian Birr" />
            </Field>
          </Section>
        </>
      ) : null}

      {active === "Roles & permissions" ? (
        <Section title="Role Permissions Matrix" icon={UsersRound} aside="Access control">
          {[
            { perm: "Create Bookings", access: [true, true, false, false, false, false] },
            { perm: "Confirm & Record Payment", access: [true, true, false, false, false, false] },
            { perm: "Assign Technicians", access: [true, false, true, false, false, false] },
            { perm: "Accept Tasks", access: [true, false, false, true, false, false] },
            { perm: "Prepare BOM", access: [true, false, true, true, false, false] },
            { perm: "Dispatch Team", access: [true, false, false, false, true, false] },
            { perm: "Check-Out Materials", access: [true, false, false, false, true, true] },
            { perm: "Check-In Materials", access: [true, false, false, false, true, true] },
            { perm: "Report Damage", access: [true, true, true, true, true, true] },
            { perm: "View Reports", access: [true, true, true, false, true, false] },
            { perm: "Manage Staff", access: [true, false, false, false, false, false] },
            { perm: "System Settings", access: [true, false, false, false, false, false] },
          ].map((row) => (
            <View key={row.perm} style={styles.permissionRow}>
              <AppText style={{ flex: 1, fontWeight: "800" }}>{row.perm}</AppText>
              <View style={styles.permissionIcons}>
                {row.access.map((enabled, index) =>
                  enabled ? (
                    <Check key={index} size={16} color={colors.success} />
                  ) : (
                    <X key={index} size={16} color={colors.text3} />
                  ),
                )}
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {active === "Notifications" ? (
        <Section title="Notification Preferences" icon={BellRing} aside="Per-role alerts">
          <AppText variant="eyebrow">Booking Alerts</AppText>
          <Toggle label="New booking created" on />
          <Toggle label="Booking status changed" on />
          <Toggle label="Payment received" on />
          <Toggle label="Booking cancelled" />
          <AppText variant="eyebrow">Inventory Alerts</AppText>
          <Toggle label="Low stock warning" on />
          <Toggle label="Damage report submitted" on />
          <Toggle label="Service due reminder" on />
          <Toggle label="Material checked in/out" />
          <AppText variant="eyebrow">Schedule Alerts</AppText>
          <Toggle label="Assembly reminder (24h)" on />
          <Toggle label="Event day reminder" on />
          <Toggle label="Overtime assignment" />
          <Toggle label="Dismantle reminder" />
          <AppText variant="eyebrow">Delivery Method</AppText>
          <Toggle label="In-app notifications" on />
          <Toggle label="SMS notifications" />
        </Section>
      ) : null}

      {active === "Language" ? (
        <Section title="Language & Regional" icon={Languages} aside="Localization">
          <Field label="Display language">
            <Input defaultValue="English" />
          </Field>
          <Field label="Currency">
            <Input defaultValue="ETB — Ethiopian Birr" />
          </Field>
          <Field label="Date format">
            <Input defaultValue="YYYY-MM-DD" />
          </Field>
          <Field label="Timezone">
            <Input defaultValue="Africa/Addis_Ababa (EAT +03:00)" />
          </Field>
          <View style={styles.preview}>
            <AppText variant="eyebrow">Preview</AppText>
            <AppText>Date: 2026-06-14</AppText>
            <AppText>Currency: ETB 125,000</AppText>
            <AppText>Time: 11:38 EAT</AppText>
            <AppText>Language: English</AppText>
          </View>
        </Section>
      ) : null}

      {active === "Security" ? (
        <Section title="Security Settings" icon={LockKeyhole} aside="Access & authentication">
          <Field label="Session timeout (minutes)">
            <Input defaultValue="30" keyboardType="numeric" />
          </Field>
          <Field label="Max login attempts">
            <Input defaultValue="5" keyboardType="numeric" />
          </Field>
          <AppText variant="eyebrow">Authentication</AppText>
          <Toggle label="Phone OTP verification" on />
          <Toggle label="Two-factor authentication (2FA)" />
          <Toggle label="Force password reset on first login" on />
          <Toggle label="IP address whitelist" />
          <AppText variant="eyebrow">Password Policy</AppText>
          <Toggle label="Minimum 8 characters" on />
          <Toggle label="Require uppercase letter" on />
          <Toggle label="Require special character" />
          <Toggle label="Password expiry (90 days)" on />
          <View style={styles.preview}>
            <View style={styles.sessionTitle}>
              <Shield size={16} color={colors.accent} />
              <AppText style={{ fontWeight: "900" }}>Active Sessions</AppText>
            </View>
            <Session device="MacBook Pro — Chrome" ip="192.168.1.7" time="Active now" current />
            <Session device="iPhone 15 — Safari" ip="192.168.1.12" time="2 hours ago" />
          </View>
        </Section>
      ) : null}

      {active === "Performance Metrics" ? <PerformanceMetricsPanel /> : null}
    </Screen>
  );
}

function PerformanceMetricsPanel() {
  const [category, setCategory] = useState<"internal" | "client_feedback">("internal");
  const { data: metrics = [], isLoading, isError, refetch } = usePerformanceMetrics();
  const toggleMetric = useToggleMetricActive();
  const categories = ["internal", "client_feedback"] as const;
  const filtered = metrics.filter((metric) => metric.category === category);

  const toggleActive = (id: string, isActive: boolean) => {
    toggleMetric.mutate({ id, isActive: !isActive });
  };

  if (isLoading) return <LoadingState label="Loading performance metrics..." />;
  if (isError)
    return <ErrorState detail="Could not load performance metrics." onRetry={() => refetch()} />;

  return (
    <Section
      title="Performance Metrics"
      icon={ClipboardCheck}
      aside="Evaluation criteria"
      action={
        <Button variant="ghost" icon={Plus}>
          Add
        </Button>
      }
    >
      <SegmentedTabs tabs={categories} value={category} onChange={setCategory} />
      <View style={{ gap: 10 }}>
        {filtered.map((metric) => (
          <View key={metric.id} style={styles.metricRow}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: "800" }}>{metric.label}</AppText>
              <AppText variant="small" color={colors.text2}>
                {metric.description}
              </AppText>
              <AppText variant="data" color={colors.text3} style={{ marginTop: 2 }}>
                {metric.valueType.replace("_", " ")}
              </AppText>
            </View>
            <Pressable
              onPress={() => toggleActive(metric.id, metric.isActive)}
              style={[styles.toggle, metric.isActive ? styles.toggleOn : null]}
            >
              <View style={[styles.knob, metric.isActive ? styles.knobOn : null]} />
            </Pressable>
          </View>
        ))}
      </View>
    </Section>
  );
}

function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  const [enabled, setEnabled] = useState(on);
  return (
    <Pressable onPress={() => setEnabled((current) => !current)} style={styles.toggleRow}>
      <AppText style={{ fontWeight: "700", flex: 1 }}>{label}</AppText>
      <View style={[styles.toggle, enabled ? styles.toggleOn : null]}>
        <View style={[styles.knob, enabled ? styles.knobOn : null]} />
      </View>
    </Pressable>
  );
}

function Session({
  device,
  ip,
  time,
  current,
}: {
  device: string;
  ip: string;
  time: string;
  current?: boolean;
}) {
  return (
    <View style={styles.session}>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: "800" }}>{device}</AppText>
        <AppText variant="data" color={colors.text3}>
          {ip} · {time}
        </AppText>
      </View>
      {current ? (
        <AppText variant="eyebrow" color={colors.success}>
          Current
        </AppText>
      ) : (
        <Button variant="danger">Revoke</Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 12,
  },
  permissionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  permissionIcons: {
    flexDirection: "row",
    gap: 7,
  },
  toggleRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggle: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: colors.accent,
  },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
  },
  knobOn: {
    transform: [{ translateX: 16 }],
    backgroundColor: colors.accentForeground,
  },
  preview: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  sessionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  session: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
