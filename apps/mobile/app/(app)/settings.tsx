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
  SlidersHorizontal,
  Trash2,
  UsersRound,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
} from "@/components/ui";
import {
  usePerformanceMetrics,
  useToggleMetricActive,
  useRolesWithPermissions,
  usePermissionsCatalog,
  useToggleRolePermission,
  useSettings,
  useUpdateSettings,
  useCustomFieldDefinitions,
  useCreateCustomField,
  useDeleteCustomField,
} from "@/hooks/useOperations";
import { colors, radius } from "@/theme/tokens";
import type { Permission, RoleWithPermissions, CustomFieldDefinition } from "@/types/domain";

const PANELS = [
  "Company",
  "Roles & permissions",
  "Notifications",
  "Language",
  "Security",
  "Performance Metrics",
  "Custom Fields",
] as const;

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Amharic", value: "am" },
] as const;
const CALENDARS = [
  { label: "Gregorian", value: "gregorian" },
  { label: "Ethiopian", value: "ethiopian" },
] as const;
const NUMERALS = [
  { label: "Latin (1, 2, 3)", value: "latn" },
  { label: "Ge'ez", value: "ethi" },
] as const;

export default function SettingsScreen() {
  const [active, setActive] = useState<(typeof PANELS)[number]>("Company");
  const [savingSettings, setSavingSettings] = useState(false);

  const rolesQuery = useRolesWithPermissions();
  const permsQuery = usePermissionsCatalog();
  const togglePermission = useToggleRolePermission();
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();

  const [language, setLanguage] = useState("en");
  const [calendarSystem, setCalendarSystem] = useState("gregorian");
  const [numerals, setNumerals] = useState("latn");

  useEffect(() => {
    if (!settingsQuery.data) return;
    if (settingsQuery.data.language) setLanguage(settingsQuery.data.language);
    if (settingsQuery.data.calendar) setCalendarSystem(settingsQuery.data.calendar);
    if (settingsQuery.data.numerals) setNumerals(settingsQuery.data.numerals);
  }, [settingsQuery.data]);

  const customFieldsQuery = useCustomFieldDefinitions();
  const deleteCustomField = useDeleteCustomField();

  const roles = rolesQuery.data ?? [];
  const permissions = permsQuery.data ?? [];
  const rolesLoading = rolesQuery.isLoading;
  const customFieldsLoading = customFieldsQuery.isLoading;
  const customFields = customFieldsQuery.data ?? [];

  const rolePermKeys = new Map<string, Set<string>>(
    roles.map((r) => [r.id, new Set((r.permissions || []).map((p) => p.key))]),
  );

  const groups: { domain: string; perms: Permission[] }[] = [];
  for (const p of permissions) {
    const domain = p.key.includes(".") ? p.key.slice(0, p.key.indexOf(".")) : "other";
    let group = groups.find((g) => g.domain === domain);
    if (!group) {
      group = { domain, perms: [] };
      groups.push(group);
    }
    group.perms.push(p);
  }

  const handleSaveChanges = async () => {
    setSavingSettings(true);
    try {
      await updateSettings.mutateAsync({
        language,
        currency: "ETB",
        calendar: calendarSystem,
        numerals,
      });
      Alert.alert("Success", "Settings saved successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Screen
      footer={
        <Button icon={Save} onPress={handleSaveChanges} disabled={savingSettings}>
          {savingSettings ? "Saving..." : "Save Changes"}
        </Button>
      }
    >
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

      {active === "Roles & permissions" && (
        <Section title="Role Permissions Matrix" icon={UsersRound} aside="Access control">
          {rolesLoading ? (
            <LoadingState label="Loading roles..." />
          ) : (
            <View style={{ gap: 10 }}>
              {groups.map((group) => (
                <View key={group.domain}>
                  <AppText variant="eyebrow" style={{ color: colors.accent, marginBottom: 4 }}>
                    {group.domain.charAt(0).toUpperCase() + group.domain.slice(1)}
                  </AppText>
                  {group.perms.map((perm) => {
                    const has = (r: RoleWithPermissions) =>
                      rolePermKeys.get(r.id)?.has(perm.key) ?? false;
                    return (
                      <View key={perm.id} style={styles.permissionRow}>
                        <View style={{ flex: 1 }}>
                          <AppText style={{ fontWeight: "700" }}>
                            {perm.key
                              .split(".")
                              .pop()
                              ?.replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </AppText>
                          <AppText variant="small" color={colors.text3}>
                            {perm.key}
                          </AppText>
                        </View>
                        {roles.map((role) => (
                          <Pressable
                            key={role.id}
                            onPress={() =>
                              togglePermission.mutate({
                                roleId: role.id,
                                permissionId: perm.id,
                                active: !has(role),
                              })
                            }
                            style={[
                              styles.permCell,
                              has(role)
                                ? { backgroundColor: "rgba(48,164,108,0.15)" }
                                : { backgroundColor: colors.surface2 },
                            ]}
                          >
                            {has(role) ? (
                              <Check size={14} color={colors.success} />
                            ) : (
                              <X size={14} color={colors.text3} />
                            )}
                          </Pressable>
                        ))}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </Section>
      )}

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
            <View style={styles.choiceWrap}>
              {LANGUAGES.map((opt) => (
                <ChoiceChip
                  key={opt.value}
                  label={opt.label}
                  active={language === opt.value}
                  onPress={() => setLanguage(opt.value)}
                />
              ))}
            </View>
          </Field>
          <Field label="Calendar system">
            <View style={styles.choiceWrap}>
              {CALENDARS.map((opt) => (
                <ChoiceChip
                  key={opt.value}
                  label={opt.label}
                  active={calendarSystem === opt.value}
                  onPress={() => setCalendarSystem(opt.value)}
                />
              ))}
            </View>
          </Field>
          <Field label="Numerals">
            <View style={styles.choiceWrap}>
              {NUMERALS.map((opt) => (
                <ChoiceChip
                  key={opt.value}
                  label={opt.label}
                  active={numerals === opt.value}
                  onPress={() => setNumerals(opt.value)}
                />
              ))}
            </View>
          </Field>
          <View style={styles.preview}>
            <AppText variant="eyebrow">Preview</AppText>
            <AppText>Calendar: {CALENDARS.find((c) => c.value === calendarSystem)?.label}</AppText>
            <AppText>Numerals: {NUMERALS.find((n) => n.value === numerals)?.label}</AppText>
            <AppText>Language: {LANGUAGES.find((l) => l.value === language)?.label}</AppText>
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

      {active === "Custom Fields" ? (
        <Section title="Booking Custom Fields" icon={SlidersHorizontal} aside="Dynamic inputs">
          {customFieldsLoading ? (
            <LoadingState label="Loading custom fields..." />
          ) : customFields.length === 0 ? (
            <EmptyState title="No custom fields configured" />
          ) : (
            <View style={{ gap: 10 }}>
              {customFields.map((field) => (
                <View key={field.id} style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: "800" }}>{field.name}</AppText>
                    <AppText variant="small" color={colors.text3}>
                      {field.key} · {field.type}
                    </AppText>
                    {field.options && field.options.length > 0 && (
                      <AppText variant="small" color={colors.text3}>
                        {field.options.join(", ")}
                      </AppText>
                    )}
                  </View>
                  <Button
                    variant="ghost"
                    icon={Trash2}
                    onPress={() => {
                      Alert.alert("Delete Field", `Delete "${field.name}"?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteCustomField.mutate(field.id),
                        },
                      ]);
                    }}
                  >
                    Delete
                  </Button>
                </View>
              ))}
            </View>
          )}
        </Section>
      ) : null}
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

function ChoiceChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <AppText
        variant="data"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "800" }}
      >
        {label}
      </AppText>
    </Pressable>
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
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.10)",
  },
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
  permCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
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
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
});
