import { AlertTriangle, KeyRound, UserCheck, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { StaffCard } from "@/components/cards";
import {
  AppText,
  BottomSheet,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  NativeList,
  Screen,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import {
  useCreateStaff,
  useResetPassword,
  useRoles,
  useSetStaffFreelancer,
  useStaff,
  useToggleUserActive,
} from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { colors } from "@/theme/tokens";

export default function StaffScreen() {
  const { can } = usePermissions();
  const canViewStaff = can(PERMISSION.USER_VIEW);
  const canManageStaff = can(PERMISSION.USER_MANAGE);
  const { data: STAFF = [], isLoading, isError, refetch } = useStaff();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("All");
  const [addOpen, setAddOpen] = useState(false);
  const resetPassword = useResetPassword();
  const toggleActive = useToggleUserActive();
  const toggleFreelancer = useSetStaffFreelancer();
  // Derived from the real staff list rather than the hardcoded STAFF_ROLES mock,
  // so a role that doesn't exactly match the mock taxonomy never becomes invisible.
  const roleTabs = useMemo(
    () => ["All", ...Array.from(new Set(STAFF.map((person) => person.role))).sort()],
    [STAFF],
  );
  const rows = useMemo(
    () =>
      STAFF.filter(
        (person) =>
          (role === "All" || person.role === role) &&
          `${person.name} ${person.role} ${person.team}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [STAFF, query, role],
  );
  const counts = {
    total: STAFF.length,
    active: STAFF.filter((person) => person.status === "ACTIVE").length,
  };

  const handleResetPassword = async (id: string, name: string) => {
    try {
      const res = await resetPassword.mutateAsync(id);
      Alert.alert("Password Reset", `Temporary password for ${name}: ${res.temporaryPassword}`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to reset password.");
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await toggleActive.mutateAsync({ id, active });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update status.");
    }
  };

  const handleToggleFreelancer = async (id: string, isFreelancer: boolean) => {
    try {
      await toggleFreelancer.mutateAsync({ id, isFreelancer });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update freelancer flag.");
    }
  };

  if (!canViewStaff) {
    return (
      <Screen>
        <ErrorState detail="You don't have access to staff records." />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading staff..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load staff from the server." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <View>
          <Field label="People Operations">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search staff, role or team..."
            />
          </Field>
        </View>
        {canManageStaff ? <Button onPress={() => setAddOpen(true)}>Add Staff Member</Button> : null}
      </View>
      <View style={styles.stats}>
        <StatCard
          label="Total Staff"
          value={counts.total}
          note={`Across ${roleTabs.length - 1} operational roles`}
          icon={Users}
        />
        <StatCard
          label="Available Now"
          value={counts.active}
          note="Ready for assignment"
          icon={UserCheck}
        />
      </View>
      <SegmentedTabs tabs={roleTabs} value={role} onChange={setRole} />
      <AppText variant="small" color={colors.text3}>
        {rows.length} staff visible
      </AppText>
      <NativeList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={{ gap: 8 }}>
            <StaffCard staff={item} />
            {canManageStaff ? (
              <View style={styles.rowActions}>
                <Button
                  variant="ghost"
                  icon={KeyRound}
                  disabled={resetPassword.isPending}
                  onPress={() => handleResetPassword(item.id, item.name)}
                >
                  Reset PW
                </Button>
                <Button
                  variant="ghost"
                  disabled={toggleFreelancer.isPending}
                  onPress={() => handleToggleFreelancer(item.id, !item.isFreelancer)}
                >
                  {item.isFreelancer ? "Freelancer ✓" : "Mark Freelancer"}
                </Button>
                <Button
                  variant="ghost"
                  icon={item.status !== "OFF DUTY" ? AlertTriangle : UserCheck}
                  disabled={toggleActive.isPending}
                  onPress={() => {
                    if (item.status === "OFF DUTY") {
                      handleToggleActive(item.id, true);
                      return;
                    }
                    Alert.alert(
                      "Deactivate this account?",
                      `${item.name} will immediately lose access to Vortex.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Deactivate",
                          style: "destructive",
                          onPress: () => handleToggleActive(item.id, false),
                        },
                      ],
                    );
                  }}
                >
                  {item.status !== "OFF DUTY" ? "Deactivate" : "Activate"}
                </Button>
              </View>
            ) : null}
          </View>
        )}
      />
      {canManageStaff ? (
        <AddStaffSheet visible={addOpen} onClose={() => setAddOpen(false)} />
      ) : null}
    </Screen>
  );
}

function AddStaffSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createStaff = useCreateStaff();
  const { data: roles = [] } = useRoles();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    team: "",
    password: "",
  });
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Enter the staff member's full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!form.role) {
      setError("Select a role.");
      return;
    }
    if (form.password.length < 8) {
      setError("Temporary password must be at least 8 characters.");
      return;
    }
    try {
      await createStaff.mutateAsync({ ...form, isFreelancer });
      setForm({ name: "", phone: "", email: "", role: "", team: "", password: "" });
      setIsFreelancer(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add staff member.");
    }
  };

  return (
    <BottomSheet visible={visible} title="Add Staff Member" onClose={onClose}>
      <Field label="Full name">
        <Input
          value={form.name}
          onChangeText={(v) => set("name", v)}
          placeholder="e.g. Selam Worku"
        />
      </Field>
      <Field label="Phone">
        <Input
          value={form.phone}
          onChangeText={(v) => set("phone", v)}
          placeholder="+251 9.. ... ...."
          keyboardType="phone-pad"
        />
      </Field>
      <Field label="Email">
        <Input
          value={form.email}
          onChangeText={(v) => set("email", v)}
          placeholder="name@vortexvisual.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </Field>
      <Field label="Role">
        <View style={styles.chipWrap}>
          {roles.map((r) => (
            <Chip
              key={r.id}
              label={r.displayName}
              active={form.role === r.displayName}
              onPress={() => set("role", r.displayName)}
            />
          ))}
        </View>
      </Field>
      <Field label="Team">
        <Input
          value={form.team}
          onChangeText={(v) => set("team", v)}
          placeholder="e.g. Warehouse"
        />
      </Field>
      <Field label="Temporary password">
        <Input value={form.password} onChangeText={(v) => set("password", v)} secureTextEntry />
      </Field>
      <Field label="Freelancer">
        <View style={styles.chipWrap}>
          <Chip label="Staff" active={!isFreelancer} onPress={() => setIsFreelancer(false)} />
          <Chip label="Freelancer" active={isFreelancer} onPress={() => setIsFreelancer(true)} />
        </View>
      </Field>
      {error ? (
        <AppText variant="small" color={colors.destructive}>
          {error}
        </AppText>
      ) : null}
      <Button disabled={createStaff.isPending} onPress={handleSubmit}>
        {createStaff.isPending ? "Adding..." : "Add Staff Member"}
      </Button>
    </BottomSheet>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <AppText
        variant="data"
        color={active ? colors.accent : colors.text2}
        style={{ fontWeight: "800" }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
  },
  stats: {
    gap: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 112,
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 4,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.10)",
  },
});
