import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import * as ImagePicker from "expo-image-picker";
import { AlertTriangle, Camera, CheckCircle2, ShieldAlert, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
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
import { uploadBookingAttachmentApi } from "@/services/attachments.api";
import { alpha, colors, radius } from "@/theme/tokens";

export default function DamageReportScreen() {
  const params = useLocalSearchParams<{ itemId?: string; bookingCode?: string }>();
  const {
    data: INVENTORY = [],
    isLoading: loadingInventory,
    isError: inventoryError,
  } = useInventory();
  const { data: BOOKINGS = [], isLoading: loadingBookings, isError: bookingsError } = useBookings();
  const createDamageReport = useCreateDamageReport();

  const [submitted, setSubmitted] = useState(false);
  const [itemId, setItemId] = useState(params.itemId ?? "");
  const [bookingCode, setBookingCode] = useState(params.bookingCode ?? "");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<"DAMAGE" | "MISSING">("DAMAGE");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Prefill from route params once inventory/bookings resolve (mirrors web inventory→damage CTA).
  useEffect(() => {
    if (params.itemId) {
      setItemId(params.itemId);
      return;
    }
    if (!itemId && INVENTORY[0]?.id) {
      setItemId(INVENTORY[0].id);
    }
  }, [INVENTORY, itemId, params.itemId]);

  useEffect(() => {
    if (params.bookingCode) setBookingCode(params.bookingCode);
  }, [params.bookingCode]);

  const handlePickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSubmitError("Photo library access is needed to attach damage photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    setAttachments((current) => {
      const existingUris = new Set(current.map((asset) => asset.uri));
      const additions = result.assets.filter((asset) => !existingUris.has(asset.uri));
      return [...current, ...additions];
    });
  };

  const removeAttachment = (uri: string) => {
    setAttachments((current) => current.filter((asset) => asset.uri !== uri));
  };

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
      const report = await createDamageReport.mutateAsync({
        bookingId: booking.id,
        poolId: item.poolId,
        itemId: item.itemId,
        reportType,
        quantity: item.poolId ? quantity : undefined,
        description,
      });

      // Upload any attached photos to the damage report
      if (attachments.length > 0 && report?.id) {
        const uploads = attachments.map(
          (asset) =>
            uploadBookingAttachmentApi(
              booking.id,
              {
                uri: asset.uri,
                name: asset.fileName || `damage_photo_${Date.now()}.jpg`,
                type: asset.type || "image/jpeg",
              },
              { relatedEntity: "damage_missing_report", relatedId: report.id },
            ).catch(() => null), // upload failures are non-fatal; don't block submission
        );
        await Promise.all(uploads);
      }

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
  const matchedBooking = BOOKINGS.find(
    (b) => b.code.trim().toUpperCase() === bookingCode.trim().toUpperCase(),
  );
  const canSubmit = !!matchedBooking && !!selectedItem;

  return (
    <Screen
      footer={
        <View style={{ gap: 8 }}>
          {submitError ? (
            <AppText variant="small" color={colors.destructive}>
              {submitError}
            </AppText>
          ) : null}
          <Button
            icon={ShieldAlert}
            disabled={createDamageReport.isPending || !canSubmit}
            onPress={handleSubmit}
          >
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
          {bookingCode.trim() ? (
            matchedBooking ? (
              <AppText variant="small" color={colors.success} style={{ marginTop: 6 }}>
                Linked to {matchedBooking.code} · {matchedBooking.client} · {matchedBooking.venue}
              </AppText>
            ) : (
              <AppText variant="small" color={colors.destructive} style={{ marginTop: 6 }}>
                No booking found with this code.
              </AppText>
            )
          ) : null}
        </Field>
        <Field label="Inventory item">
          <Input value={itemId} onChangeText={setItemId} placeholder="Item ID / SKU" />
          {itemId.trim() ? (
            selectedItem ? (
              <AppText variant="small" color={colors.success} style={{ marginTop: 6 }}>
                {selectedItem.name} · {selectedItem.model}
              </AppText>
            ) : (
              <AppText variant="small" color={colors.destructive} style={{ marginTop: 6 }}>
                No inventory item found with this ID.
              </AppText>
            )
          ) : null}
        </Field>
        {selectedItem?.poolId ? (
          <Field label="Affected quantity">
            <Input value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          </Field>
        ) : null}
      </Section>
      <Section title="Incident details" icon={AlertTriangle}>
        <Field label="Report type">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["DAMAGE", "MISSING"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setReportType(type)}
                style={[styles.typeChip, reportType === type ? styles.typeChipActive : null]}
              >
                <AppText
                  variant="small"
                  color={reportType === type ? colors.destructive : colors.text2}
                  style={{ fontWeight: "800" }}
                >
                  {type === "DAMAGE" ? "Damaged" : "Missing"}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Field>
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
          Select as many photos as you need, one at a time or all together.
        </AppText>
        <Button variant="outline" onPress={handlePickPhotos}>
          {attachments.length > 0 ? "Add More Photos" : "Choose Photos"}
        </Button>
        {attachments.length > 0 ? (
          <View style={styles.attachmentGrid}>
            {attachments.map((asset) => (
              <View key={asset.uri} style={styles.attachmentTile}>
                <Image source={{ uri: asset.uri }} style={styles.attachmentImage} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => removeAttachment(asset.uri)}
                  style={styles.attachmentRemove}
                >
                  <X size={13} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {attachments.length > 0 ? (
          <AppText variant="small" color={colors.payment.ADVANCE}>
            {attachments.length} photo{attachments.length === 1 ? "" : "s"} attached — will upload
            when you submit the report.
          </AppText>
        ) : null}
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
  attachmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  attachmentTile: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentImage: {
    width: "100%",
    height: "100%",
  },
  attachmentRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: radius.round,
    backgroundColor: alpha(colors.black, 0.6),
    alignItems: "center",
    justifyContent: "center",
  },
  successCard: {
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface2,
  },
  typeChipActive: {
    borderColor: colors.destructive,
    backgroundColor: "rgba(229,72,77,0.12)",
  },
});
