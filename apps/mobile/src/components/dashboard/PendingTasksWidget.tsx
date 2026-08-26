import { router } from "expo-router";
import { to } from "@/utils/routes";
import { ClipboardList } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, Button, LoadingState, Section } from "@/components/ui";
import { useNotificationsContext } from "@/context/NotificationsContext";
import { getNotificationDisplay } from "@/services/notifications-api";
import { colors, radius } from "@/theme/tokens";

export function PendingTasksWidget() {
  const { pendingTasks, isLoading, markAsRead } = useNotificationsContext();

  return (
    <Section
      title="Needs you"
      icon={ClipboardList}
      aside={
        pendingTasks.length > 0 && pendingTasks.length <= 5 ? `${pendingTasks.length}` : undefined
      }
      action={
        pendingTasks.length > 5 ? (
          <Button variant="ghost" onPress={() => router.push(to("/notifications"))}>
            All
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <LoadingState label="Loading tasks..." />
      ) : pendingTasks.length === 0 ? (
        <AppText variant="small" color={colors.text3}>
          Nothing waiting.
        </AppText>
      ) : (
        <View style={{ gap: 8 }}>
          {pendingTasks.slice(0, 5).map((task) => {
            const display = getNotificationDisplay(task);
            const redirectPath = display.linkTo || "/notifications";
            return (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityLabel={display.title}
                onPress={() => {
                  markAsRead(task.id);
                  router.push(to(redirectPath));
                }}
                style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
              >
                <AppText style={{ fontWeight: "800", flex: 1 }} numberOfLines={1}>
                  {display.title}
                </AppText>
                <AppText variant="small" color={colors.text2} numberOfLines={2}>
                  {task.message}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    justifyContent: "center",
  },
  cardPressed: {
    opacity: 0.72,
  },
});
