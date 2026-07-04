import { router } from "expo-router";
import { to } from "@/utils/routes";
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  Package,
  PackageCheck,
  Printer,
  Truck,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBadge } from "@/components/status";
import {
  AppText,
  Button,
  Card,
  Field,
  Input,
  KV,
  ProgressBar,
  Screen,
  Section,
  TextArea,
} from "@/components/ui";
import { BOOKINGS } from "@/data/mock";
import { colors, radius } from "@/theme/tokens";

type Mode = "checkout" | "checkin";

export default function CheckoutScreen() {
  const [mode, setMode] = useState<Mode>("checkout");
  const [selectedCode, setSelectedCode] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const eligibleBookings = useMemo(
    () =>
      mode === "checkout"
        ? BOOKINGS.filter(
            (booking) => booking.status === "PREPARATION" || booking.status === "ACCEPTED",
          )
        : BOOKINGS.filter(
            (booking) => booking.status === "COMPLETED" || booking.status === "ONSITE",
          ),
    [mode],
  );
  const selected = eligibleBookings.find((booking) => booking.code === selectedCode);

  const toggleItem = (id: string) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => {
    setSelectedCode("");
    setCheckedItems(new Set());
    setSubmitted(false);
  };

  if (submitted && selected) {
    return (
      <Screen>
        <Card style={styles.successCard}>
          <CheckCircle2 size={48} color={colors.success} />
          <AppText variant="title" style={{ textAlign: "center", fontSize: 22 }}>
            {mode === "checkout" ? "Material Check-Out Completed" : "Material Check-In Completed"}
          </AppText>
          <AppText variant="subtitle" style={{ textAlign: "center" }}>
            {checkedItems.size} items {mode === "checkout" ? "checked out" : "checked in"} for
            booking {selected.code}.
          </AppText>
          <Button onPress={reset}>Process Another</Button>
          <Button variant="outline" onPress={() => router.push(to(`/bookings/${selected.code}`))}>
            View Booking
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        selected ? (
          <View style={{ gap: 8 }}>
            <Button
              icon={mode === "checkout" ? Truck : PackageCheck}
              disabled={checkedItems.size === 0}
              variant={mode === "checkout" ? "primary" : "success"}
              onPress={() => setSubmitted(true)}
            >
              {mode === "checkout" ? "Confirm Check-Out" : "Confirm Check-In"}
            </Button>
            <Button variant="outline" icon={Printer}>
              Print Packing Slip
            </Button>
          </View>
        ) : null
      }
    >
      <View>
        <AppText variant="eyebrow">Warehouse Operations</AppText>
        <AppText variant="title">Material Check-In / Check-Out</AppText>
      </View>
      <View style={styles.modeGrid}>
        <ModeCard
          mode="checkout"
          active={mode === "checkout"}
          onPress={() => {
            setMode("checkout");
            setSelectedCode("");
            setCheckedItems(new Set());
          }}
        />
        <ModeCard
          mode="checkin"
          active={mode === "checkin"}
          onPress={() => {
            setMode("checkin");
            setSelectedCode("");
            setCheckedItems(new Set());
          }}
        />
      </View>
      {!selected ? (
        <Section
          title={mode === "checkout" ? "Check-Out Process" : "Check-In Process"}
          icon={ClipboardCheck}
        >
          {(mode === "checkout"
            ? [
                "Select the booking to process",
                "Count and verify each BOM item",
                "Check off each verified item",
                "Enter responsible party",
                "Submit to register materials out",
              ]
            : [
                "Select the booking to process",
                "Count and verify each returned item",
                "Check off each verified item",
                "Note any missing or damaged items",
                "Submit to register materials in",
              ]
          ).map((step, index) => (
            <View key={step} style={styles.processStep}>
              <View style={styles.processIndex}>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {index + 1}
                </AppText>
              </View>
              <AppText style={{ flex: 1 }}>{step}</AppText>
            </View>
          ))}
        </Section>
      ) : null}
      <Section title="Select Booking" icon={ClipboardCheck}>
        {eligibleBookings.map((booking) => (
          <Pressable
            key={booking.code}
            onPress={() => {
              setSelectedCode(booking.code);
              setCheckedItems(new Set());
            }}
            style={[
              styles.bookingOption,
              selectedCode === booking.code ? styles.bookingOptionActive : null,
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                {booking.code}
              </AppText>
              <AppText style={{ fontWeight: "800" }}>{booking.client}</AppText>
              <AppText variant="small" color={colors.text2}>
                {booking.venue} · {booking.eventDate}
              </AppText>
            </View>
            <StatusBadge status={booking.status} />
          </Pressable>
        ))}
      </Section>
      {selected ? (
        <>
          <Section
            title="Bill of Materials — Verify Each Item"
            icon={Package}
            action={
              <Button
                variant="ghost"
                onPress={() => setCheckedItems(new Set(selected.bomItems.map((item) => item.id)))}
              >
                Check All
              </Button>
            }
          >
            {selected.bomItems.map((item) => {
              const checked = checkedItems.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleItem(item.id)}
                  style={[styles.bomRow, checked ? styles.bomRowChecked : null]}
                >
                  <View style={[styles.checkbox, checked ? styles.checkboxChecked : null]}>
                    {checked ? (
                      <Check
                        size={15}
                        color={mode === "checkout" ? colors.accentForeground : colors.white}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                      {item.id}
                    </AppText>
                    <AppText>{item.name}</AppText>
                  </View>
                  <AppText variant="data" style={{ fontWeight: "900" }}>
                    {item.qty}
                  </AppText>
                </Pressable>
              );
            })}
            <KV
              label="Verified"
              value={`${checkedItems.size} of ${selected.bomItems.length} items`}
            />
            <ProgressBar
              value={(checkedItems.size / selected.bomItems.length) * 100}
              tone={mode === "checkout" ? colors.accent : colors.success}
            />
          </Section>
          <Section title="Responsible Party" icon={ClipboardCheck}>
            <Field label={mode === "checkout" ? "Checked out by" : "Received by"}>
              <Input defaultValue="Selam Worku" />
            </Field>
            <Field label="Timestamp">
              <Input defaultValue={new Date().toISOString().slice(0, 16)} />
            </Field>
            {mode === "checkin" ? (
              <Field label="Return Notes">
                <TextArea placeholder="Note any missing or damaged items..." />
              </Field>
            ) : null}
          </Section>
          <Section title="Booking Summary" icon={ClipboardCheck}>
            <KV label="Code" value={selected.code} mono />
            <KV label="Client" value={selected.client} />
            <KV label="Venue" value={selected.venue} />
            <KV label="Event" value={selected.eventDate} mono />
            <KV label="BOM Items" value={selected.bomItems.length} mono />
            <KV
              label="Total Units"
              value={selected.bomItems.reduce((sum, item) => sum + item.qty, 0)}
              mono
            />
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function ModeCard({ mode, active, onPress }: { mode: Mode; active: boolean; onPress: () => void }) {
  const checkout = mode === "checkout";
  const tone = checkout ? colors.accent : colors.success;
  const Icon = checkout ? Truck : PackageCheck;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeCard, active ? { borderColor: tone, backgroundColor: `${tone}14` } : null]}
    >
      <View style={[styles.modeIcon, active ? { backgroundColor: tone } : null]}>
        <Icon
          size={20}
          color={active ? (checkout ? colors.accentForeground : colors.white) : colors.text2}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: "900" }}>{checkout ? "Check-Out" : "Check-In"}</AppText>
        <AppText variant="small" color={colors.text2}>
          {checkout
            ? "Materials leaving warehouse for a job"
            : "Materials returning from a completed job"}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeGrid: {
    gap: 10,
  },
  modeCard: {
    minHeight: 78,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  modeIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingOption: {
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  bookingOptionActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.08)",
  },
  bomRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    opacity: 0.72,
  },
  bomRowChecked: {
    opacity: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  successCard: {
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  processStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  processIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
