import { Pressable, StyleSheet, View } from "react-native";
import { getBookingPollCopy, type BookingPollPhase } from "@vortex/utils";
import { AppText } from "@/components/ui";
import { colors, radius } from "@/theme/tokens";

export function BookingSyncStatus({
  phase,
  onRetry,
}: {
  phase: BookingPollPhase;
  onRetry?: () => void;
}) {
  if (phase === "loading" || phase === "success") return null;

  if (phase === "polling") {
    return (
      <View style={styles.liveRow}>
        <View style={styles.liveDot} />
        <AppText variant="eyebrow" color={colors.text3}>
          Live status
        </AppText>
      </View>
    );
  }

  const copy = getBookingPollCopy(phase);
  const showRetry = (phase === "failure" || phase === "timeout") && !!onRetry;

  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontWeight: "700" }}>{copy.title}</AppText>
        <AppText variant="small" color={colors.text2} style={{ marginTop: 2 }}>
          {copy.detail}
        </AppText>
      </View>
      {showRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <AppText variant="eyebrow" color={colors.accent}>
            Retry
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
});
