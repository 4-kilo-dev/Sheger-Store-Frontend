import { to } from "@/utils/routes";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { AppText, Button, Screen } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { ROLE_LAYOUTS } from "@/config/dashboard-widgets";

export default function DashboardScreen() {
  const { activeProfile } = useAppContext();
  const layout = ROLE_LAYOUTS[activeProfile.role];

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
