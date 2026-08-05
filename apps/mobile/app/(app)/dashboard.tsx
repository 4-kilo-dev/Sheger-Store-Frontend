import { to } from "@/utils/routes";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { AppText, Button, Screen } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { ROLE_LAYOUTS } from "@/config/dashboard-widgets";
import type { UserRole } from "@/types/domain";

/** Maps backend role strings to the UserRole display names used in ROLE_LAYOUTS. */
function resolveRole(role: string): UserRole {
  const r = (role || "").toLowerCase();
  if (r === "admin" || r === "supervisor") return "Admin";
  if (r === "ccr") return "CCR";
  if (r === "chief_tech") return "CTO";
  if (r === "technician") return "TO";
  if (r === "oo" || r === "ops_officer" || r === "operations_officer" || r === "driver") return "OO";
  if (r === "storekeeper") return "SK";
  if (r === "stagehand") return "SH";
  if (r === "freelancer") return "FL";
  return "Admin";
}

export default function DashboardScreen() {
  const { activeProfile, authUser } = useAppContext();
  // Prefer the backend role from authUser (refreshed from /me) for layout selection,
  // fall back to activeProfile.role which is the display-name variant.
  const backendRole = authUser?.roles?.[0] || authUser?.role || "";
  const resolvedRole: UserRole = backendRole ? resolveRole(backendRole) : activeProfile.role;
  const layout = ROLE_LAYOUTS[resolvedRole] ?? ROLE_LAYOUTS["Admin"];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="eyebrow">{layout.eyebrow}</AppText>
          <AppText variant="title">{layout.title}</AppText>
          <AppText variant="subtitle">{layout.description}</AppText>
        </View>
        <Button variant="ghost" icon={ArrowRight} onPress={() => router.push(to("/bookings"))}>
          All bookings
        </Button>
      </View>

      {layout.widgets.map((widgetId) => (
        <WidgetRenderer key={widgetId} id={widgetId} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
});
