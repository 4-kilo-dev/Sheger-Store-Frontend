import { router } from "expo-router";
import { to } from "@/utils/routes";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCheck,
  DollarSign,
  Package,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ToneBadge } from "@/components/status";
import {
  AppText,
  Button,
  EmptyState,
  Screen,
  Section,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import { NOTIFICATIONS } from "@/data/mock";
import { colors } from "@/theme/tokens";
import type { NotificationType } from "@/types/domain";

const TABS = ["All", "Unread", "Booking", "Inventory", "Payment", "Schedule"] as const;
const ICONS: Record<NotificationType, LucideIcon> = {
  Booking: CalendarCheck,
  Inventory: Package,
  Payment: DollarSign,
  Damage: ShieldAlert,
  Schedule: CalendarCheck,
  System: Settings,
};

export default function NotificationsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const unreadCount = NOTIFICATIONS.filter((item) => item.unread && !readIds.has(item.id)).length;
  const filtered = useMemo(() => {
    let items = [...NOTIFICATIONS];
    if (tab === "Unread") items = items.filter((item) => item.unread && !readIds.has(item.id));
    else if (tab !== "All") items = items.filter((item) => item.type === tab);
    return items;
  }, [readIds, tab]);

  const toggleRead = (id: string) => {
    setReadIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Activity Center</AppText>
        <AppText variant="title">Notifications</AppText>
        <AppText variant="subtitle">
          Prioritized booking, warehouse, payment, and schedule alerts.
        </AppText>
      </View>
      {unreadCount > 0 ? <StatCard label="Unread" value={unreadCount} icon={Bell} /> : null}
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
      <Button
        variant="outline"
        icon={CheckCheck}
        onPress={() => setReadIds(new Set(NOTIFICATIONS.map((item) => item.id)))}
      >
        Mark all read
      </Button>
      {filtered.length === 0 ? (
        <EmptyState title="No notifications" detail="You're all caught up." />
      ) : null}
      {(["Today", "Yesterday", "This Week"] as const).map((group) => {
        const items = filtered.filter((item) => item.date === group);
        if (!items.length) return null;
        return (
          <Section key={group} title={group}>
            {items.map((item) => {
              const Icon = ICONS[item.type] ?? Bell;
              const unread = item.unread && !readIds.has(item.id);
              const tone =
                item.priority === "URGENT"
                  ? colors.destructive
                  : item.priority === "LOW"
                    ? colors.text3
                    : colors.accent;
              return (
                <View
                  key={item.id}
                  style={[styles.notification, unread ? styles.notificationUnread : null]}
                >
                  <View
                    style={[styles.iconBox, unread ? { backgroundColor: colors.accent } : null]}
                  >
                    <Icon size={17} color={unread ? colors.accentForeground : colors.text2} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.lineTop}>
                      <AppText style={{ fontWeight: "900", flex: 1 }}>{item.title}</AppText>
                      <AppText variant="data" color={colors.text3}>
                        {item.time}
                      </AppText>
                    </View>
                    <AppText variant="subtitle">{item.detail}</AppText>
                    <View style={styles.actions}>
                      <ToneBadge label={item.type} tone={colors.accent} />
                      {item.priority !== "NORMAL" ? (
                        <ToneBadge label={item.priority} tone={tone} />
                      ) : null}
                      {item.linkTo ? (
                        <Pressable
                          onPress={() => {
                            if (item.linkTo) router.push(to(item.linkTo));
                          }}
                          style={styles.detailLink}
                        >
                          <AppText
                            variant="small"
                            color={colors.accent}
                            style={{ fontWeight: "900" }}
                          >
                            View details
                          </AppText>
                          <ArrowRight size={13} color={colors.accent} />
                        </Pressable>
                      ) : null}
                      <Button variant="ghost" onPress={() => toggleRead(item.id)}>
                        {unread ? "Mark read" : "Mark unread"}
                      </Button>
                    </View>
                  </View>
                </View>
              );
            })}
          </Section>
        );
      })}
      <Section title="Alert routing" icon={SlidersHorizontal}>
        <AppText variant="subtitle">
          Critical stock, damage, and onsite alerts are pinned. Payment and assignment updates
          follow your selected role.
        </AppText>
        <Button variant="outline" onPress={() => router.push(to("/settings"))}>
          Notification Settings
        </Button>
      </Section>
      <Section title="Summary">
        <StatCard label="Total" value={NOTIFICATIONS.length} />
        <StatCard label="Unread" value={unreadCount} />
        <StatCard
          label="Urgent"
          value={NOTIFICATIONS.filter((item) => item.priority === "URGENT").length}
          tone={colors.destructive}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notification: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 14,
  },
  notificationUnread: {
    backgroundColor: "rgba(245,183,49,0.03)",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  lineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  detailLink: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
