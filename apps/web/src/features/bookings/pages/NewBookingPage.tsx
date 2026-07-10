import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, MapPin, Calendar, User, Phone,
  CheckCircle2, Save, Wrench, MessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createBookingApi } from "@/features/bookings/services/bookings.api";
import { DatePicker } from "@/components/ui/date-picker";

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
  { k: "venue", label: "Venue & Date", icon: MapPin },
  { k: "intake", label: "Intake Requirements", icon: Wrench },
  { k: "review", label: "Review", icon: CheckCircle2 },
] as const;

export function NewBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    client: "", contactPerson: "", contactPhone: "",
    venue: "", assemblyDate: "", eventDate: "", dismantleDate: "",
    itemServiceSpec: "", notes: "",
    amount: 0, paymentTerms: "UNPAID",
  });
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { mutate: createBooking, isPending } = useMutation({
    mutationFn: createBookingApi,
    onSuccess: (data: any) => {
      toast.success("Booking created successfully!");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      if (data?.code) {
        navigate({ to: "/bookings/$code", params: { code: data.code } });
      } else {
        navigate({ to: "/bookings" });
      }
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
          New Booking Draft
        </div>
      </div>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight">New Booking</h1>
        <p className="text-[12px]" style={{ color: "var(--text-2)" }}>
          Step {step + 1} of {STEPS.length} — {STEPS[step].label}
        </p>
      </div>

      {/* Step pills */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-lg border p-4 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
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

          {/* Step 1: Venue & Date */}
          {step === 1 && (
            <Group title="Venue & Date" icon={MapPin}>
              <Field label="Venue / Location">
                <input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="e.g. Millennium Hall" className={inputCls} />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Assembly Date" icon={Calendar}>
                  <DatePicker value={form.assemblyDate} onChange={(val) => set("assemblyDate", val)} />
                </Field>
                <Field label="Event Date" icon={Calendar}>
                  <DatePicker value={form.eventDate} onChange={(val) => set("eventDate", val)} />
                </Field>
                <Field label="Dismantle Date" icon={Calendar}>
                  <DatePicker value={form.dismantleDate} onChange={(val) => set("dismantleDate", val)} />
                </Field>
              </div>
            </Group>
          )}

          {/* Step 2: Intake Requirements */}
          {step === 2 && (
            <Group title="Intake Requirements" icon={Wrench}>
              <Field label="Screen Specification (Text Description)">
                <input
                  value={form.itemServiceSpec}
                  onChange={(e) => set("itemServiceSpec", e.target.value)}
                  placeholder="e.g. 48sqm of P3.9 Outdoor LED panel"
                  className={inputCls}
                />
              </Field>

              <Field label="Intake Notes / Client Guidance" icon={MessageSquare}>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="e.g. Client wants wide stage setup, curve layout if possible."
                  rows={4}
                  className="h-auto w-full rounded-md border bg-[var(--surface-2)] p-3 text-[13px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
                  style={{ borderColor: "var(--border)" }}
                />
              </Field>
            </Group>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <Group title="Review & Confirm" icon={CheckCircle2}>
              <div className="space-y-1 rounded-md border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                {[
                  ["Client", form.client || "—"],
                  ["Contact", `${form.contactPerson || "—"} · ${form.contactPhone || "—"}`],
                  ["Venue", form.venue || "—"],
                  ["Assembly Date", form.assemblyDate || "—"],
                  ["Event Date", form.eventDate || "—"],
                  ["Dismantle Date", form.dismantleDate || "—"],
                  ["Required Spec", form.itemServiceSpec || "—"],
                  ["Intake Notes", form.notes || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b py-1.5 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                    <span className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{k}</span>
                    <span className="font-semibold text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: "var(--text-3)" }}>
                On confirm, the booking will be created with status <strong style={{ color: "var(--color-status-reserved)" }}>RESERVED</strong> (Draft). The Chief Technical Officer will review requirements and allocate specific inventory pools.
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

        <aside className="lg:col-span-4">
          <div className="sticky top-20 rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="label-eyebrow mb-3">Booking Preview</div>
            <div className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="font-mono text-[20px] font-bold" style={{ color: "var(--accent)" }}>SB-DRAFT</div>
              <div className="mt-1 text-[13px] font-semibold">{form.client || ""}</div>
              <div className="text-[11px]" style={{ color: "var(--text-2)" }}>{form.venue || ""}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-[11px]" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Assembly</div>
                  <div className="font-mono font-semibold">{form.assemblyDate || "—"}</div>
                </div>
                <div>
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Event</div>
                  <div className="font-mono font-semibold">{form.eventDate || "—"}</div>
                </div>
                <div className="col-span-2">
                  <div className="uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Required Spec</div>
                  <div className="font-semibold">{form.itemServiceSpec || "—"}</div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed" style={{ color: "var(--text-3)" }}>
              Initial intake gathers date and location requirements. Specific screen configuration and pricing will be allocated during technical review.
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
