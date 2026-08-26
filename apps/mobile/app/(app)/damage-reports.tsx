import { useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { CheckCircle2, ShieldAlert } from "lucide-react-native";
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  NativeList,
  Screen,
  SegmentedTabs,
} from "@/components/ui";
import { useDamageReports, useResolveDamageReport } from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { colors } from "@/theme/tokens";

const TABS = ["All", "Open", "Under review", "Resolved", "Rejected"] as const;

export default function DamageReportsScreen() {
  const { can } = usePermissions();
  const canResolve = can(PERMISSION.DAMAGE_RESOLVE);
  const { data: reports = [], isLoading, isError, refetch } = useDamageReports();
  const resolveReport = useResolveDamageReport();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const status = tab === "Under review" ? "UNDER_REVIEW" : tab.toUpperCase();
    return reports.filter((report) => {
      const statusMatch = tab === "All" || report.status === status;
      const text =
        `${report.bookingCode ?? ""} ${report.poolName ?? ""} ${report.itemName ?? ""} ${report.description ?? ""}`.toLowerCase();
      return statusMatch && text.includes(query.trim().toLowerCase());
    });
  }, [reports, tab, query]);

  if (isLoading)
    return (
      <Screen>
        <LoadingState label="Loading damage reports..." />
      </Screen>
    );
  if (isError)
    return (
      <Screen>
        <ErrorState detail="Could not load damage reports." onRetry={() => refetch()} />
      </Screen>
    );

  return (
    <Screen scroll={false}>
      <NativeList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <AppText variant="eyebrow">Warehouse control</AppText>
              <AppText variant="title">Damage reports</AppText>
              <AppText variant="subtitle">Review incidents and close the equipment loop.</AppText>
            </View>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search reports..."
              autoCapitalize="none"
            />
            <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
            {!canResolve ? (
              <AppText variant="small" color={colors.text2}>
                You can review reports but need damage.resolve to close them.
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No damage reports" detail="No reports match the current view." />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}>
              <ShieldAlert
                size={17}
                color={item.status === "RESOLVED" ? colors.success : colors.destructive}
              />
            </View>
            <View style={styles.copy}>
              <AppText style={{ fontWeight: "800" }}>
                {item.poolName || item.itemName || "Inventory incident"}
              </AppText>
              <AppText variant="small" color={colors.text2}>
                {item.reportType} · {item.quantity || "1"} unit{item.quantity === "1" ? "" : "s"}
                {item.bookingCode ? ` · ${item.bookingCode}` : ""}
              </AppText>
              <AppText variant="small" color={colors.text2} numberOfLines={3}>
                {item.description || "No description"}
              </AppText>
              <AppText
                variant="eyebrow"
                color={item.status === "RESOLVED" ? colors.success : colors.accent}
              >
                {item.status.replace("_", " ")}
              </AppText>
              {canResolve && (item.status === "OPEN" || item.status === "UNDER_REVIEW") ? (
                <View style={styles.actions}>
                  <Button
                    icon={CheckCircle2}
                    variant="success"
                    disabled={resolveReport.isPending}
                    onPress={() => {
                      Alert.alert(
                        "Resolve report",
                        "Mark the equipment as repaired and available?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Resolve",
                            onPress: () =>
                              resolveReport.mutate({
                                id: item.id,
                                status: "RESOLVED",
                                itemCondition: "AVAILABLE",
                                resolutionAction: "REPAIRED",
                              }),
                          },
                        ],
                      );
                    }}
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="danger"
                    disabled={resolveReport.isPending}
                    onPress={() => {
                      Alert.alert(
                        "Reject report",
                        "Reject this report without changing inventory condition?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Reject",
                            style: "destructive",
                            onPress: () =>
                              resolveReport.mutate({ id: item.id, status: "REJECTED" }),
                          },
                        ],
                      );
                    }}
                  >
                    Reject
                  </Button>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 24 },
  header: { gap: 12 },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 5 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 5 },
});
