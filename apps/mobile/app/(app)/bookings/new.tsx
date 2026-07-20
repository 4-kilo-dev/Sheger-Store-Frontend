import { router } from "expo-router";
import { to } from "@/utils/routes";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Save,
  User,
  Users,
  Wrench,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  Field,
  Input,
  Screen,
  Section,
  SegmentedTabs,
  TextArea,
} from "@/components/ui";
import { colors, radius } from "@/theme/tokens";
import { formatCurrency } from "@/utils/format";
import { useCreateBooking, useCustomFieldDefinitions } from "@/hooks/useOperations";

const STEPS = [
  "Client",
  "CTO Consult",
  "Venue & Date",
  "Screen Spec",
  "Team",
  "Payment",
  "Review",
] as const;
const screenTypes = ["P2.97", "P4", "P5", "P2.97-New", "P3.91 INDOOR", "P3.91 OUTDOOR"] as const;

type BookingDraft = {
  client: string;
  contactPerson: string;
  contactPhone: string;
  ctoConsulted: boolean;
  ctoNotes: string;
  ctoArrangement: string;
  venue: string;
  assemblyDate: string;
  eventDate: string;
  screenType: string;
  size: number;
  arrangement: string;
  chief: string;
  technician: string;
  stageHand: string;
  amount: number;
  paymentTerms: string;
};

