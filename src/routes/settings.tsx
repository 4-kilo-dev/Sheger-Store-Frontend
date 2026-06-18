import { createFileRoute } from "@tanstack/react-router";
import { BellRing, Building2, Languages, LockKeyhole, Save, Shield, UsersRound, Check, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/settings")({
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

function SettingsPage() {
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

          {/* Save button */}
          <div className="flex justify-end">
            <button className="flex items-center gap-2 rounded-md px-5 py-2.5 text-[13px] font-bold transition hover:brightness-110" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
              <Save className="h-4 w-4" /> Save Changes
            </button>
          </div>
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