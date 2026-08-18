import { to } from "@/utils/routes";
import { router } from "expo-router";
import { Package } from "lucide-react-native";
import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Button, KV, LoadingState, ProgressBar, Section } from "@/components/ui";
import { useInventory } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import { pct } from "@/utils/format";

export function EquipmentPoolWidget() {
  const { data: INVENTORY = [], isLoading } = useInventory();

  const stats = useMemo(() => {
    const total = INVENTORY.reduce((sum, item) => sum + item.total, 0);
    const available = INVENTORY.reduce((sum, item) => sum + item.available, 0);
    const onsite = INVENTORY.reduce((sum, item) => sum + item.onsite, 0);
    const reserved = INVENTORY.reduce((sum, item) => sum + item.reserved, 0);
    return { total, available, onsite, reserved };
  }, [INVENTORY]);

  if (isLoading) return <LoadingState label="Loading equipment pool..." />;

  return (
    <Section
      title="Equipment pool"
      icon={Package}
      action={
        <Button variant="ghost" onPress={() => router.push(to("/inventory"))}>
          Open
        </Button>
      }
    >
      {stats.total === 0 ? (
        <AppText variant="small" color={colors.text3}>
          No equipment in the pool yet.
        </AppText>
      ) : (
        <>
          <KV label="Available" value={`${stats.available} / ${stats.total}`} mono />
          <ProgressBar value={pct(stats.available, stats.total)} tone={colors.success} />
          <View style={styles.meta}>
            <AppText variant="small" color={colors.text2}>
              {stats.reserved} reserved · {stats.onsite} onsite
            </AppText>
          </View>
        </>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  meta: {
    marginTop: 4,
  },
});
