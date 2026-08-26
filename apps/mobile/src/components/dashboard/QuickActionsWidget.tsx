import { to } from "@/utils/routes";
import { router } from "expo-router";
import { BarChart3, FileText, Plus, ShieldAlert } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { alpha, colors, radius } from "@/theme/tokens";

export function QuickActionsWidget() {
  const { activeProfile } = useAppContext();
  const { can } = usePermissions();
  const role = activeProfile.role;

  const actions = (
    role === "CCR"
      ? [
          {
            label: "New booking",
            icon: Plus,
            href: "/bookings/new",
            accent: true,
            show: can(PERMISSION.BOOKING_CREATE),
          },
          { label: "Bookings", icon: FileText, href: "/bookings", show: true },
          {
            label: "Report damage",
            icon: ShieldAlert,
            href: "/damage-report",
            show: can(PERMISSION.DAMAGE_REPORT),
          },
        ]
      : role === "SK"
        ? [
            {
              label: "Report damage",
              icon: ShieldAlert,
              href: "/damage-report",
              show: can(PERMISSION.DAMAGE_REPORT),
            },
            { label: "Bookings", icon: FileText, href: "/bookings", show: true },
          ]
        : [
            {
              label: "New booking",
              icon: Plus,
              href: "/bookings/new",
              accent: true,
              show: can(PERMISSION.BOOKING_CREATE),
            },
            {
              label: "Report damage",
              icon: ShieldAlert,
              href: "/damage-report",
              show: can(PERMISSION.DAMAGE_REPORT),
            },
            { label: "Reports", icon: BarChart3, href: "/reports", show: true },
          ]
  ).filter((action) => action.show);

  if (actions.length === 0) return null;

  return (
    <View style={styles.quickGrid}>
      {actions.map((action) => (
        <QuickAction key={action.label} {...action} />
      ))}
    </View>
  );
}

function QuickAction({
  label,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(to(href))}
      style={[styles.quickAction, accent ? styles.quickActionAccent : null]}
    >
      <View style={[styles.quickIcon, accent ? styles.quickIconAccent : null]}>
        <Icon size={16} color={accent ? colors.accentForeground : colors.accent} />
      </View>
      <AppText style={styles.quickText} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickAction: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickActionAccent: {
    borderColor: colors.accent,
    backgroundColor: alpha(colors.accent, 0.08),
  },
  quickIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconAccent: {
    backgroundColor: colors.accent,
  },
  quickText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
});
