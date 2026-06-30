import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Building2, Languages, LockKeyhole, Save, Shield, UsersRound, Check, X, ClipboardCheck, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveProfile } from "@/hooks/use-active-profile";
import {
  listPerformanceMetricsApi,
  createPerformanceMetricApi,
  updatePerformanceMetricApi,
  type PerformanceMetric,
} from "@/features/bookings/services/evaluations.api";

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
  { icon: Building2, label: "Company" },
  { icon: UsersRound, label: "Roles & permissions" },
  { icon: BellRing, label: "Notifications" },
  { icon: Languages, label: "Language" },
  { icon: LockKeyhole, label: "Security" },
  { icon: ClipboardCheck, label: "Performance Metrics" },
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
  const [active, setActive] = useState("Company");

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Administration</div>
          <h1 className="text-[24px] font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-[12px] text-text-2">Company defaults, role permissions, notifications, and language preferences.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[240px_1fr]">
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
          {active === "Company" && (
            <>
              <Section title="Company Information" aside="System defaults">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Company name", "Vortex Visual"],
                    ["Operations email", "operations@vortexvisual.et"],
                    ["Primary phone", "+251 911 000 040"],
                    ["Timezone", "Africa/Addis_Ababa"],
                  ].map(([label, value]) => (
                    <label key={label} className="text-[12px] font-semibold">
                      {label}
                      <input defaultValue={value} className={inputCls} style={{ borderColor: "var(--border)" }} />
                    </label>
                  ))}
                </div>
              </Section>
              <Section title="Business Details">
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Tax ID / TIN", "0012345678"],
                    ["Business Address", "Bole, Addis Ababa, Ethiopia"],
                    ["Warehouse Location", "Bole Sub-City, Warehouse Zone"],
                    ["Default Currency", "ETB — Ethiopian Birr"],
                  ].map(([label, value]) => (
                    <label key={label} className="text-[12px] font-semibold">
                      {label}
                      <input defaultValue={value} className={inputCls} style={{ borderColor: "var(--border)" }} />
                    </label>
                  ))}
                </div>
              </Section>
            </>
          )}

          {active === "Roles & permissions" && (
            <Section title="Role Permissions Matrix" aside="Access control">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      <th className="border-b px-3 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>Permission</th>
                      {["Admin", "CCR", "Chief Tech", "Technician", "Op. Officer", "Storekeeper"].map((r) => (
                        <th key={r} className="border-b px-3 py-2.5 text-center label-eyebrow" style={{ borderColor: "var(--border)" }}>{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
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
                    ].map(({ perm, access }) => (
                      <tr key={perm} className="border-b last:border-0 transition hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                        <td className="px-3 py-2.5 font-medium">{perm}</td>
                        {access.map((a, i) => (
                          <td key={i} className="px-3 py-2.5 text-center">
                            {a ? (
                              <Check className="mx-auto h-3.5 w-3.5" style={{ color: "var(--color-bom-returned)" }} />
                            ) : (
                              <X className="mx-auto h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {active === "Notifications" && (
            <Section title="Notification Preferences" aside="Per-role alerts">
              <div className="space-y-3">
                <div className="label-eyebrow mb-2">Booking Alerts</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle on={true} label="New booking created" />
                  <Toggle on={true} label="Booking status changed" />
                  <Toggle on={true} label="Payment received" />
                  <Toggle on={false} label="Booking cancelled" />
                </div>

                <div className="label-eyebrow mb-2 mt-4">Inventory Alerts</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle on={true} label="Low stock warning" />
                  <Toggle on={true} label="Damage report submitted" />
                  <Toggle on={true} label="Service due reminder" />
                  <Toggle on={false} label="Material checked in/out" />
                </div>

                <div className="label-eyebrow mb-2 mt-4">Schedule Alerts</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle on={true} label="Assembly reminder (24h)" />
                  <Toggle on={true} label="Event day reminder" />
                  <Toggle on={false} label="Overtime assignment" />
                  <Toggle on={false} label="Dismantle reminder" />
                </div>

                <div className="label-eyebrow mb-2 mt-4">Delivery Method</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle on={true} label="In-app notifications" />
                  <Toggle on={false} label="SMS notifications" />
                </div>
              </div>
            </Section>
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
                  Date format
                  <select className={inputCls} style={{ borderColor: "var(--border)" }}>
                    <option>YYYY-MM-DD</option>
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
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
                  <div><span style={{ color: "var(--text-3)" }}>Date:</span> 2026-06-14</div>
                  <div><span style={{ color: "var(--text-3)" }}>Currency:</span> ETB 125,000</div>
                  <div><span style={{ color: "var(--text-3)" }}>Time:</span> 11:38 EAT</div>
                  <div><span style={{ color: "var(--text-3)" }}>Language:</span> English</div>
                </div>
              </div>
            </Section>
          )}

          {active === "Security" && (
            <Section title="Security Settings" aside="Access & authentication">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-[12px] font-semibold">
                    Session timeout (minutes)
                    <input type="number" defaultValue={30} className={inputCls} style={{ borderColor: "var(--border)" }} />
                  </label>
                  <label className="text-[12px] font-semibold">
                    Max login attempts
                    <input type="number" defaultValue={5} className={inputCls} style={{ borderColor: "var(--border)" }} />
                  </label>
                </div>

                <div className="label-eyebrow mt-2">Authentication</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle on={true} label="Phone OTP verification" />
                  <Toggle on={false} label="Two-factor authentication (2FA)" />
                  <Toggle on={true} label="Force password reset on first login" />
                  <Toggle on={false} label="IP address whitelist" />
                </div>

                <div className="label-eyebrow mt-2">Password Policy</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Toggle on={true} label="Minimum 8 characters" />
                  <Toggle on={true} label="Require uppercase letter" />
                  <Toggle on={false} label="Require special character" />
                  <Toggle on={true} label="Password expiry (90 days)" />
                </div>

                <div className="rounded-md border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" style={{ color: "var(--accent)" }} />
                    <span className="text-[12px] font-bold">Active Sessions</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { device: "MacBook Pro — Chrome", ip: "192.168.1.7", time: "Active now", current: true },
                      { device: "iPhone 15 — Safari", ip: "192.168.1.12", time: "2 hours ago", current: false },
                    ].map((s) => (
                      <div key={s.device} className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                        <div>
                          <div className="text-[12px] font-medium">{s.device}</div>
                          <div className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>{s.ip} · {s.time}</div>
                        </div>
                        {s.current ? (
                          <span className="text-[10px] font-bold" style={{ color: "var(--color-bom-returned)" }}>Current</span>
                        ) : (
                          <button className="text-[10px] font-semibold" style={{ color: "var(--destructive)" }}>Revoke</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {active === "Performance Metrics" && (
            <PerformanceMetricsPanel />
          )}

          {/* Save button */}
          {active !== "Performance Metrics" && (
            <div className="flex justify-end">
              <button className="flex items-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-bold transition hover:brightness-110" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                <Save className="h-4 w-4" /> Save Changes
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