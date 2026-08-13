import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import {
  CalendarClock,
  ClipboardList,
  MapPin,
  Package,
  Pencil,
  ShieldAlert,
  Wrench,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { ToneBadge } from "@/components/status";
import {
  AppText,
  BackLink,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  KV,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
  StatCard,
  TextArea,
} from "@/components/ui";
import {
  useDeactivateInventoryEntity,
  useInventoryItem,
  useUpdateInventoryItem,
  useUpdateInventoryPool,
} from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { colors, radius } from "@/theme/tokens";

const TABS = ["Units", "Maintenance"] as const;
const CONDITIONS = ["AVAILABLE", "DAMAGED", "UNDER_MAINTENANCE", "LOST", "RETIRED"] as const;

export default function InventoryDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading, isError, refetch } = useInventoryItem(params.id);
  const { can } = usePermissions();
  const canManage = can(PERMISSION.INVENTORY_MANAGE);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Units");
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>("AVAILABLE");
  const updatePool = useUpdateInventoryPool();
  const updateItem = useUpdateInventoryItem();
  const deactivate = useDeactivateInventoryEntity();

  useEffect(() => {
    if (!item) return;
    setName(item.name || "");
    setQuantity(String(item.total ?? 1));
    setSku(item.sku || "");
    setAssetTag(item.assetTag || "");
    setSerialNumber(item.serialNumber || "");
    setNotes(item.notes || "");
    setCondition(
      (item.itemCondition as (typeof CONDITIONS)[number]) ||
        (item.condition === "DAMAGED" ? "DAMAGED" : "AVAILABLE"),
    );
  }, [item]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading item..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load this item from the server." onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <EmptyState title="Inventory item not found" />
      </Screen>
    );
  }

  const isSerialized = item.entityKind === "item" || item.category === "Serialized Asset";
  const entityId = item.entityId || item.poolId || item.itemId || "";
  const saving = updatePool.isPending || updateItem.isPending || deactivate.isPending;

  const handleSave = async () => {
    if (!entityId) {
      Alert.alert("Error", "Missing inventory entity id.");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Error", "Name is required");
      return;
    }
    try {
      if (item.entityKind === "pool" || item.poolId) {
        const qty = Number.parseFloat(quantity);
        if (!Number.isFinite(qty) || qty < 0) {
          Alert.alert("Error", "Quantity must be 0 or greater");
          return;
        }
        await updatePool.mutateAsync({
          id: entityId,
          payload: {
            name: trimmed,
            totalQuantity: quantity,
            sku: sku.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        });
      } else {
        await updateItem.mutateAsync({
          id: entityId,
          payload: {
            name: trimmed,
            assetTag: assetTag.trim() || undefined,
            serialNumber: serialNumber.trim() || undefined,
            condition,
            notes: notes.trim() || undefined,
          },
        });
      }
      setEditOpen(false);
      Alert.alert("Success", "Inventory updated.");
      refetch();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update inventory.");
    }
  };

  const handleDeactivate = () => {
    if (!entityId) return;
    Alert.alert("Deactivate", "Deactivate this inventory entity?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          try {
            await deactivate.mutateAsync({
              kind: item.entityKind === "item" ? "item" : "pool",
              id: entityId,
            });
            Alert.alert("Success", "Inventory deactivated.");
            router.replace(to("/inventory"));
          } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to deactivate.");
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.actionRow}>
        <BackLink label="Back to Inventory" href="/inventory" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {canManage ? (
            <Button icon={Pencil} variant="outline" onPress={() => setEditOpen(true)}>
              Edit
            </Button>
          ) : null}
          <Button
            icon={ShieldAlert}
            onPress={() => {
              const qs =
                item.entityKind === "pool" && item.entityId
                  ? `poolId=${encodeURIComponent(item.entityId)}`
                  : item.entityId
                    ? `itemId=${encodeURIComponent(item.entityId)}`
                    : item.itemId
                      ? `itemId=${encodeURIComponent(item.itemId)}`
                      : `itemId=${encodeURIComponent(item.id)}`;
              router.push(to(`/damage-report?${qs}`));
            }}
          >
            Report Damage
          </Button>
        </View>
      </View>

      <Section title={item.name} icon={Package} aside={item.availability}>
        <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
          {item.id}
        </AppText>
        <AppText variant="subtitle">
          {item.model} · {item.category}
        </AppText>
        <View style={styles.stats}>
          <StatCard label="Total" value={item.total} />
          <StatCard label="Available" value={item.available} tone={colors.success} />
          <StatCard label="Reserved" value={item.reserved} tone={colors.payment.ADVANCE} />
          <StatCard label="Onsite" value={item.onsite} tone={colors.status.ACCEPTED} />
          <StatCard label="Damaged" value={item.damaged} tone={colors.destructive} />
        </View>
      </Section>

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === "Units" ? (
        <Section title={isSerialized ? "Serialized Unit" : "Bulk Pool"} icon={ClipboardList}>
          {isSerialized ? (
            <View style={styles.row}>
              <View>
                <AppText variant="data" style={{ fontWeight: "900" }}>
                  {item.id}
                </AppText>
                <AppText variant="small" color={colors.text2}>
                  {item.location}
                </AppText>
              </View>
              <ToneBadge
                label={item.condition}
                tone={
                  item.condition === "DAMAGED"
                    ? colors.destructive
                    : item.condition === "GOOD"
                      ? colors.success
                      : colors.payment.ADVANCE
                }
              />
            </View>
          ) : (
            <>
              <KV label="SKU" value={item.sku || item.id} mono />
              <KV label="Total quantity" value={item.total} mono />
              <KV label="Location" value={item.location} />
            </>
          )}
        </Section>
      ) : (
        <Section title="Maintenance" icon={Wrench}>
          <KV label="Last service" value={item.lastService} mono />
          <KV label="Next service" value={item.nextService} mono />
          <View style={styles.metaRow}>
            <CalendarClock size={16} color={colors.text3} />
            <AppText variant="small" color={colors.text2}>
              Service schedule is managed from inventory maintenance workflows.
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <MapPin size={16} color={colors.text3} />
            <AppText variant="small" color={colors.text2}>
              {item.location}
            </AppText>
          </View>
        </Section>
      )}

      <BottomSheet visible={editOpen} title="Edit Inventory" onClose={() => setEditOpen(false)}>
        <Field label="Name">
          <Input value={name} onChangeText={setName} />
        </Field>
        {!isSerialized ? (
          <>
            <Field label="Total quantity">
              <Input value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
            </Field>
            <Field label="SKU">
              <Input value={sku} onChangeText={setSku} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Asset tag">
              <Input value={assetTag} onChangeText={setAssetTag} />
            </Field>
            <Field label="Serial number">
              <Input value={serialNumber} onChangeText={setSerialNumber} />
            </Field>
            <Field label="Condition">
              <View style={styles.conditionRow}>
                {CONDITIONS.map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setCondition(value)}
                    style={[
                      styles.conditionChip,
                      condition === value ? styles.conditionChipActive : null,
                    ]}
                  >
                    <AppText
                      variant="small"
                      color={condition === value ? colors.accentForeground : colors.text2}
                      style={{ fontWeight: "800", fontSize: 10 }}
                    >
                      {value === "UNDER_MAINTENANCE" ? "MAINT" : value}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </Field>
          </>
        )}
        <Field label="Notes">
          <TextArea value={notes} onChangeText={setNotes} placeholder="Optional notes" />
        </Field>
        <Button disabled={saving} onPress={handleSave}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="danger" disabled={saving} onPress={handleDeactivate}>
          Deactivate
        </Button>
        <Button variant="outline" onPress={() => setEditOpen(false)}>
          Cancel
        </Button>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stats: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conditionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  conditionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface2,
  },
  conditionChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