export default function NewBookingScreen() {
  const [step, setStep] = useState<(typeof STEPS)[number]>("Client");
  const index = STEPS.indexOf(step);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createBooking = useCreateBooking();
  const { data: customFields = [] } = useCustomFieldDefinitions();
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState<BookingDraft>({
    client: "",
    contactPerson: "",
    contactPhone: "",
    ctoConsulted: false,
    ctoNotes: "",
    ctoArrangement: "",
    venue: "",
    assemblyDate: "",
    eventDate: "",
    screenType: "P4",
    size: 36,
    arrangement: "6M x 3M",
    chief: "",
    technician: "",
    stageHand: "TEAM 1 · Abel",
    amount: 75000,
    paymentTerms: "ADVANCE",
  });

  const set = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const setCustom = (key: string, value: string) =>
    setCustomValues((prev) => ({ ...prev, [key]: value }));

  /** Mirrors web's NewBookingPage getStepErrors — blocks Continue until the step is valid. */
  function getStepErrors(current: (typeof STEPS)[number]): string[] {
    const errors: string[] = [];
    if (current === "Client") {
      if (!form.client.trim()) errors.push("Client name is required.");
      if (form.contactPhone && /[a-zA-Z]/.test(form.contactPhone)) {
        errors.push("Phone number cannot contain letters.");
      }
    }
    if (current === "Venue & Date") {
      if (!form.venue.trim()) errors.push("Venue is required.");
      if (!form.assemblyDate) errors.push("Assembly date is required.");
      if (!form.eventDate) errors.push("Event date is required.");
      if (form.assemblyDate && new Date(form.assemblyDate) < new Date(new Date().toDateString())) {
        errors.push("Assembly date cannot be in the past.");
      }
      if (
        form.assemblyDate &&
        form.eventDate &&
        new Date(form.eventDate) < new Date(form.assemblyDate)
      ) {
        errors.push("Event date must be on or after the assembly date.");
      }
    }
    return errors;
  }

  const stepErrors = getStepErrors(step);
  const canContinue = stepErrors.length === 0;

  const handleCreateBooking = async () => {
    setSubmitError(null);
    try {
      const booking = await createBooking.mutateAsync({
        client: form.client,
        contactPerson: form.contactPerson,
        contactPhone: form.contactPhone,
        venue: form.venue,
        assemblyDate: form.assemblyDate,
        eventDate: form.eventDate,
        screenType: form.screenType,
        size: form.size,
        arrangement: form.arrangement,
        amount: form.amount,
        paymentTerms: form.paymentTerms as "UNPAID" | "ADVANCE" | "PAID",
        ctoNotes: form.ctoNotes || form.ctoArrangement,
        customValues,
      });
      router.push(to(`/bookings/${booking.code}`));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create booking.");
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footerActions}>
          <Button
            variant="outline"
            disabled={index === 0}
            onPress={() => setStep(STEPS[Math.max(0, index - 1)])}
          >
            Previous
          </Button>
          {index < STEPS.length - 1 ? (
            <Button
              disabled={!canContinue}
              onPress={() => setStep(STEPS[Math.min(STEPS.length - 1, index + 1)])}
            >
              Continue
            </Button>
          ) : (
            <Button
              icon={Save}
              disabled={createBooking.isPending || !canContinue}
              onPress={handleCreateBooking}
            >
              {createBooking.isPending ? "Creating..." : "Confirm & Create Booking"}
            </Button>
          )}
        </View>
      }
    >
      <Button variant="ghost" onPress={() => router.push(to("/bookings"))}>
        Cancel & return to Bookings
      </Button>
      <View>
        <SegmentedTabs
          tabs={STEPS}
          value={step}
          onChange={(next) => STEPS.indexOf(next) <= index && setStep(next)}
        />
      </View>

      {stepErrors.length > 0 ? (
        <View style={{ gap: 4 }}>
          {stepErrors.map((err) => (
            <AppText key={err} variant="small" color={colors.destructive}>
              {err}
            </AppText>
          ))}
        </View>
      ) : null}

      {step === "Client" ? (
        <Section title="Client Information" icon={Building2}>
          <Field label="Client / Organization">
            <Input
              value={form.client}
              onChangeText={(value) => set("client", value)}
              placeholder="e.g. Sheraton Addis"
            />
          </Field>
          <Field label="Contact Person" icon={User}>
            <Input
              value={form.contactPerson}
              onChangeText={(value) => set("contactPerson", value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Phone" icon={Phone}>
            <Input
              value={form.contactPhone}
              onChangeText={(value) => set("contactPhone", value)}
              placeholder="+251 9.. ... ...."
              keyboardType="phone-pad"
            />
          </Field>
        </Section>
      ) : null}

      {step === "CTO Consult" ? (
        <Section title="CTO Consultation" icon={Wrench}>
          <View style={styles.sopBox}>
            <Wrench size={16} color={colors.accent} />
            <Field label="SOP §1.2 — Consult Chief Technical Officer">
              <Input
                editable={false}
                value="Confirm screen availability for requested dates and get arrangement guidance."
              />
            </Field>
          </View>
          <Field label="Screen Availability (units available)">
            <View style={styles.optionGrid}>
              {[
                ["P2.97", 128],
                ["P4", 20],
                ["P3.91 INDOOR", 72],
                ["P3.91 OUTDOOR", 72],
                ["P2.97-New", 128],
                ["P5", 48],
              ].map(([type, available]) => (
                <View key={type} style={styles.availabilityCard}>
                  <Input editable={false} value={`${type}`} />
                  <Input editable={false} value={`${available} panels`} />
                </View>
              ))}
            </View>
          </Field>
          <Field label="CTO Arrangement Suggestions" icon={MessageSquare}>
            <TextArea
              value={form.ctoArrangement}
              onChangeText={(value) => set("ctoArrangement", value)}
              placeholder="CTO arrangement notes..."
            />
          </Field>
          <Field label="CTO Notes / Special Guidance">
            <TextArea
              value={form.ctoNotes}
              onChangeText={(value) => set("ctoNotes", value)}
              placeholder="Backup PSU, converters, rigging notes..."
            />
          </Field>
          <Button
            variant={form.ctoConsulted ? "success" : "outline"}
            icon={CheckCircle2}
            onPress={() => set("ctoConsulted", !form.ctoConsulted)}
          >
            CTO Consultation Completed
          </Button>
        </Section>
      ) : null}

      {step === "Venue & Date" ? (
        <Section title="Venue & Date" icon={MapPin}>
          <Field label="Venue / Location">
            <Input
              value={form.venue}
              onChangeText={(value) => set("venue", value)}
              placeholder="e.g. Millennium Hall"
            />
          </Field>
          <Field label="Assembly Date" icon={Calendar}>
            <Input
              value={form.assemblyDate}
              onChangeText={(value) => set("assemblyDate", value)}
              placeholder="YYYY-MM-DD"
            />
          </Field>
          <Field label="Event Date" icon={Calendar}>
            <Input
              value={form.eventDate}
              onChangeText={(value) => set("eventDate", value)}
              placeholder="YYYY-MM-DD"
            />
          </Field>
        </Section>
      ) : null}

      {step === "Screen Spec" ? (
        <Section title="Screen Specification" icon={Package}>
          <Field label="Screen Type">
            <View style={styles.choiceWrap}>
              {screenTypes.map((type) => (
                <Choice
                  key={type}
                  label={type}
                  active={form.screenType === type}
                  onPress={() => set("screenType", type)}
                />
              ))}
            </View>
          </Field>
          <Field label="Size (sqm)">
            <Input
              value={String(form.size)}
              keyboardType="numeric"
              onChangeText={(value) => set("size", Number(value) || 0)}
            />
          </Field>
          <Field label="Arrangement (W x H)">
            <Input value={form.arrangement} onChangeText={(value) => set("arrangement", value)} />
          </Field>
        </Section>
      ) : null}

      {step === "Team" ? (
        <Section title="Team Assignment" icon={Users}>
          <Field label="Chief Technician">
            <Input
              value={form.chief}
              onChangeText={(value) => set("chief", value)}
              placeholder="Bereket Alemu"
            />
          </Field>
          <Field label="Technician">
            <Input
              value={form.technician}
              onChangeText={(value) => set("technician", value)}
              placeholder="Yeabtsega"
            />
          </Field>
          <Field label="Stage Hand Team">
            <Input value={form.stageHand} onChangeText={(value) => set("stageHand", value)} />
          </Field>
        </Section>
      ) : null}

      {step === "Payment" ? (
        <Section title="Payment Terms" icon={DollarSign}>
          <Field label="Total Contract Value (ETB)">
            <Input
              value={String(form.amount)}
              keyboardType="numeric"
              onChangeText={(value) => set("amount", Number(value) || 0)}
            />
          </Field>
          <Field label="Initial Status">
            <View style={styles.choiceWrap}>
              {["UNPAID", "ADVANCE", "PAID"].map((status) => (
                <Choice
                  key={status}
                  label={status}
                  active={form.paymentTerms === status}
                  onPress={() => set("paymentTerms", status)}
                />
              ))}
            </View>
          </Field>
        </Section>
      ) : null}

      {step === "Review" ? (
        <Section title="Review & Confirm" icon={CheckCircle2}>
          {submitError ? (
            <AppText variant="small" color={colors.destructive}>
              {submitError}
            </AppText>
          ) : null}
          {[
            ["Client", form.client || "-"],
            ["Contact", `${form.contactPerson || "-"} · ${form.contactPhone || "-"}`],
            ["CTO Consulted", form.ctoConsulted ? "Yes" : "Pending"],
            ["CTO Notes", form.ctoNotes || form.ctoArrangement || "-"],
            ["Venue", form.venue || "-"],
            ["Assembly", form.assemblyDate || "-"],
            ["Event", form.eventDate || "-"],
            ["Screen", `${form.screenType} · ${form.size} sqm · ${form.arrangement}`],
            ["Team", `${form.chief || "?"} / ${form.technician || "?"} · ${form.stageHand}`],
            ["Contract", `${formatCurrency(form.amount)} (${form.paymentTerms})`],
          ].map(([label, value]) => (
            <Field key={label} label={label}>
              <Input editable={false} value={value} />
            </Field>
          ))}
          {customFields.length > 0 ? (
            <Section title="Custom Fields" icon={ClipboardCheck}>
              {customFields.map((field) => (
                <Field key={field.id} label={field.name}>
                  {field.type === "boolean" ? (
                    <View style={styles.choiceWrap}>
                      <Choice
                        label="Yes"
                        active={customValues[field.key] === "true"}
                        onPress={() => setCustom(field.key, "true")}
                      />
                      <Choice
                        label="No"
                        active={customValues[field.key] === "false"}
                        onPress={() => setCustom(field.key, "false")}
                      />
                    </View>
                  ) : field.type === "enum" && field.options && field.options.length > 0 ? (
                    <View style={styles.choiceWrap}>
                      {field.options.map((opt) => (
                        <Choice
                          key={opt}
                          label={opt}
                          active={customValues[field.key] === opt}
                          onPress={() => setCustom(field.key, opt)}
                        />
                      ))}
                    </View>
                  ) : field.type === "multi_select" && field.options && field.options.length > 0 ? (
                    <View style={styles.choiceWrap}>
                      {field.options.map((opt) => {
                        const selected = (customValues[field.key] || "").split(",").filter(Boolean);
                        const active = selected.includes(opt);
                        return (
                          <Choice
                            key={opt}
                            label={opt}
                            active={active}
                            onPress={() => {
                              const next = active
                                ? selected.filter((v) => v !== opt)
                                : [...selected, opt];
                              setCustom(field.key, next.join(","));
                            }}
                          />
                        );
                      })}
                    </View>
                  ) : field.type === "date" ? (
                    <Input
                      value={customValues[field.key] || ""}
                      onChangeText={(value) => setCustom(field.key, value)}
                      placeholder="YYYY-MM-DD"
                    />
                  ) : field.type === "number" ? (
                    <Input
                      value={customValues[field.key] || ""}
                      onChangeText={(value) => setCustom(field.key, value)}
                      placeholder={field.name}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Input
                      value={customValues[field.key] || ""}
                      onChangeText={(value) => setCustom(field.key, value)}
                      placeholder={field.name}
                    />
                  )}
                </Field>
              ))}
            </Section>
          ) : null}
        </Section>
      ) : null}
    </Screen>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active ? styles.choiceActive : null]}>
      <AppText
        variant="data"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "900", textAlign: "center" }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footerActions: {
    flexDirection: "row",
    gap: 10,
  },
  sopBox: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    backgroundColor: "rgba(245,183,49,0.06)",
    padding: 12,
    gap: 8,
  },
  optionGrid: {
    gap: 8,
  },
  availabilityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 8,
    gap: 8,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    minWidth: "47%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  choiceActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.10)",
  },
});
