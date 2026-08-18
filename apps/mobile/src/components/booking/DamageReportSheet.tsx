import { useMemo } from "react";
import * as ImagePicker from "expo-image-picker";
import { Camera, Paperclip, X } from "lucide-react-native";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  AppText,
  BottomSheet,
  Button,
  Field,
  Input,
  TextArea,
} from "@/components/ui";
import type { BookingActions } from "@/hooks/useBookingActions";
import type { Booking } from "@/types/domain";
import { colors, radius } from "@/theme/tokens";

const MAX_ATTACHMENTS = 10;

interface EquipmentOption {
  key: string;
  label: string;
  quantity: number;
}

interface DamageReportSheetProps {
  booking: Booking;
  checkoutSnapshot: {
    lines?: Array<{
      poolId?: string;
      itemId?: string;
      quantity?: string | number;
      item?: { name?: string };
      pool?: { name?: string };
      name?: string;
    }>;
  } | null;
  actions: BookingActions;
}

function buildEquipmentOptions(
  booking: Booking,
  checkoutSnapshot: DamageReportSheetProps["checkoutSnapshot"],
): EquipmentOption[] {
  if (checkoutSnapshot?.lines?.length) {
    return checkoutSnapshot.lines.map((line) => {
      const key = line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`;
      const name =
        line.item?.name || line.pool?.name || line.name || `Gear (id: ${line.poolId || line.itemId})`;
      return {
        key,
        label: name,
        quantity: parseFloat(String(line.quantity)) || 1,
      };
    });
  }

  return (booking.bomItems ?? [])
    .filter((item) => item.poolId || item.itemId)
    .map((item) => ({
      key: item.poolId ? `pool:${item.poolId}` : `item:${item.itemId}`,
      label: `${item.code} · ${item.name}`,
      quantity: item.qty,
    }));
}

/**
 * Booking-scoped damage/missing report sheet — mirrors web DamageReportModal.
 */
export function DamageReportSheet({
  booking,
  checkoutSnapshot,
  actions,
}: DamageReportSheetProps) {
  const {
    showDamageModal,
    setShowDamageModal,
    damageDescription,
    setDamageDescription,
    damageType,
    setDamageType,
    damageSelectedAssetId,
    setDamageSelectedAssetId,
    damageQty,
    setDamageQty,
    damageAttachments,
    setDamageAttachments,
    submitDamageReport,
    submittingDamage,
  } = actions;

  const equipmentOptions = useMemo(
    () => buildEquipmentOptions(booking, checkoutSnapshot),
    [booking, checkoutSnapshot],
  );

  const closeModal = () => {
    setShowDamageModal(false);
    setDamageAttachments([]);
  };

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Photo library access is required for attachments.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;
    const next = [...damageAttachments];
    for (const asset of result.assets) {
      if (next.length >= MAX_ATTACHMENTS) {
        Alert.alert("Limit", `Maximum ${MAX_ATTACHMENTS} attachments per report.`);
        break;
      }
      next.push({
        uri: asset.uri,
        name: asset.fileName || `damage-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
    }
    setDamageAttachments(next);
  };

  const handleSubmit = () => {
    if (!damageSelectedAssetId) {
      Alert.alert("Error", "Select the affected equipment.");
      return;
    }
    if (!damageDescription.trim()) {
      Alert.alert("Error", "Description is required.");
      return;
    }
    const [kind, id] = damageSelectedAssetId.split(":");
    submitDamageReport({
      description: damageDescription.trim(),
      reportType: damageType,
      quantity: damageQty,
      poolId: kind === "pool" ? id : undefined,
      itemId: kind === "item" ? id : undefined,
      attachments: damageAttachments,
    });
  };

  return (
    <BottomSheet
      visible={showDamageModal}
      title="Report Damaged / Missing Gear"
      onClose={closeModal}
    >
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
        <View style={styles.linked}>
          <AppText variant="eyebrow">Linked Booking</AppText>
          <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
            {booking.code}
          </AppText>
          <AppText>
            {booking.client} · {booking.venue}
          </AppText>
        </View>

        <Field label="Report Type">
          <View style={styles.row}>
            {(["DAMAGE", "MISSING"] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setDamageType(type)}
                style={[
                  styles.chip,
                  damageType === type
                    ? { borderColor: colors.destructive, backgroundColor: "rgba(229,72,77,0.12)" }
                    : null,
                ]}
              >
                <AppText
                  variant="small"
                  color={damageType === type ? colors.destructive : colors.text2}
                  style={{ fontWeight: "800" }}
                >
                  {type}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Affected Equipment">
          <View style={{ gap: 8 }}>
            {equipmentOptions.length === 0 ? (
              <AppText variant="subtitle">No equipment options available for this booking.</AppText>
            ) : (
              equipmentOptions.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setDamageSelectedAssetId(opt.key)}
                  style={[
                    styles.chip,
                    damageSelectedAssetId === opt.key
                      ? { borderColor: colors.accent }
                      : null,
                  ]}
                >
                  <AppText style={{ fontWeight: "700" }}>{opt.label}</AppText>
                  <AppText variant="data" color={colors.text3}>
                    qty {opt.quantity}
                  </AppText>
                </Pressable>
              ))
            )}
          </View>
        </Field>

        <Field label="Quantity">
          <Input
            keyboardType="numeric"
            value={damageQty}
            onChangeText={setDamageQty}
          />
        </Field>

        <Field label="Description">
          <TextArea
            value={damageDescription}
            onChangeText={setDamageDescription}
            placeholder="Describe visible damage, symptoms, and circumstances..."
          />
        </Field>

        <Field label="Photo Evidence">
          <View style={styles.row}>
            <Button variant="outline" icon={Camera} onPress={pickPhotos}>
              Add Photos
            </Button>
            <AppText variant="small" color={colors.text3}>
              {damageAttachments.length}/{MAX_ATTACHMENTS}
            </AppText>
          </View>
          <View style={styles.thumbs}>
            {damageAttachments.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={styles.thumbWrap}>
                <Image source={{ uri: file.uri }} style={styles.thumb} />
                <Pressable
                  style={styles.remove}
                  onPress={() =>
                    setDamageAttachments((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <X size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        </Field>

        <Button
          variant="danger"
          icon={Paperclip}
          disabled={submittingDamage}
          onPress={handleSubmit}
        >
          {submittingDamage ? "Submitting..." : "Submit Damage Report"}
        </Button>
        <Button variant="outline" onPress={closeModal}>
          Cancel
        </Button>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  linked: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: 12,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface2,
    gap: 2,
  },
  thumbs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },
  remove: {
    position: "absolute",
    top: -4,
    right: -4,
    height: 20,
    width: 20,
    borderRadius: 10,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
});
