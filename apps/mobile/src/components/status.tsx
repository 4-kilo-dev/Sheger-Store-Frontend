import { Check } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { alpha, colors, radius } from "@/theme/tokens";
import type { BookingStatus, PaymentStatus } from "@/types/domain";
import { STATUS_LABELS, STATUS_ORDER } from "@/types/domain";
import { AppText } from "@/components/ui";

export function StatusBadge({ status, large = false }: { status: BookingStatus; large?: boolean }) {
  const tone = colors.status[status];
  return (
    <View
      style={[
        styles.badge,
        large ? styles.badgeLarge : null,
        { borderColor: alpha(tone, 0.44), backgroundColor: alpha(tone, 0.14) },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <AppText variant="eyebrow" color={tone} style={large ? styles.largeText : styles.badgeText}>
        {status}
      </AppText>
    </View>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone = colors.payment[status];
  return (
    <View style={[styles.badge, { borderColor: alpha(tone, 0.45), backgroundColor: alpha(tone, 0.16) }]}>
      <AppText variant="eyebrow" color={tone} style={styles.badgeText}>
        {status}
      </AppText>
    </View>
  );
}

export function ToneBadge({ label, tone = colors.accent }: { label: string; tone?: string }) {
  return (
    <View style={[styles.badge, { borderColor: alpha(tone, 0.42), backgroundColor: alpha(tone, 0.12) }]}>
      <AppText variant="eyebrow" color={tone} style={styles.badgeText}>
        {label}
      </AppText>
    </View>
  );
}

export function StatusStepper({ current }: { current: BookingStatus }) {
  const index = STATUS_ORDER.indexOf(current);
  return (
    <View style={styles.stepper}>
      {STATUS_ORDER.map((status, itemIndex) => {
        const tone = colors.status[status];
        const done = itemIndex < index;
        const active = itemIndex === index;
        return (
          <View key={status} style={styles.stepItem}>
            <View style={styles.stepLineRow}>
              <View
                style={[
                  styles.line,
                  { backgroundColor: itemIndex === 0 ? "transparent" : itemIndex <= index ? tone : colors.border },
                ]}
              />
              <View
                style={[
                  styles.circle,
                  {
                    borderColor: done || active ? tone : colors.border,
                    backgroundColor: done ? tone : colors.surface,
                  },
                ]}
              >
                {done ? (
                  <Check size={13} color={colors.background} strokeWidth={3} />
                ) : (
                  <AppText variant="small" color={active ? tone : colors.text3} style={styles.stepNumber}>
                    {itemIndex + 1}
                  </AppText>
                )}
              </View>
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      itemIndex === STATUS_ORDER.length - 1 ? "transparent" : itemIndex < index ? tone : colors.border,
                  },
                ]}
              />
            </View>
            <AppText variant="eyebrow" color={done || active ? tone : colors.text3} style={styles.stepLabel} numberOfLines={1}>
              {STATUS_LABELS[status]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLarge: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 12,
  },
  largeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.round,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  stepLineRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontWeight: "900",
  },
  stepLabel: {
    fontSize: 8,
    textAlign: "center",
  },
});
