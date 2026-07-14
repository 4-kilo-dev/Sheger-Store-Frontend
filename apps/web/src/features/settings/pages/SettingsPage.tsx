import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Building2, Languages, LockKeyhole, Save, Shield, UsersRound, Check, X, ClipboardCheck, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState, useEffect, Fragment } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/use-active-profile";
import { useCalendarSystem, useDateFormatter } from "@/context/CalendarSystemContext";
import {
  listPerformanceMetricsApi,
  createPerformanceMetricApi,
  updatePerformanceMetricApi,
  type PerformanceMetric,
} from "@/features/bookings/services/evaluations.api";
import {
  getCustomFieldDefinitionsApi,
  createCustomFieldDefinitionApi,
  deleteCustomFieldDefinitionApi,
} from "@/features/bookings/services/bookings.api";
import {
  getRolesWithPermissionsApi,
  getPermissionsApi,
  addRolePermissionApi,
  removeRolePermissionApi,
  type Permission,
  type RoleWithPermissions,
} from "@/features/users/services/staff.api";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";

const _Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Vortex Visual" },
      { name: "description", content: "Configure Vortex Visual operations, alerts, language, and access." },
    ],
  }),
  component: SettingsPage,
});

const panels = [
  { icon: UsersRound, label: "Roles & permissions" },
  { icon: Languages, label: "Language" },
  { icon: ClipboardCheck, label: "Performance Metrics" },
  { icon: SlidersHorizontal, label: "Custom Fields" },
];

const inputCls = "mt-2 h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[13px] outline-none focus:border-[var(--accent)]";

