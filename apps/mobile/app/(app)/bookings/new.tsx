import { router } from "expo-router";
import { to } from "@/utils/routes";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  MessageSquare,
  Phone,
  Save,
  User,
  Wrench,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  DatePickerInput,
  Field,
  Input,
  Screen,
  Section,
  SegmentedTabs,
  TextArea,
} from "@/components/ui";
import { alpha, colors, radius } from "@/theme/tokens";
import { useCreateBooking, useCustomFieldDefinitions } from "@/hooks/useOperations";

const STEPS = ["Client", "Venue & Date", "Intake Requirements", "Review"] as const;

type BookingDraft = {
  client: string;
  contactPerson: string;
  contactPhone: string;
  venue: string;
  assemblyDate: string;
  eventDate: string;
  dismantleDate: string;
  rentedDays: number;
  arrangement: string;
  size: string;
  notes: string;
};

export default function NewBookingScreen() {
  const [step, setStep] = useState<(typeof STEPS)[number]>("Client");
  const index = STEPS.indexOf(step);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createBooking = useCreateBooking();
  const { data: customFields = [] } = useCustomFieldDefinitions();
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState<BookingDraft>({
    client: "",
    contactPerson: "",
    contactPhone: "",
    venue: "",
    assemblyDate: "",
    eventDate: "",
    dismantleDate: "",
    rentedDays: 1,
    arrangement: "",
    size: "",
    notes: "",
  });

  const set = <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const setCustom = (key: string, value: unknown) =>
    setCustomValues((prev) => ({ ...prev, [key]: value }));

  const now = new Date();
  const assemblyDateValue = form.assemblyDate ? new Date(form.assemblyDate) : now;

  /** Mirrors web's NewBookingPage getStepErrors — blocks Continue until the step is valid. */
  function getStepErrors(current: (typeof STEPS)[number]): string[] {
    const errors: string[] = [];
    if (current === "Client") {
      if (!form.client.trim()) errors.push("Client / Organization is required.");
      if (/[a-zA-Z]/.test(form.contactPhone)) {
        errors.push("Phone number cannot contain letters.");
      }
    }
    if (current === "Venue & Date") {
      if (!form.venue.trim()) errors.push("Venue / Location is required.");
      if (!form.assemblyDate) {
        errors.push("Assembly Date is required.");
      } else if (new Date(form.assemblyDate) < new Date(new Date().toDateString())) {
        errors.push("Assembly Date cannot be in the past.");
      }
      if (!form.eventDate) {
        errors.push("Event Date is required.");
      } else if (form.assemblyDate && new Date(form.eventDate) < new Date(form.assemblyDate)) {
        errors.push("Event Date cannot be earlier than Assembly Date.");
      }
      if (!form.dismantleDate) {
        errors.push("Dismantle Date is required.");
      } else if (form.assemblyDate && new Date(form.dismantleDate) < new Date(form.assemblyDate)) {
        errors.push("Dismantle Date cannot be earlier than Assembly Date.");
      }
      if (!form.rentedDays || form.rentedDays < 1) {
        errors.push("Number of Days must be at least 1.");
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
        dismantleDate: form.dismantleDate,
        rentedDays: form.rentedDays,
        arrangement: form.arrangement,
        size: form.size,
        notes: form.notes,
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
            <DatePickerInput
              value={form.assemblyDate}
              onChangeText={(value) => set("assemblyDate", value)}
              mode="datetime"
              placeholder="Select assembly date"
              minimumDate={now}
            />
          </Field>
          <Field label="Event Date" icon={Calendar}>
            <DatePickerInput
              value={form.eventDate}
              onChangeText={(value) => set("eventDate", value)}
              mode="datetime"
              placeholder="Select event date"
              minimumDate={assemblyDateValue}
            />
          </Field>
          <Field label="Dismantle Date" icon={Calendar}>
            <DatePickerInput
              value={form.dismantleDate}
              onChangeText={(value) => set("dismantleDate", value)}
              mode="datetime"
              placeholder="Select dismantle date"
              minimumDate={assemblyDateValue}
            />
          </Field>
          <Field label="Number of Days">
            <Input
              value={String(form.rentedDays)}
              keyboardType="numeric"
              onChangeText={(value) => set("rentedDays", Number(value) || 0)}
            />
          </Field>
          <AppText variant="small" color={colors.text3}>
            Billable rental days for pricing. Independent of the assembly / event / dismantle
            window.
          </AppText>
        </Section>
      ) : null}

      {step === "Intake Requirements" ? (
        <Section title="Intake Requirements" icon={Wrench}>
          <Field label="Screen Size (sqm)">
            <Input
              value={form.size}
              keyboardType="numeric"
              onChangeText={(value) => set("size", value)}
              placeholder="e.g. 48"
            />
          </Field>
          <Field label="Arrangement / Screen Spec">
            <Input
              value={form.arrangement}
              onChangeText={(value) => set("arrangement", value)}
              placeholder="e.g. P3.9 Outdoor · 6×8 wall"
            />
          </Field>
          <Field label="Intake Notes / Client Guidance" icon={MessageSquare}>
            <TextArea
              value={form.notes}
              onChangeText={(value) => set("notes", value)}
              placeholder="e.g. Client wants wide stage setup, curve layout if possible."
            />
          </Field>
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
                        const raw = customValues[field.key];
                        const selected = Array.isArray(raw)
                          ? raw.map((v) => String(v))
                          : typeof raw === "string" && raw
                            ? raw
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                            : [];
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
                              setCustom(field.key, next);
                            }}
                          />
                        );
                      })}
                    </View>
                  ) : field.type === "date" ? (
                    <DatePickerInput
                      value={String(customValues[field.key] ?? "")}
                      onChangeText={(value) => setCustom(field.key, value)}
                      placeholder="Select date"
                    />
                  ) : field.type === "number" ? (
                    <Input
                      value={String(customValues[field.key] ?? "")}
                      onChangeText={(value) => setCustom(field.key, value)}
                      placeholder={field.name}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Input
                      value={String(customValues[field.key] ?? "")}
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
            ["Venue", form.venue || "-"],
            ["Assembly Date", form.assemblyDate || "-"],
            ["Event Date", form.eventDate || "-"],
            ["Dismantle Date", form.dismantleDate || "-"],
            ["Number of Days", String(form.rentedDays)],
            ["Screen Size (sqm)", form.size ? `${form.size} sqm` : "-"],
            ["Arrangement / Screen Spec", form.arrangement || "-"],
            ["Intake Notes", form.notes || "-"],
          ].map(([label, value]) => (
            <Field key={label} label={label}>
              <Input editable={false} value={value} />
            </Field>
          ))}
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
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.choice, active ? styles.choiceActive : null]}
    >
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
    backgroundColor: alpha(colors.accent, 0.1),
  },
});
