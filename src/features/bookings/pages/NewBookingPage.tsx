import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, MapPin, Calendar, User, Phone, Package,
  Users, DollarSign, CheckCircle2, Save, Wrench, MessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createBookingApi } from "@/features/bookings/services/bookings.api";

const _Route = createFileRoute("/bookings/new")({
  head: () => ({
    meta: [
      { title: "New Booking · Vortex Visual" },
      { name: "description", content: "Create a new LED screen rental booking." },
    ],
  }),
  component: NewBooking,
});

const STEPS = [
  { k: "client", label: "Client", icon: Building2 },
  { k: "consult", label: "CTO Consult", icon: Wrench },
  { k: "venue", label: "Venue & Date", icon: MapPin },
  { k: "screen", label: "Screen Spec", icon: Package },
  { k: "team", label: "Team", icon: Users },
  { k: "payment", label: "Payment", icon: DollarSign },
  { k: "review", label: "Review", icon: CheckCircle2 },
] as const;

export function NewBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    client: "", contactPerson: "", contactPhone: "",
    ctoConsulted: false, ctoNotes: "", screensAvailable: 3, ctoArrangement: "",
    venue: "", assemblyDate: "", eventDate: "",
    screenType: "P4", size: 36, arrangement: "6M x 3M",
    chief: "", technician: "", stageHand: "TEAM 1 · Abel",
    amount: 75000, paymentTerms: "ADVANCE",
  });
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: createBookingApi,
    onSuccess: () => {
      toast.success("Booking created successfully!");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      navigate({ to: "/bookings" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create booking");
    },
  });

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/bookings" className="flex items-center gap-2 text-[12px] font-semibold transition hover:opacity-80" style={{ color: "var(--text-2)" }}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Cancel & return to Bookings
        </Link>
        <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
          Draft auto-saved · <span style={{ color: "var(--accent)" }}>SB-DRAFT-049</span>
        </div>
      </div>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight">New Booking</h1>
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Step {step + 1} of {STEPS.length} — {STEPS[step].label}
        </p>
      </div>

      {/* Step pills */}
      <div className="mb-6 grid grid-cols-7 gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <button
              key={s.k}
              onClick={() => i <= step && setStep(i)}
              className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-left transition"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "color-mix(in oklab, var(--accent) 10%, transparent)" : "var(--surface)",
                opacity: i > step ? 0.55 : 1,
              }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background: done ? "var(--accent)" : active ? "var(--surface-2)" : "transparent",
                  color: done ? "var(--accent-foreground)" : active ? "var(--accent)" : "var(--text-3)",
                  border: active ? `1px solid var(--accent)` : `1px solid var(--border)`,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <div className="hidden xl:block">
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: active ? "var(--accent)" : "var(--text-3)" }}>
                  Step {i + 1}
                </div>
                <div className="text-[11px] font-semibold">{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {/* Step 0: Client */}
          {step === 0 && (
            <Group title="Client Information" icon={Building2}>
              <Field label="Client / Organization">
                <input value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="e.g. Sheraton Addis" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Contact Person" icon={User}>
                  <input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Full name" className={inputCls} />
                </Field>
                <Field label="Phone" icon={Phone}>
                  <input 
                    value={form.contactPhone} 
                    onChange={(e) => set("contactPhone", e.target.value)} 
                    placeholder="+251 9.. ... ...." 
                    className={`${inputCls} ${/[a-zA-Z]/.test(form.contactPhone) ? "border-destructive focus:border-destructive" : ""}`} 
                  />
                  {/[a-zA-Z]/.test(form.contactPhone) && (
                    <p className="text-[11px] mt-1" style={{ color: "var(--destructive)" }}>
                      Phone number cannot contain letters
                    </p>
                  )}
                </Field>
              </div>
            </Group>
          )}

          {/* Step 1: CTO Consultation (SOP §1.2-1.3) */}
          {step === 1 && (
            <Group title="CTO Consultation" icon={Wrench}>
              <div className="rounded-md border p-4 mb-4" style={{ borderColor: "var(--accent)", background: "color-mix(in oklab, var(--accent) 6%, transparent)" }}>
                <div className="flex items-center gap-2 text-[12px] font-bold" style={{ color: "var(--accent)" }}>
                  <Wrench className="h-4 w-4" />
                  SOP §1.2 — Consult Chief Technical Officer
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>
                  Contact the CTO to confirm screen availability for the requested dates and get arrangement guidance.
                </p>
              </div>

              <Field label="Screen Availability (units available)">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "P2.97", avail: 128 },
                    { type: "P4", avail: 20 },
                    { type: "P3.91 INDOOR", avail: 72 },
                    { type: "P3.91 OUTDOOR", avail: 72 },
                    { type: "P2.97-New", avail: 128 },
                    { type: "P5", avail: 48 },
                  ].map(({ type, avail }) => (
                    <div key={type} className="rounded-md border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                      <div className="font-mono text-[11px] font-bold">{type}</div>
                      <div className="mt-1 text-[14px] font-bold" style={{ color: avail > 30 ? "var(--color-bom-returned)" : "var(--color-pay-advance)" }}>
                        {avail} <span className="text-[9px] font-normal" style={{ color: "var(--text-3)" }}>panels</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Field>

              <Field label="CTO Arrangement Suggestions" icon={MessageSquare}>
                <textarea
                  value={form.ctoArrangement}
                  onChange={(e) => set("ctoArrangement", e.target.value)}
                  placeholder="CTO arrangement notes, e.g. 'Recommend 2-stack horizontal, P2.97 for indoor venue...'"
                  rows={3}
                  className="h-auto w-full rounded-md border bg-[var(--surface-2)] p-3 text-[13px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
                  style={{ borderColor: "var(--border)" }}
                />
              </Field>

              <Field label="CTO Notes / Special Guidance">
                <textarea
                  value={form.ctoNotes}
                  onChange={(e) => set("ctoNotes", e.target.value)}
                  placeholder="e.g. 'HDMI to SDI converter needed. Backup PSU on standby.'"
                  rows={2}
                  className="h-auto w-full rounded-md border bg-[var(--surface-2)] p-3 text-[13px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
                  style={{ borderColor: "var(--border)" }}
                />
              </Field>

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => set("ctoConsulted", !form.ctoConsulted)}
                  className="flex items-center gap-2 rounded-md border px-4 py-2 text-[12px] font-semibold transition"
                  style={{
                    borderColor: form.ctoConsulted ? "var(--color-bom-returned)" : "var(--border)",
                    background: form.ctoConsulted ? "color-mix(in oklab, var(--color-bom-returned) 12%, transparent)" : "transparent",
                    color: form.ctoConsulted ? "var(--color-bom-returned)" : "var(--text-2)",
                  }}
                >
                  {form.ctoConsulted ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: "var(--border)" }} />}
                  CTO Consultation Completed
                </button>
              </div>
            </Group>
          )}

          {/* Step 2: Venue & Date */}
          {step === 2 && (
            <Group title="Venue & Date" icon={MapPin}>
              <Field label="Venue / Location">
                <input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Millennium Hall" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Assembly Date" icon={Calendar}>
                  <input type="date" value={form.assemblyDate} onChange={(e) => set("assemblyDate", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Event Date" icon={Calendar}>
                  <input type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Group>
          )}

          {/* Step 3: Screen Spec */}
          {step === 3 && (
            <Group title="Screen Specification" icon={Package}>
              <Field label="Screen Type">
                <div className="grid grid-cols-3 gap-2">
                  {["P2.97", "P4", "P5", "P2.97-New", "P3.91 INDOOR", "P3.91 OUTDOOR"].map((t) => (
                    <button
                      key={t}
                      onClick={() => set("screenType", t)}
                      className="rounded-md border px-3 py-2 text-[12px] font-mono font-semibold transition"
                      style={{
                        borderColor: form.screenType === t ? "var(--accent)" : "var(--border)",
                        background: form.screenType === t ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "var(--surface-2)",
                        color: form.screenType === t ? "var(--accent)" : "var(--text-2)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Size (sqm)">
                  <input type="number" value={form.size} onChange={(e) => set("size", +e.target.value)} className={inputCls} />
                </Field>
                <Field label="Arrangement (W x H)">
                  <input value={form.arrangement} onChange={(e) => set("arrangement", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </Group>
          )}

          {/* Step 4: Team */}
          {step === 4 && (
            <Group title="Team Assignment" icon={Users}>
              <Field label="Chief Technician">
                <select value={form.chief} onChange={(e) => set("chief", e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {["Bereket Alemu", "Robel Hailu"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Technician">
                <select value={form.technician} onChange={(e) => set("technician", e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {["Yeabtsega", "Dawit Mekonnen", "Yonas Kebede", "Mahlet Girma"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Stage Hand Team">
                <select value={form.stageHand} onChange={(e) => set("stageHand", e.target.value)} className={inputCls}>
                  {["TEAM 1 · Abel", "TEAM 2 · Mesfin", "TEAM 3 · Henok", "TEAM 4 · Solomon", "TEAM 5 · Tewodros"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </Group>
          )}

          {/* Step 5: Payment */}
          {step === 5 && (
            <Group title="Payment Terms" icon={DollarSign}>
              <Field label="Total Contract Value (ETB)">
                <input type="number" value={form.amount} onChange={(e) => set("amount", +e.target.value)} className={`${inputCls} font-mono text-[15px] font-bold`} />
              </Field>
              <Field label="Initial Status">
                <div className="grid grid-cols-3 gap-2">
                  {(["UNPAID", "ADVANCE", "PAID"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => set("paymentTerms", p)}
                      className="rounded-md border px-3 py-2 text-[12px] font-bold uppercase tracking-wider transition"
                      style={{
                        borderColor: form.paymentTerms === p ? "var(--accent)" : "var(--border)",
                        background: form.paymentTerms === p ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "var(--surface-2)",
                        color: form.paymentTerms === p ? "var(--accent)" : "var(--text-2)",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
            </Group>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <Group title="Review & Confirm" icon={CheckCircle2}>
              <div className="space-y-1 rounded-md border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                {[
                  ["Client", form.client || "—"],
                  ["Contact", `${form.contactPerson || "—"} · ${form.contactPhone || "—"}`],
                  ["CTO Consulted", form.ctoConsulted ? "Yes ✓" : "Pending"],
                  ["CTO Notes", form.ctoNotes || form.ctoArrangement || "—"],
                  ["Venue", form.venue || "—"],
                  ["Assembly", form.assemblyDate || "—"],
                  ["Event", form.eventDate || "—"],
                  ["Screen", `${form.screenType} · ${form.size} sqm · ${form.arrangement}`],
                  ["Team", `${form.chief || "?"} / ${form.technician || "?"} · ${form.stageHand}`],
                  ["Contract", `ETB ${form.amount.toLocaleString()} (${form.paymentTerms})`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b py-1.5 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                    <span className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{k}</span>
                    <span className="font-semibold text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
                On confirm, booking will be created with status <strong style={{ color: "var(--color-status-reserved)" }}>RESERVED</strong> and equipment will be auto-reserved from inventory.
              </p>
            </Group>
          )}

          <div className="mt-6 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="rounded-md border px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              ← Previous
            </button>
            {step < STEPS.length - 1 ? (
              <button
                disabled={step === 0 && /[a-zA-Z]/.test(form.contactPhone)}
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="rounded-md px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => createBooking(form)}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-md px-5 py-2 text-[12px] font-bold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                <Save className="h-3.5 w-3.5" />
                {isPending ? "Creating..." : "Confirm & Create Booking"}
              </button>
            )}
          </div>
        </div>

        <aside className="col-span-4">
          <div className="sticky top-20 rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="label-eyebrow mb-3">Booking Preview</div>
            <div className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="font-mono text-[20px] font-bold" style={{ color: "var(--accent)" }}>SB-DRAFT</div>
              <div className="mt-1 text-[13px] font-semibold">{form.client || "Client name…"}</div>
              <div className="text-[11px]" style={{ color: "var(--text-2)" }}>{form.venue || "Venue…"}</div>
              {form.ctoConsulted && (
                <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--color-bom-returned)" }}>
                  <CheckCircle2 className="h-3 w-3" /> CTO Consulted
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[11px]" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Assembly</div>
                  <div className="font-mono font-semibold">{form.assemblyDate || "—"}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Event</div>
                  <div className="font-mono font-semibold">{form.eventDate || "—"}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Screen</div>
                  <div className="font-mono font-semibold">{form.screenType}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Size</div>
                  <div className="font-mono font-semibold">{form.size} sqm</div>
                </div>
              </div>
              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                <div className="label-eyebrow">Contract</div>
                <div className="font-mono text-[18px] font-bold">ETB {form.amount.toLocaleString()}</div>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Equipment availability is checked against the inventory pool. Conflicting reservations will be flagged before confirmation.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

const inputCls = "h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[13px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]";

function Group({ title, icon: I, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <I className="h-4 w-4" style={{ color: "var(--accent)" }} />
        <h2 className="text-[14px] font-bold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, icon: I, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
        {I && <I className="h-3 w-3" />}
        {label}
      </div>
      <div style={{ borderColor: "var(--border)" }}>{children}</div>
    </label>
  );
}
