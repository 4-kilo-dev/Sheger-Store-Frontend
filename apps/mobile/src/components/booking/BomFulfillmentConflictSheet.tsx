import { AlertTriangle, Package } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText, Button, Field, TextArea } from "@/components/ui";
import { useState } from "react";
import type { UnfulfilledBomLine } from "@/hooks/useBookingActions";
import { colors, radius } from "@/theme/tokens";

interface BomFulfillmentConflictSheetProps {
  open: boolean;
  lines: UnfulfilledBomLine[];
  onClose: () => void;
  onGoToEquipment: () => void;
  canOverride?: boolean;
  onOverrideCheckout?: (reason: string) => void;
}

/**
 * Mirrors apps/web BomFulfillmentConflictModal — checkout blocked by insufficient stock.
 */
export function BomFulfillmentConflictSheet({
  open,
  lines,
  onClose,
  onGoToEquipment,
  canOverride = false,
  onOverrideCheckout,
}: BomFulfillmentConflictSheetProps) {
  const [overrideReason, setOverrideReason] = useState("");
  if (!open || lines.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <AlertTriangle size={20} color={colors.payment.ADVANCE} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontWeight: "800", fontSize: 15 }}>
                Checkout blocked — insufficient stock
              </AppText>
              <AppText variant="small" color={colors.text2} style={{ marginTop: 4 }}>
                Some BOM lines exceed available inventory for this booking window. Adjust quantities
                on the Equipment tab before checking out.
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <AppText color={colors.text3}>✕</AppText>
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ gap: 0 }}>
            {lines.map((line) => (
              <View key={line.lineId} style={styles.line}>
                <AppText style={{ fontWeight: "700" }}>{line.name}</AppText>
                <AppText variant="data" color={colors.text2}>
                  Requested {line.requested} · Available {line.available}
                </AppText>
                <AppText variant="small" color={colors.text3}>
                  {line.reason}
                </AppText>
              </View>
            ))}
          </ScrollView>

          {canOverride ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <AppText variant="small" color={colors.text2}>
                Inventory override is available to authorized users. A documented reason is
                required.
              </AppText>
              <Field label="Override reason (minimum 10 characters)">
                <TextArea
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  placeholder="Explain why this checkout must proceed..."
                />
              </Field>
              <Button
                disabled={overrideReason.trim().length < 10}
                onPress={() => {
                  onOverrideCheckout?.(overrideReason.trim());
                  setOverrideReason("");
                }}
              >
                Force checkout
              </Button>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              icon={Package}
              onPress={() => {
                onClose();
                onGoToEquipment();
              }}
            >
              Open Equipment tab
            </Button>
            <Button variant="outline" onPress={onClose}>
              Close
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    height: 40,
    width: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232,160,48,0.15)",
  },
  list: {
    marginTop: 16,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  line: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  actions: {
    marginTop: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
});
