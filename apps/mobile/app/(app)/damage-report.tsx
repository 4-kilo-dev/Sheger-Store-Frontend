import { router } from "expo-router";
import { to } from "@/utils/routes";
import { AlertTriangle, Camera, CheckCircle2, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  BackLink,
  Button,
  Card,
  Field,
  Input,
  Screen,
  Section,
  TextArea,
} from "@/components/ui";
import { INVENTORY } from "@/data/mock";
import { colors } from "@/theme/tokens";

export default function DamageReportScreen() {
  const [submitted, setSubmitted] = useState(false);
  const [itemId, setItemId] = useState(INVENTORY[0]?.id ?? "");

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

  return (
    <Screen
      footer={
        <Button icon={ShieldAlert} onPress={() => setSubmitted(true)}>
          Submit Damage Report
        </Button>
      }
    >
      <BackLink label="Back to Inventory" href="/inventory" />
      <View>
        <AppText variant="eyebrow">Warehouse Incident</AppText>
        <AppText variant="title">Report Equipment Damage</AppText>
      </View>
      <Section title="Equipment identification" icon={ShieldAlert}>
        <Field label="Inventory item">
          <Input value={itemId} onChangeText={setItemId} />
        </Field>
        <Field label="Affected quantity">
          <Input defaultValue="1" keyboardType="numeric" />
        </Field>
        <Field label="Serial numbers / unit references">
          <Input placeholder="e.g. PNL-P297-01-004, -008" />
        </Field>
      </Section>
      <Section title="Incident details" icon={AlertTriangle}>
        <Field label="Damage severity">
          <Input defaultValue="Minor · usable with caution" />
        </Field>
        <Field label="Where discovered?">
          <Input defaultValue="Warehouse inspection" />
        </Field>
        <Field label="Description">
          <TextArea placeholder="Describe visible damage, symptoms, and circumstances..." />
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
