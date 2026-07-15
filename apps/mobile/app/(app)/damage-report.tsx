import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import { AlertTriangle, Camera, CheckCircle2, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  BackLink,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  Section,
  TextArea,
} from "@/components/ui";
import { useBookings, useCreateDamageReport, useInventory } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";

export default function DamageReportScreen() {
  const params = useLocalSearchParams<{ itemId?: string }>();
  const {
    data: INVENTORY = [],
    isLoading: loadingInventory,
    isError: inventoryError,
  } = useInventory();
  const { data: BOOKINGS = [], isLoading: loadingBookings, isError: bookingsError } = useBookings();
  const createDamageReport = useCreateDamageReport();

  const [submitted, setSubmitted] = useState(false);
  const [itemId, setItemId] = useState(params.itemId ?? INVENTORY[0]?.id ?? "");
  const [bookingCode, setBookingCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loadingInventory || loadingBookings) {
    return (
      <Screen>
        <LoadingState label="Loading inventory..." />
      </Screen>
    );
  }

  if (inventoryError || bookingsError) {
    return (
      <Screen>
        <ErrorState detail="Could not load data needed for a damage report." />
      </Screen>
    );
  }

  const handleSubmit = async () => {
    setSubmitError(null);
    const booking = BOOKINGS.find((b) => b.code === bookingCode);
    const item = INVENTORY.find((i) => i.id === itemId);
    if (!booking) {
      setSubmitError("Enter a valid booking code this damage relates to.");
      return;
    }
    if (!item) {
      setSubmitError("Select a valid inventory item.");
      return;
    }
    try {
      await createDamageReport.mutateAsync({
        bookingId: booking.code,
        poolId: item.poolId,
        itemId: item.itemId,
        reportType: "DAMAGE",
        quantity: item.poolId ? quantity : undefined,
        description,
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit damage report.");
    }
  };

  if (submitted) {
    return (
      <Screen>
        <Card style={styles.successCard}>
          <CheckCircle2 size={46} color={colors.success} />
          <AppText variant="title" style={{ textAlign: "center" }}>
            Damage report submitted
          </AppText>
          <AppText variant="subtitle" style={{ textAlign: "center" }}>
            The affected units are now marked for inspection. The Storekeeper and Chief Technician
            have been notified.
          </AppText>
          <Button onPress={() => router.push(to("/inventory"))}>Return to Inventory</Button>
        </Card>
      </Screen>
    );
  }

  const selectedItem = INVENTORY.find((i) => i.id === itemId);

  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          {submitError ? (
            <AppText variant="small" color={colors.destructive}>
              {submitError}
            </AppText>
          ) : null}
          <Button icon={ShieldAlert} disabled={createDamageReport.isPending} onPress={handleSubmit}>
            {createDamageReport.isPending ? "Submitting..." : "Submit Damage Report"}
          </Button>
        </View>
      }
    >
      <BackLink label="Back to Inventory" href="/inventory" />
      <View>
        <AppText variant="eyebrow">Warehouse Incident</AppText>
        <AppText variant="title">Report Equipment Damage</AppText>
      </View>
      <Section title="Equipment identification" icon={ShieldAlert}>
        <Field label="Booking code this relates to">
          <Input
            value={bookingCode}
            onChangeText={setBookingCode}
            placeholder="e.g. SB047"
            autoCapitalize="characters"
          />
        </Field>
        <Field label="Inventory item">
          <Input value={itemId} onChangeText={setItemId} placeholder="Item ID / SKU" />
        </Field>
        {selectedItem?.poolId ? (
          <Field label="Affected quantity">
            <Input value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </Field>
        ) : null}
      </Section>
      <Section title="Incident details" icon={AlertTriangle}>
        <Field label="Damage severity">
          <Input defaultValue="Minor · usable with caution" />
        </Field>
        <Field label="Where discovered?">
          <Input defaultValue="Warehouse inspection" />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChangeText={setDescription}
            placeholder="Describe visible damage, symptoms, and circumstances..."
          />
        </Field>
      </Section>
      <Card style={styles.upload}>
        <Camera size={28} color={colors.text3} />
        <AppText style={{ fontWeight: "900" }}>Attach damage photos</AppText>
        <AppText variant="small" color={colors.text3}>
          JPG or PNG · up to 10 MB each
        </AppText>
        <Button variant="outline">Choose Files</Button>
      </Card>
      <Section title="Submission impact" icon={AlertTriangle}>
        {[
          "Units will be placed on inspection hold.",
          "Available stock will update immediately.",
          "Storekeeper and Chief Technician will be notified.",
          "A repair task will be opened for major damage.",
        ].map((item) => (
          <AppText key={item} variant="subtitle">
            {item}
          </AppText>
        ))}
      </Section>
      <Button variant="ghost" onPress={() => router.push(to("/inventory"))}>
        Cancel
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  upload: {
    borderStyle: "dashed",
    alignItems: "center",
    padding: 24,
    gap: 8,
  },
  successCard: {
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
});
