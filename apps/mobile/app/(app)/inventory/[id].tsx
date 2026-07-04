import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Package,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ToneBadge } from "@/components/status";
import {
  AppText,
  BackLink,
  Button,
  EmptyState,
  KV,
  Screen,
  Section,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import { INVENTORY } from "@/data/mock";
import { colors } from "@/theme/tokens";

const TABS = ["Units", "Movement", "Maintenance"] as const;

export default function InventoryDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const item = INVENTORY.find((candidate) => candidate.id === params.id);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Units");
  const units = useMemo(() => {
    if (!item) return [];
    return Array.from({ length: Math.min(item.total, 12) }, (_, index) => ({
      serial: `${item.id}-${String(index + 1).padStart(3, "0")}`,
      state:
        index < item.damaged
          ? "DAMAGED"
          : index < item.damaged + item.onsite
            ? "ONSITE"
            : index < item.damaged + item.onsite + item.reserved
              ? "RESERVED"
              : "AVAILABLE",
      location: index < item.onsite ? "SB047 · Sheraton" : item.location,
      inspection: `2026-05-${String(28 - index).padStart(2, "0")}`,
    }));
  }, [item]);

  if (!item) {
    return (
      <Screen>
        <EmptyState title="Inventory item not found" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.actionRow}>
        <BackLink label="Back to Inventory" href="/inventory" />
        <Button variant="outline" icon={RotateCcw}>
          Stock Movement
        </Button>
        <Button icon={ShieldAlert} onPress={() => router.push(to("/damage-report"))}>
          Report Damage
        </Button>
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
        <Section title="Serialized Units" icon={ClipboardList}>
          {units.map((unit) => (
            <View key={unit.serial} style={styles.row}>
              <View>
                <AppText variant="data" style={{ fontWeight: "900" }}>
                  {unit.serial}
                </AppText>
                <AppText variant="small" color={colors.text2}>
                  {unit.location}
                </AppText>
                <AppText variant="data" color={colors.text3}>
                  {unit.inspection}
                </AppText>
              </View>
              <ToneBadge
                label={unit.state}
                tone={
                  unit.state === "DAMAGED"
                    ? colors.destructive
                    : unit.state === "AVAILABLE"
                      ? colors.success
                      : colors.payment.ADVANCE
                }
              />
            </View>
          ))}
        </Section>
      ) : null}
      {tab === "Movement" ? (
        <Section title="Movement" icon={CheckCircle2}>
          {[
            "12 units checked out to SB047",
            "48 units reserved for SB052",
            "4 units returned and inspected",
          ].map((event, index) => (
            <View key={event} style={styles.eventRow}>
              <CheckCircle2 size={16} color={colors.accent} />
              <View>
                <AppText style={{ fontWeight: "800" }}>{event}</AppText>
                <AppText variant="data" color={colors.text3}>
                  2026-06-{String(8 - index).padStart(2, "0")} · Nathan B.
                </AppText>
              </View>
            </View>
          ))}
        </Section>
      ) : null}
      {tab === "Maintenance" ? (
        <Section title="Maintenance" icon={Wrench}>
          <AppText style={{ fontWeight: "800" }}>Next preventive service</AppText>
          <AppText variant="data" color={colors.text2}>
            {item.nextService} · Full power, signal, housing and connector inspection
          </AppText>
        </Section>
      ) : null}

      <Section title="Storage" icon={MapPin}>
        <KV label="Location" value={item.location} />
        <KV label="Warehouse" value="Main warehouse · Bole" />
      </Section>
      <Section title="Service Record" icon={CalendarClock}>
        <KV label="Last service" value={item.lastService} mono />
        <KV label="Next due" value={item.nextService} mono />
      </Section>
      <Section title="Custodian" icon={ClipboardList}>
        <KV label="Name" value="Mekonnen T." />
        <KV label="Role" value="Storekeeper" />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 8,
  },
  stats: {
    gap: 10,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  eventRow: {
    flexDirection: "row",
    gap: 10,
  },
});
