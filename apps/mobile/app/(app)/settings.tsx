import {
  BellRing,
  Building2,
  Check,
  ClipboardCheck,
  Languages,
  LockKeyhole,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
  TextArea,
} from "@/components/ui";
import {
  usePerformanceMetrics,
  useToggleMetricActive,
  useCreateMetric,
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

  const FIELD_DEFAULTS: Record<string, string> = {
    companyName: "Vortex Visual",
    operationsEmail: "operations@vortexvisual.et",
    primaryPhone: "+251 911 000 040",
    timezone: "Africa/Addis_Ababa",
    taxId: "0012345678",
    businessAddress: "Bole, Addis Ababa, Ethiopia",
    warehouseLocation: "Bole Sub-City, Warehouse Zone",
    defaultCurrencyLabel: "ETB — Ethiopian Birr",
    sessionTimeoutMinutes: "30",
    maxLoginAttempts: "5",
    notifyOtpVerification: "true",
    notifyTwoFactorAuth: "false",
    notifyForcePasswordReset: "true",
    notifyIpWhitelist: "false",
    passwordMin8: "true",
    passwordUppercase: "true",
    passwordSpecialChar: "false",
    passwordExpiry90: "true",
    notifyNewBooking: "true",
    notifyBookingStatusChanged: "true",
    notifyPaymentReceived: "true",
    notifyBookingCancelled: "false",
    notifyLowStock: "true",
    notifyDamageReport: "true",
    notifyServiceDue: "true",
    notifyMaterialCheckInOut: "false",
    notifyAssemblyReminder: "true",
    notifyEventDayReminder: "true",
    notifyOvertimeAssignment: "false",
    notifyDismantleReminder: "false",
    notifyInApp: "true",
    notifySms: "false",
  };
  const [form, setForm] = useState<Record<string, string>>(FIELD_DEFAULTS);
  const setField = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!settingsQuery.data) return;
    if (settingsQuery.data.language) setLanguage(settingsQuery.data.language);
    if (settingsQuery.data.calendar) setCalendarSystem(settingsQuery.data.calendar);
    if (settingsQuery.data.numerals) setNumerals(settingsQuery.data.numerals);
    setForm((current) => ({ ...current, ...settingsQuery.data }));
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
        ...form,
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
              <Input value={form.companyName} onChangeText={(v) => setField("companyName", v)} />
            </Field>
            <Field label="Operations email">
              <Input
                value={form.operationsEmail}
                onChangeText={(v) => setField("operationsEmail", v)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>
            <Field label="Primary phone">
              <Input
                value={form.primaryPhone}
                onChangeText={(v) => setField("primaryPhone", v)}
                keyboardType="phone-pad"
              />
            </Field>
            <Field label="Timezone">
              <Input value={form.timezone} onChangeText={(v) => setField("timezone", v)} />
            </Field>
          </Section>
          <Section title="Business Details">
            <Field label="Tax ID / TIN">
              <Input value={form.taxId} onChangeText={(v) => setField("taxId", v)} />
            </Field>
            <Field label="Business Address">
              <Input
                value={form.businessAddress}
                onChangeText={(v) => setField("businessAddress", v)}
              />
            </Field>
            <Field label="Warehouse Location">
              <Input
                value={form.warehouseLocation}
                onChangeText={(v) => setField("warehouseLocation", v)}
              />
            </Field>
            <Field label="Default Currency">
              <Input
                value={form.defaultCurrencyLabel}
                onChangeText={(v) => setField("defaultCurrencyLabel", v)}
              />
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
          <Toggle
            label="New booking created"
            value={form.notifyNewBooking === "true"}
            onChange={(v) => setField("notifyNewBooking", String(v))}
          />
          <Toggle
            label="Booking status changed"
            value={form.notifyBookingStatusChanged === "true"}
            onChange={(v) => setField("notifyBookingStatusChanged", String(v))}
          />
          <Toggle
            label="Payment received"
            value={form.notifyPaymentReceived === "true"}
            onChange={(v) => setField("notifyPaymentReceived", String(v))}
          />
          <Toggle
            label="Booking cancelled"
            value={form.notifyBookingCancelled === "true"}
            onChange={(v) => setField("notifyBookingCancelled", String(v))}
          />
          <AppText variant="eyebrow">Inventory Alerts</AppText>
          <Toggle
            label="Low stock warning"
            value={form.notifyLowStock === "true"}
            onChange={(v) => setField("notifyLowStock", String(v))}
          />
          <Toggle
            label="Damage report submitted"
            value={form.notifyDamageReport === "true"}
            onChange={(v) => setField("notifyDamageReport", String(v))}
          />
          <Toggle
            label="Service due reminder"
            value={form.notifyServiceDue === "true"}
            onChange={(v) => setField("notifyServiceDue", String(v))}
          />
          <Toggle
            label="Material checked in/out"
            value={form.notifyMaterialCheckInOut === "true"}
            onChange={(v) => setField("notifyMaterialCheckInOut", String(v))}
          />
          <AppText variant="eyebrow">Schedule Alerts</AppText>
          <Toggle
            label="Assembly reminder (24h)"
            value={form.notifyAssemblyReminder === "true"}
            onChange={(v) => setField("notifyAssemblyReminder", String(v))}
          />
          <Toggle
            label="Event day reminder"
            value={form.notifyEventDayReminder === "true"}
            onChange={(v) => setField("notifyEventDayReminder", String(v))}
          />
          <Toggle
            label="Overtime assignment"
            value={form.notifyOvertimeAssignment === "true"}
            onChange={(v) => setField("notifyOvertimeAssignment", String(v))}
          />
          <Toggle
            label="Dismantle reminder"
            value={form.notifyDismantleReminder === "true"}
            onChange={(v) => setField("notifyDismantleReminder", String(v))}
          />
          <AppText variant="eyebrow">Delivery Method</AppText>
          <Toggle
            label="In-app notifications"
            value={form.notifyInApp === "true"}
            onChange={(v) => setField("notifyInApp", String(v))}
          />
          <Toggle
            label="SMS notifications"
            value={form.notifySms === "true"}
            onChange={(v) => setField("notifySms", String(v))}
          />
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
            <Input
              value={form.sessionTimeoutMinutes}
              onChangeText={(v) => setField("sessionTimeoutMinutes", v)}
              keyboardType="numeric"
            />
          </Field>
          <Field label="Max login attempts">
            <Input
              value={form.maxLoginAttempts}
              onChangeText={(v) => setField("maxLoginAttempts", v)}
              keyboardType="numeric"
            />
          </Field>
          <AppText variant="eyebrow">Authentication</AppText>
          <Toggle
            label="Phone OTP verification"
            value={form.notifyOtpVerification === "true"}
            onChange={(v) => setField("notifyOtpVerification", String(v))}
          />
          <Toggle
            label="Two-factor authentication (2FA)"
            value={form.notifyTwoFactorAuth === "true"}
            onChange={(v) => setField("notifyTwoFactorAuth", String(v))}
          />
          <Toggle
            label="Force password reset on first login"
            value={form.notifyForcePasswordReset === "true"}
            onChange={(v) => setField("notifyForcePasswordReset", String(v))}
          />
          <Toggle
            label="IP address whitelist"
            value={form.notifyIpWhitelist === "true"}
            onChange={(v) => setField("notifyIpWhitelist", String(v))}
          />
          <AppText variant="eyebrow">Password Policy</AppText>
          <Toggle
            label="Minimum 8 characters"
            value={form.passwordMin8 === "true"}
            onChange={(v) => setField("passwordMin8", String(v))}
          />
          <Toggle
            label="Require uppercase letter"
            value={form.passwordUppercase === "true"}
            onChange={(v) => setField("passwordUppercase", String(v))}
          />
          <Toggle
            label="Require special character"
            value={form.passwordSpecialChar === "true"}
            onChange={(v) => setField("passwordSpecialChar", String(v))}
          />
          <Toggle
            label="Password expiry (90 days)"
            value={form.passwordExpiry90 === "true"}
            onChange={(v) => setField("passwordExpiry90", String(v))}
          />
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

const VALUE_TYPES = ["boolean", "rating_5", "rating_10", "percentage"] as const;

function PerformanceMetricsPanel() {
  const [category, setCategory] = useState<"internal" | "client_feedback">("internal");
  const { data: metrics = [], isLoading, isError, refetch } = usePerformanceMetrics();
  const toggleMetric = useToggleMetricActive();
  const createMetric = useCreateMetric();
  const categories = ["internal", "client_feedback"] as const;
  const filtered = metrics.filter((metric) => metric.category === category);

  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [valueType, setValueType] = useState<(typeof VALUE_TYPES)[number]>("rating_5");
  const [addError, setAddError] = useState<string | null>(null);

  const toggleActive = (id: string, isActive: boolean) => {
    toggleMetric.mutate({ id, isActive: !isActive });
  };

  const handleAddMetric = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setAddError("Enter a name for this metric.");
      return;
    }
    setAddError(null);
    try {
      await createMetric.mutateAsync({
        key: trimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, ""),
        label: trimmed,
        description: description.trim(),
        category,
        sortOrder: filtered.length,
        isActive: true,
        valueType,
      });
      setLabel("");
      setDescription("");
      setValueType("rating_5");
      setAddOpen(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add metric.");
    }
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
        <Button variant="ghost" icon={Plus} onPress={() => setAddOpen(true)}>
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
              accessibilityRole="switch"
              accessibilityState={{ checked: metric.isActive }}
              accessibilityLabel={metric.label}
              onPress={() => toggleActive(metric.id, metric.isActive)}
              style={[styles.toggle, metric.isActive ? styles.toggleOn : null]}
            >
              <View style={[styles.knob, metric.isActive ? styles.knobOn : null]} />
            </Pressable>
          </View>
        ))}
      </View>

      <BottomSheet
        visible={addOpen}
        title="Add Performance Metric"
        onClose={() => setAddOpen(false)}
      >
        <Field label="Name">
          <Input value={label} onChangeText={setLabel} placeholder="e.g. Punctuality" />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChangeText={setDescription}
            placeholder="What does this metric evaluate?"
          />
        </Field>
        <Field label="Scoring type">
          <View style={styles.choiceWrap}>
            {VALUE_TYPES.map((type) => (
              <ChoiceChip
                key={type}
                label={type.replace("_", " ")}
                active={valueType === type}
                onPress={() => setValueType(type)}
              />
            ))}
          </View>
        </Field>
        {addError ? (
          <AppText variant="small" color={colors.destructive}>
            {addError}
          </AppText>
        ) : null}
        <Button disabled={createMetric.isPending} onPress={handleAddMetric}>
          {createMetric.isPending ? "Adding..." : "Add Metric"}
        </Button>
      </BottomSheet>
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

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
    >
      <AppText style={{ fontWeight: "700", flex: 1 }}>{label}</AppText>
      <View style={[styles.toggle, value ? styles.toggleOn : null]}>
        <View style={[styles.knob, value ? styles.knobOn : null]} />
      </View>
    </Pressable>
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
