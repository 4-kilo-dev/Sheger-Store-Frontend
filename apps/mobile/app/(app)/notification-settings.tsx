import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Bell, Plus, Trash2 } from "lucide-react-native";
import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Screen,
  Section,
  SegmentedTabs,
} from "@/components/ui";
import { useNotificationAdmin, useRoles, useStaff } from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { colors } from "@/theme/tokens";

const PANELS = ["Events", "Routing"] as const;

export default function NotificationSettingsScreen() {
  const { can } = usePermissions();
  const admin = useNotificationAdmin();
  const roles = useRoles();
  const staff = useStaff();
  const [panel, setPanel] = useState<(typeof PANELS)[number]>("Events");
  const [eventKey, setEventKey] = useState("");
  const [eventName, setEventName] = useState("");
  const [ruleEvent, setRuleEvent] = useState("");
  const [ruleTarget, setRuleTarget] = useState("");
  const [targetType, setTargetType] = useState<"role" | "user">("role");

  if (!can(PERMISSION.NOTIFICATION_MANAGE))
    return (
      <Screen>
        <ErrorState detail="You don't have permission to manage notification routing." />
      </Screen>
    );
  if (admin.events.isLoading || admin.rules.isLoading)
    return (
      <Screen>
        <LoadingState label="Loading notification settings..." />
      </Screen>
    );
  if (admin.events.isError || admin.rules.isError)
    return (
      <Screen>
        <ErrorState detail="Could not load notification settings." />
      </Screen>
    );

  const events = admin.events.data ?? [];
  const rules = admin.rules.data ?? [];
  const createEvent = () => {
    if (!eventKey.trim() || !eventName.trim())
      return Alert.alert("Event details required", "Enter an event key and name.");
    admin.createEvent.mutate({
      key: eventKey.trim(),
      name: eventName.trim(),
      defaultPriority: "normal",
    });
    setEventKey("");
    setEventName("");
  };
  const createRule = () => {
    if (!ruleEvent || !ruleTarget)
      return Alert.alert("Routing details required", "Select an event and target.");
    admin.createRule.mutate(
      targetType === "role"
        ? { eventType: ruleEvent, roleId: ruleTarget }
        : { eventType: ruleEvent, userId: ruleTarget },
    );
    setRuleTarget("");
  };

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Administration</AppText>
        <AppText variant="title">Notification settings</AppText>
        <AppText variant="subtitle">
          Control which operational events reach roles and staff.
        </AppText>
      </View>
      <SegmentedTabs tabs={PANELS} value={panel} onChange={setPanel} />
      {panel === "Events" ? (
        <>
          <Section title="Notification events" icon={Bell} aside={`${events.length} configured`}>
            {events.length === 0 ? (
              <EmptyState
                title="No events configured"
                detail="Add the first server-side notification event."
              />
            ) : (
              events.map((event) => (
                <View key={event.key} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: "800" }}>{event.name}</AppText>
                    <AppText variant="small" color={colors.text2}>
                      {event.key}
                    </AppText>
                  </View>
                  <Button
                    variant={event.isActive ? "success" : "outline"}
                    disabled={admin.updateEvent.isPending}
                    onPress={() =>
                      admin.updateEvent.mutate({
                        key: event.key,
                        payload: { isActive: !event.isActive },
                      })
                    }
                  >
                    {event.isActive ? "Active" : "Off"}
                  </Button>
                </View>
              ))
            )}
          </Section>
          <Section title="Add event type" icon={Plus}>
            <Field label="Event key">
              <Input
                value={eventKey}
                onChangeText={setEventKey}
                placeholder="inventory.out_of_stock"
                autoCapitalize="none"
              />
            </Field>
            <Field label="Name">
              <Input
                value={eventName}
                onChangeText={setEventName}
                placeholder="Inventory out of stock"
              />
            </Field>
            <Button onPress={createEvent} disabled={admin.createEvent.isPending}>
              Add event type
            </Button>
          </Section>
        </>
      ) : (
        <>
          <Section title="Routing rules" icon={Bell} aside={`${rules.length} rules`}>
            {rules.length === 0 ? (
              <EmptyState
                title="No routing rules"
                detail="Add a role or staff recipient for an event."
              />
            ) : (
              rules.map((rule) => (
                <View key={rule.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: "800" }}>{rule.eventType}</AppText>
                    <AppText variant="small" color={colors.text2}>
                      {rule.roleName || rule.userName || "Unknown target"}
                    </AppText>
                  </View>
                  <Button
                    variant="ghost"
                    onPress={() =>
                      admin.updateRule.mutate({ id: rule.id, isActive: !rule.isActive })
                    }
                  >
                    {rule.isActive ? "Enabled" : "Disabled"}
                  </Button>
                  <Button
                    variant="danger"
                    icon={Trash2}
                    onPress={() =>
                      Alert.alert("Delete rule", "Remove this routing rule?", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => admin.deleteRule.mutate(rule.id),
                        },
                      ])
                    }
                  >
                    Delete
                  </Button>
                </View>
              ))
            )}
          </Section>
          <Section title="Add routing rule" icon={Plus}>
            <Field label="Event">
              <View style={styles.chips}>
                {events.map((event) => (
                  <Button
                    key={event.key}
                    variant={ruleEvent === event.key ? "primary" : "outline"}
                    onPress={() => setRuleEvent(event.key)}
                  >
                    {event.key}
                  </Button>
                ))}
              </View>
            </Field>
            <Field label="Recipient type">
              <View style={styles.chips}>
                <Button
                  variant={targetType === "role" ? "primary" : "outline"}
                  onPress={() => {
                    setTargetType("role");
                    setRuleTarget("");
                  }}
                >
                  Role
                </Button>
                <Button
                  variant={targetType === "user" ? "primary" : "outline"}
                  onPress={() => {
                    setTargetType("user");
                    setRuleTarget("");
                  }}
                >
                  Staff
                </Button>
              </View>
            </Field>
            <Field label="Recipient">
              <View style={styles.chips}>
                {(targetType === "role"
                  ? (roles.data ?? []).map((r) => ({ id: r.id, label: r.displayName }))
                  : (staff.data ?? []).map((s) => ({ id: s.id, label: s.name }))
                ).map((target) => (
                  <Button
                    key={target.id}
                    variant={ruleTarget === target.id ? "primary" : "outline"}
                    onPress={() => setRuleTarget(target.id)}
                  >
                    {target.label}
                  </Button>
                ))}
              </View>
            </Field>
            <Button onPress={createRule} disabled={admin.createRule.isPending}>
              Add routing rule
            </Button>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
