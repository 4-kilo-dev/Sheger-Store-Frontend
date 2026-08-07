import { router } from "expo-router";
import { to } from "@/utils/routes";
import { ArrowRight, Check, ClipboardList } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText, LoadingState, Section } from "@/components/ui";
import { useNotificationsContext } from "@/context/NotificationsContext";
import { getNotificationDisplay } from "@/services/notifications-api";
import { colors, radius } from "@/theme/tokens";

export function PendingTasksWidget() {
  const { pendingTasks, isLoading, markAsRead } = useNotificationsContext();

  return (
    <Section
      title="Task Center"
      icon={ClipboardList}
      aside={pendingTasks.length > 0 ? `${pendingTasks.length} action required` : undefined}
    >
      {isLoading ? (
        <LoadingState label="Loading tasks..." />
      ) : pendingTasks.length === 0 ? (
        <View style={styles.empty}>
          <Check size={18} color={colors.success} />
          <AppText style={{ fontWeight: "800" }}>All Caught Up!</AppText>
          <AppText variant="small" color={colors.text3}>
            No pending tasks require action.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {pendingTasks.map((task) => {
            const display = getNotificationDisplay(task);
            const redirectPath = display.linkTo || "/notifications";
            let actionLabel = "View Task";
            if (
              task.eventType === "booking.technical_allocated" ||
              display.linkTo?.startsWith("/bookings/")
            ) {
              actionLabel =
                task.eventType === "booking.technical_allocated"
                  ? "Open to quote"
                  : "Review Booking";
            } else if (task.relatedEntity === "assignment") {
              actionLabel = "Reassign Crew";
            } else if (task.relatedEntity === "damage_missing_report") {
              actionLabel = "Inspect Damage";
            }

            return (
              <View key={task.id} style={styles.card}>
                <View style={styles.row}>
                  <AppText style={{ fontWeight: "800", flex: 1 }} numberOfLines={1}>
                    {display.title}
                  </AppText>
                  <AppText variant="small" color={colors.accent}>
                    {display.priority}
                  </AppText>
                </View>
                <AppText variant="small" color={colors.text2}>
                  {task.message}
                </AppText>
                <Pressable
                  onPress={() => {
                    markAsRead(task.id);
                    router.push(to(redirectPath));
                  }}
                  style={styles.action}
                >
                  <AppText variant="small" color={colors.accent} style={{ fontWeight: "800" }}>
                    {actionLabel}
                  </AppText>
                  <ArrowRight size={12} color={colors.accent} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
});
