import { to } from "@/utils/routes";
import { router } from "expo-router";
import { BarChart3, FileText, Package, Plus, ShieldAlert } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { colors, radius } from "@/theme/tokens";

export function QuickActionsWidget() {
  const { activeProfile } = useAppContext();
  const role = activeProfile.role;

  const actions =
    role === "CCR"
      ? [
          { label: "New booking", icon: Plus, href: "/bookings/new", accent: true },
          { label: "All bookings", icon: FileText, href: "/bookings" },
          { label: "Report damage", icon: ShieldAlert, href: "/damage-report" },
        ]
      : role === "SK"
        ? [
            { label: "Check out equipment", icon: Package, href: "/checkout", accent: true },
            { label: "Report damage", icon: ShieldAlert, href: "/damage-report" },
            { label: "All bookings", icon: FileText, href: "/bookings" },
          ]
        : [
            { label: "New booking", icon: Plus, href: "/bookings/new", accent: true },
            { label: "Check out equipment", icon: Package, href: "/checkout" },
            { label: "Report damage", icon: ShieldAlert, href: "/damage-report" },
            { label: "View reports", icon: BarChart3, href: "/reports" },
          ];

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
      onPress={() => router.push(to(href))}
      style={[styles.quickAction, accent ? styles.quickActionAccent : null]}
    >
      <View style={[styles.quickIcon, accent ? styles.quickIconAccent : null]}>
        <Icon size={17} color={accent ? colors.accentForeground : colors.accent} />
      </View>
      <AppText style={styles.quickText}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAction: {
    width: "48%",
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 9,
  },
  quickActionAccent: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.08)",
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconAccent: {
    backgroundColor: colors.accent,
  },
  quickText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