function Toggle({ on, label }: { on: boolean; label: string }) {
  const [enabled, setEnabled] = useState(on);
  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className="flex items-center justify-between rounded-md border px-4 py-3 transition hover:border-[var(--accent)]"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <span className="text-[12px] font-medium">{label}</span>
      <div
        className="flex h-5 w-9 items-center rounded-full px-0.5 transition"
        style={{ background: enabled ? "var(--accent)" : "var(--border)" }}
      >
        <div
          className="h-4 w-4 rounded-full transition-transform"
          style={{
            background: enabled ? "var(--accent-foreground)" : "var(--surface)",
            transform: enabled ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </div>
    </button>
  );
}

export function SettingsPage() {
  const { calendarSystem, numeralsSystem, commitSettings } = useCalendarSystem();
  const { formatDate } = useDateFormatter();
  const [active, setActive] = useState("Roles & permissions");

  const [tempCalendarSystem, setTempCalendarSystem] = useState(calendarSystem);
  const [tempNumeralsSystem, setTempNumeralsSystem] = useState(numeralsSystem);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setTempCalendarSystem(calendarSystem);
    setTempNumeralsSystem(numeralsSystem);
  }, [calendarSystem, numeralsSystem]);

  const handleSaveChanges = async () => {
    setSavingSettings(true);
    try {
      await commitSettings(tempCalendarSystem, tempNumeralsSystem);
      toast.success("Settings saved successfully!");
    } catch (e) {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  };

  const formatPreviewDate = (date: Date) => {
    if (tempCalendarSystem === "ethiopic") {
      const locale = tempNumeralsSystem === "geez" ? "am-ET-u-ca-ethiopic" : "am-ET-u-ca-ethiopic-nu-latn";
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(date);
    }
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Administration</div>
          <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-[12px] text-text-2">Company defaults, role permissions, notifications, and language preferences.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[240px_1fr]">
        {/* Nav */}
        <nav className="h-fit rounded-lg border p-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {panels.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[12px] font-semibold transition"
              style={{
                background: active === label ? "var(--surface-2)" : "transparent",
                color: active === label ? "var(--foreground)" : "var(--text-2)",
              }}
            >
              <Icon className="h-4 w-4" style={{ color: active === label ? "var(--accent)" : "currentColor" }} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="space-y-5">


          {active === "Roles & permissions" && (
            <RolesPermissionsPanel />
          )}



          {active === "Language" && (
            <Section title="Language & Regional" aside="Localization">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-[12px] font-semibold">
                  Display language
                  <select className={inputCls} style={{ borderColor: "var(--border)" }}>
                    <option>English</option>
                    <option>አማርኛ (Amharic)</option>
                  </select>
                </label>
                <label className="text-[12px] font-semibold">
                  Currency
                  <select className={inputCls} style={{ borderColor: "var(--border)" }}>
                    <option>ETB — Ethiopian Birr</option>
                    <option>USD — US Dollar</option>
                  </select>
                </label>
                <label className="text-[12px] font-semibold">
                  Calendar System
                  <select
                    value={tempCalendarSystem}
                    onChange={(e) => setTempCalendarSystem(e.target.value as any)}
                    className={inputCls}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="gregorian">Gregorian Calendar (Western)</option>
                    <option value="ethiopic">Ethiopian Calendar (የኢትዮጵያ ዘመን አቆጣጠር)</option>
                  </select>
                </label>
                <label className="text-[12px] font-semibold">
                  Numerals Style
                  <select
                    value={tempNumeralsSystem}
                    onChange={(e) => setTempNumeralsSystem(e.target.value as any)}
                    disabled={tempCalendarSystem !== "ethiopic"}
                    className={inputCls}
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="latn">Latin (1, 2, 3...)</option>
                    <option value="geez">Ge'ez (፩, ፪, ፫...)</option>
                  </select>
                </label>
                <label className="text-[12px] font-semibold">
                  Timezone
                  <select className={inputCls} style={{ borderColor: "var(--border)" }}>
                    <option>Africa/Addis_Ababa (EAT +03:00)</option>
                    <option>UTC</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 rounded-md border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <div className="label-eyebrow mb-2">Preview</div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div><span style={{ color: "var(--text-3)" }}>Date:</span> {formatPreviewDate(new Date())}</div>
                  <div><span style={{ color: "var(--text-3)" }}>Currency:</span> ETB 125,000</div>
                  <div><span style={{ color: "var(--text-3)" }}>Time:</span> 11:38 EAT</div>
                  <div><span style={{ color: "var(--text-3)" }}>Language:</span> English</div>
                </div>
              </div>
            </Section>
          )}



          {active === "Performance Metrics" && (
            <PerformanceMetricsPanel />
          )}

          {active === "Custom Fields" && (
            <CustomFieldsPanel />
          )}

          {/* Save button */}
          {active === "Language" && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveChanges}
                disabled={savingSettings}
                className="flex items-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <Save className="h-4 w-4" /> {savingSettings ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <header className="flex h-11 items-center justify-between border-b px-4" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-[13px] font-bold">{title}</h2>
        {aside && <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>{aside}</span>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function humanizePermissionAction(key: string): string {
  const action = key.includes(".") ? key.slice(key.indexOf(".") + 1) : key;
  return action
    .split(/[._]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function humanizeDomain(domain: string): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function RolesPermissionsPanel() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can(PERMISSION.ROLE_MANAGE);

  const {
    data: roles = [],
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery<RoleWithPermissions[]>({
    queryKey: ["roles-with-permissions"],
    queryFn: getRolesWithPermissionsApi,
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery<Permission[]>({
    queryKey: ["permissions-catalog"],
    queryFn: getPermissionsApi,
  });

  const { mutate: togglePermission, isPending: toggling } = useMutation({
    mutationFn: ({ roleId, permissionId, active }: { roleId: string; permissionId: string; active: boolean }) =>
      active ? addRolePermissionApi(roleId, permissionId) : removeRolePermissionApi(roleId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update permission");
    },
  });

  // Map of roleId -> set of permission keys it holds, for O(1) cell lookups.
  const rolePermKeys = new Map<string, Set<string>>(
    roles.map((r) => [r.id, new Set((r.permissions || []).map((p) => p.key))])
  );

  // Group permissions by domain prefix, preserving first-seen order.
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

  const loading = rolesLoading || permsLoading;

  return (
    <Section title="Role Permissions Matrix" aside="Access control">
      {loading ? (
        <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-3)" }}>Loading roles and permissions…</div>
      ) : rolesError ? (
        <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
          Unable to load roles. You may not have permission to manage access control.
        </div>
      ) : (
        <>
          <p className="mb-3 text-[11px]" style={{ color: "var(--text-3)" }}>
            {canManage
              ? "Click a cell to grant or revoke a permission for that role."
              : "Read-only view. Managing roles requires the role.manage permission."}
          </p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="border-b px-3 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>Permission</th>
                  {roles.map((r) => (
                    <th key={r.id} className="border-b px-3 py-2.5 text-center label-eyebrow" style={{ borderColor: "var(--border)" }}>{r.displayName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.domain}>
                    <tr style={{ background: "var(--surface-2)" }}>
                      <td
                        className="px-3 py-1.5 label-eyebrow"
                        colSpan={roles.length + 1}
                        style={{ color: "var(--accent)" }}
                      >
                        {humanizeDomain(group.domain)}
                      </td>
                    </tr>
                    {group.perms.map((perm) => (
                      <tr key={perm.id} className="border-b last:border-0 transition hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                        <td className="px-3 py-2.5 font-medium">
                          <div>{humanizePermissionAction(perm.key)}</div>
                          <div className="font-mono text-[9.5px]" style={{ color: "var(--text-3)" }}>{perm.key}</div>
                        </td>
                        {roles.map((role) => {
                          const has = rolePermKeys.get(role.id)?.has(perm.key) ?? false;
                          return (
                            <td key={role.id} className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                disabled={!canManage || toggling}
                                onClick={() => togglePermission({ roleId: role.id, permissionId: perm.id, active: !has })}
                                className="mx-auto flex h-6 w-6 items-center justify-center rounded transition enabled:hover:bg-[var(--surface)] disabled:cursor-default"
                                title={canManage ? (has ? "Click to revoke" : "Click to grant") : undefined}
                                aria-label={`${has ? "Revoke" : "Grant"} ${perm.key} for ${role.displayName}`}
                              >
                                {has ? (
                                  <Check className="h-3.5 w-3.5" style={{ color: "var(--color-bom-returned)" }} />
                                ) : (
                                  <X className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

function PerformanceMetricsPanel() {
  const queryClient = useQueryClient();
  const [activeProfile] = useActiveProfile();
  const isAdmin = activeProfile.role === "Admin";

  const [category, setCategory] = useState<"internal" | "client_feedback">("internal");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<PerformanceMetric | null>(null);

  // Form States
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newOrder, setNewOrder] = useState(1);
  const [metricCategory, setMetricCategory] = useState<"internal" | "client_feedback">("internal");
  const [valueType, setValueType] = useState<"boolean" | "rating_10" | "rating_5" | "percentage">("boolean");

  // Queries
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["all-settings-metrics"],
    queryFn: () => listPerformanceMetricsApi(),
  });

  // Filter metrics
  const filteredMetrics = metrics?.filter((m) => m.category === category) || [];

  // Mutations
  const { mutate: createMetric, isPending: creating } = useMutation({
    mutationFn: createPerformanceMetricApi,
    onSuccess: () => {
      toast.success("Performance metric created!");
      queryClient.invalidateQueries({ queryKey: ["all-settings-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["active-metrics"] });
      setShowAddModal(false);
      // Clear fields
      setNewKey("");
      setNewLabel("");
      setNewDesc("");
      setNewOrder(1);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create metric");
    }
  });

  const { mutate: updateMetric, isPending: updating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updatePerformanceMetricApi(id, payload),
    onSuccess: () => {
      toast.success("Performance metric updated!");
      queryClient.invalidateQueries({ queryKey: ["all-settings-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["active-metrics"] });
      setEditingMetric(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update metric");
    }
  });

  const handleToggleActive = (metric: PerformanceMetric) => {
    if (!isAdmin) {
      toast.error("Only administrators can manage performance metrics!");
      return;
    }
    updateMetric({ id: metric.id, payload: { isActive: !metric.isActive } });
  };

  const openEditModal = (metric: PerformanceMetric) => {
    setEditingMetric(metric);
    setNewKey(metric.key);
    setNewLabel(metric.label);
    setNewDesc(metric.description);
    setNewOrder(metric.sortOrder);
    setMetricCategory(metric.category);
    setValueType(metric.valueType);
    setShowAddModal(false);
  };

  const openCreateModal = () => {
    setEditingMetric(null);
    setNewKey("");
    setNewLabel("");
    setNewDesc("");
    setNewOrder(filteredMetrics.length + 1);
    setMetricCategory(category);
    setValueType(category === "internal" ? "boolean" : "rating_10");
    setShowAddModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {/* Category toggle tabs */}
        <div className="flex rounded-md border p-1" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <button
            onClick={() => setCategory("internal")}
            className="rounded px-3 py-1.5 text-[11px] font-semibold transition"
            style={{
              background: category === "internal" ? "var(--surface)" : "transparent",
              color: category === "internal" ? "var(--foreground)" : "var(--text-2)",
            }}
          >
            Internal Crew Review
          </button>
          <button
            onClick={() => setCategory("client_feedback")}
            className="rounded px-3 py-1.5 text-[11px] font-semibold transition"
            style={{
              background: category === "client_feedback" ? "var(--surface)" : "transparent",
              color: category === "client_feedback" ? "var(--foreground)" : "var(--text-2)",
            }}
          >
            Client Satisfaction Survey
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded px-3 py-2 text-[11px] font-bold transition hover:brightness-110"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Create Metric
          </button>
        )}
      </div>

      <Section title={`${category === "internal" ? "Internal Operations" : "Client Survey"} Metrics Catalog`} aside="Module 11 Configuration">
        {isLoading ? (
          <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>Loading metrics...</div>
        ) : filteredMetrics.length === 0 ? (
          <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-3)" }}>No metrics defined for this category.</div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="border-b px-3 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>Sort</th>
                  <th className="border-b px-3 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>Label</th>
                  <th className="border-b px-3 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>Database Key</th>
                  <th className="border-b px-3 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>Type</th>
                  <th className="border-b px-3 py-2.5 text-center label-eyebrow" style={{ borderColor: "var(--border)" }}>Status</th>
                  {isAdmin && <th className="border-b px-3 py-2.5 text-right label-eyebrow" style={{ borderColor: "var(--border)" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 transition hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>{m.sortOrder}</td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{m.label}</div>
                      {m.description && <div className="text-[10px]" style={{ color: "var(--text-3)" }}>{m.description}</div>}
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px]" style={{ color: "var(--text-2)" }}>{m.key}</td>
                    <td className="px-3 py-3 text-[11px]" style={{ color: "var(--text-2)" }}>
                      <span className="font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                        {m.valueType === "boolean" ? "Met/Not Met" : m.valueType === "rating_10" ? "0-10 Rating" : m.valueType === "rating_5" ? "1-5 Stars" : "0-100%"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        disabled={!isAdmin || updating}
                        onClick={() => handleToggleActive(m)}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold transition hover:opacity-80 disabled:opacity-50`}
                        style={{
                          background: m.isActive ? "rgba(48, 164, 108, 0.15)" : "rgba(113, 113, 122, 0.15)",
                          color: m.isActive ? "var(--color-status-done)" : "var(--text-3)",
                          border: `1px solid ${m.isActive ? "rgba(48, 164, 108, 0.3)" : "rgba(113, 113, 122, 0.3)"}`
                        }}
                      >
                        {m.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => openEditModal(m)}
                          className="text-[11px] font-semibold hover:opacity-80 animate-in fade-in duration-200"
                          style={{ color: "var(--accent)" }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Create/Edit Modal */}
      {(showAddModal || editingMetric) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-[15px] font-bold">
                {editingMetric ? `Edit Metric: ${editingMetric.label}` : "Create Performance Metric"}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMetric(null);
                }} 
                className="text-[12px] font-semibold hover:opacity-80" 
                style={{ color: "var(--text-3)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Metric Name / Label
                  <input 
                    type="text" 
                    value={newLabel} 
                    onChange={(e) => setNewLabel(e.target.value)} 
                    placeholder="e.g. PPE Compliance"
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }} 
                  />
                </label>
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Database Key
                  <input 
                    type="text" 
                    value={newKey} 
                    onChange={(e) => setNewKey(e.target.value)} 
                    placeholder="e.g. ppe"
                    disabled={!!editingMetric} // Key shouldn't change after creation
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] disabled:opacity-50" 
                    style={{ borderColor: "var(--border)" }} 
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Sort Order
                  <input 
                    type="number" 
                    value={newOrder} 
                    onChange={(e) => setNewOrder(parseInt(e.target.value) || 1)} 
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }} 
                  />
                </label>
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Category
                  <select 
                    value={metricCategory}
                    onChange={(e) => setMetricCategory(e.target.value as "internal" | "client_feedback")}
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="internal">Internal Review</option>
                    <option value="client_feedback">Client Feedback</option>
                  </select>
                </label>
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Value Type / Scale
                  <select 
                    value={valueType}
                    onChange={(e) => setValueType(e.target.value as any)}
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]" 
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="boolean">Met / Not Met</option>
                    <option value="rating_10">0 - 10 Rating</option>
                    <option value="rating_5">1 - 5 Stars</option>
                    <option value="percentage">0 - 100%</option>
                  </select>
                </label>
              </div>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Description
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)} 
                  placeholder="Detailed description of what this metric evaluates..."
                  className="mt-1 h-20 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px]" 
                  style={{ borderColor: "var(--border)" }} 
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => {
                  if (!newLabel.trim() || !newKey.trim()) {
                    toast.error("Label and Key are required!");
                    return;
                  }
                  if (editingMetric) {
                    updateMetric({
                      id: editingMetric.id,
                      payload: {
                        label: newLabel,
                        description: newDesc,
                        sortOrder: newOrder,
                        category: metricCategory,
                        valueType: valueType,
                      }
                    });
                  } else {
                    createMetric({
                      key: newKey,
                      label: newLabel,
                      description: newDesc,
                      category: metricCategory,
                      sortOrder: newOrder,
                      valueType: valueType,
                      isActive: true,
                    });
                  }
                }}
                disabled={creating || updating}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {creating || updating ? "Saving..." : "Save Metric"}
              </button>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMetric(null);
                }} 
                className="rounded border px-4 py-2 text-[12px]" 
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomFieldsPanel() {
  const queryClient = useQueryClient();
  const [activeProfile] = useActiveProfile();
  const isAdmin = activeProfile.role === "Admin";

  const [showAddModal, setShowAddModal] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<"boolean" | "number" | "string" | "date" | "enum" | "multi_select">("string");
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [currentOption, setCurrentOption] = useState("");
  const [required, setRequired] = useState(false);

  // Auto-derive snake_case key from name
  const handleNameChange = (val: string) => {
    setName(val);
    const derivedKey = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_");
    setKey(derivedKey);
  };

  // Query definitions
  const { data: customFields = [], isLoading } = useQuery({
    queryKey: ["custom-field-definitions"],
    queryFn: getCustomFieldDefinitionsApi,
  });

  // Mutation for creating field
  const { mutate: createField, isPending: creating } = useMutation({
    mutationFn: createCustomFieldDefinitionApi,
    onSuccess: () => {
      toast.success("Custom field created successfully!");
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] });
      setShowAddModal(false);
      setName("");
      setKey("");
      setType("string");
      setOptionsList([]);
      setCurrentOption("");
      setRequired(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create custom field");
    },
  });

  // Mutation for deleting field
  const { mutate: deleteField } = useMutation({
    mutationFn: deleteCustomFieldDefinitionApi,
    onSuccess: () => {
      toast.success("Custom field deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["custom-field-definitions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete custom field");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only administrators can manage custom fields!");
      return;
    }
    if (!name.trim() || !key.trim()) {
      toast.error("Name and Key are required fields.");
      return;
    }

    // Validate snake_case key
    const snakeCaseRegex = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
    if (!snakeCaseRegex.test(key)) {
      toast.error("Key must be in snake_case (lowercase letters, numbers, and underscores).");
      return;
    }

    if ((type === "enum" || type === "multi_select") && optionsList.length === 0) {
      toast.error("Please add at least one option.");
      return;
    }

    const options = type === "enum" || type === "multi_select" ? optionsList : undefined;

    createField({
      name: name.trim(),
      key: key.trim(),
      type,
      options,
      required,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold">Booking Custom Fields</h3>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            Define custom specifications (e.g. Venue Type, Arrangement, VIP) dynamically requested on bookings.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-bold transition hover:brightness-110"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Custom Field
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
          Loading custom fields...
        </div>
      ) : customFields.length === 0 ? (
        <div
          className="py-10 text-center border border-dashed rounded-lg"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div className="text-[13px] font-semibold">No Custom Fields Configured</div>
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>
            Admins can define dynamic inputs for bookings.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <th className="p-3 font-semibold">Field Name</th>
                <th className="p-3 font-semibold">JSON Key</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Options</th>
                <th className="p-3 font-semibold text-center">Required</th>
                {isAdmin && <th className="p-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {customFields.map((field) => (
                <tr key={field.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="p-3 font-semibold">{field.name}</td>
                  <td className="p-3 font-mono text-[11px]" style={{ color: "var(--accent)" }}>
                    {field.key}
                  </td>
                  <td className="p-3 uppercase text-[10px] font-bold" style={{ color: "var(--text-2)" }}>
                    {field.type}
                  </td>
                  <td className="p-3 max-w-[200px] truncate" style={{ color: "var(--text-3)" }}>
                    {field.options && field.options.length > 0 ? field.options.join(", ") : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: field.required ? "rgba(229, 70, 102, 0.15)" : "var(--border)",
                        color: field.required ? "var(--destructive)" : "var(--text-3)",
                      }}
                    >
                      {field.required ? "YES" : "NO"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${field.name}"?`)) {
                            deleteField(field.id);
                          }
                        }}
                        className="p-1 hover:text-destructive transition-colors"
                        style={{ color: "var(--text-3)" }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Custom Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div
              className="flex items-center justify-between border-b pb-3 mb-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="text-[15px] font-bold">Add Booking Custom Field</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[12px] font-semibold hover:opacity-80"
                style={{ color: "var(--text-3)" }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Field Name (Display Label)
                <input
                  type="text"
                  required
                  placeholder="e.g. Venue Type"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                JSON DB Key (snake_case)
                <input
                  type="text"
                  required
                  placeholder="e.g. venue_type"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] font-mono"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>

              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Field Type
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option value="string">Text String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean (Yes/No)</option>
                  <option value="date">Date</option>
                  <option value="enum">Dropdown Selection (Enum)</option>
                  <option value="multi_select">Multi-Select List</option>
                </select>
              </label>

              {(type === "enum" || type === "multi_select") && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                    Add Options (Press Enter or click Add)
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="e.g. Indoor"
                        value={currentOption}
                        onChange={(e) => setCurrentOption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = currentOption.trim();
                            if (val && !optionsList.includes(val)) {
                              setOptionsList((prev) => [...prev, val]);
                              setCurrentOption("");
                            }
                          }
                        }}
                        className="h-9 flex-1 rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = currentOption.trim();
                          if (val && !optionsList.includes(val)) {
                            setOptionsList((prev) => [...prev, val]);
                            setCurrentOption("");
                          }
                        }}
                        className="rounded px-3 py-1.5 text-[11px] font-bold border"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Add
                      </button>
                    </div>
                  </label>

                  {optionsList.length > 0 && (
                    <div
                      className="flex flex-wrap gap-1.5 p-2.5 rounded border bg-[var(--surface-2)] max-h-24 overflow-y-auto"
                      style={{ borderColor: "var(--border)" }}
                    >
                      {optionsList.map((opt) => (
                        <span
                          key={opt}
                          className="flex items-center gap-1 rounded bg-[var(--surface)] border pl-2 pr-1 py-0.5 text-[11px] font-medium"
                          style={{ borderColor: "var(--border)" }}
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => setOptionsList((prev) => prev.filter((o) => o !== opt))}
                            className="hover:text-destructive p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2 text-[11px] font-semibold cursor-pointer" style={{ color: "var(--text-2)" }}>
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                Mark as Required Field on Booking
              </label>
            </div>

            <div
              className="mt-5 flex items-center gap-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                type="submit"
                disabled={creating}
                className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {creating ? "Creating..." : "Create Custom Field"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded border px-4 py-2 text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}