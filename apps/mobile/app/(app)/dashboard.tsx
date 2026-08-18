import { View, StyleSheet } from "react-native";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { AppText, Screen } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { ROLE_LAYOUTS } from "@/config/dashboard-widgets";

export default function DashboardScreen() {
  const { activeProfile } = useAppContext();
  const layout = ROLE_LAYOUTS[activeProfile.role] ?? ROLE_LAYOUTS.Admin;

  return (
    <Screen>
      <View style={styles.intro}>
        <AppText variant="title" style={styles.introTitle}>
          {layout.eyebrow}
        </AppText>
        <AppText variant="subtitle">{layout.description}</AppText>
      </View>

      {layout.widgets.map((widgetId) => (
        <WidgetRenderer key={widgetId} id={widgetId} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: 4,
  },
  introTitle: {
    fontSize: 22,
  },
});
