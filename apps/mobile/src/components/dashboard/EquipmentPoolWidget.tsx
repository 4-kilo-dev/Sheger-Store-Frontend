import { to } from "@/utils/routes";
import { router } from "expo-router";
import { Package } from "lucide-react-native";
import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { AppText, Button, ProgressBar, Section } from "@/components/ui";
import { INVENTORY } from "@/data/mock";
import { colors } from "@/theme/tokens";
import { pct } from "@/utils/format";

export function EquipmentPoolWidget() {
  const stats = useMemo(() => {
    const total = INVENTORY.reduce((sum, item) => sum + item.total, 0);
    const available = INVENTORY.reduce((sum, item) => sum + item.available, 0);
    const onsite = INVENTORY.reduce((sum, item) => sum + item.onsite, 0);
    return { total, available, onsite };
  }, []);

  return (
    <Section
      title="Equipment pool"
      icon={Package}
      action={
        <Button variant="ghost" onPress={() => router.push(to("/inventory"))}>
          View
        </Button>
      }
    >
      <View style={styles.poolRow}>
        <View style={styles.poolGauge}>
          <AppText variant="stat">{pct(stats.available, stats.total)}%</AppText>
          <AppText variant="eyebrow" color={colors.text3}>
            Available
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <PoolLine label="Available" value={stats.available} tone={colors.success} />
          <PoolLine
            label="Reserved"
            value={stats.total - stats.available - stats.onsite}
            tone={colors.payment.ADVANCE}
          />
          <PoolLine label="Onsite" value={stats.onsite} tone={colors.status.ACCEPTED} />
        </View>
      </View>
    </Section>
  );
}

function PoolLine({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.poolLineTop}>
        <View style={styles.poolLabel}>
          <View style={[styles.poolDot, { backgroundColor: tone }]} />
          <AppText variant="small">{label}</AppText>
        </View>
        <AppText variant="data" style={{ fontWeight: "900" }}>
          {value}
        </AppText>
      </View>
      <ProgressBar value={Math.min(100, value / 2)} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  poolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  poolGauge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  poolLineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  poolLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  poolDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
