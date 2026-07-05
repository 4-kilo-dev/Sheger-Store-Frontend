import { BriefcaseBusiness, Calendar, Radio, Search, UserCheck, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { STAFF_ROLES } from "@/data/mock";
import { useCreateStaff, useStaff } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";

export default function StaffScreen() {
  const { data: STAFF = [], isLoading, isError, refetch } = useStaff();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof STAFF_ROLES)[number]>("All");
  const [addOpen, setAddOpen] = useState(false);
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
    onsite: STAFF.filter((person) => person.status === "ONSITE").length,
    openAssignments: 7,
  };

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
        <Button onPress={() => setAddOpen(true)}>Add Staff Member</Button>
      </View>
      <View style={styles.stats}>
        <StatCard
          label="Total Staff"
          value={counts.total}
          note={`Across ${STAFF_ROLES.length - 1} operational roles`}
          icon={Users}
        />
        <StatCard
          label="Available Now"
          value={counts.active}
          note="Ready for assignment"
          icon={UserCheck}
        />
        <StatCard
          label="Currently Onsite"
          value={counts.onsite}
          note="Across active jobs"
          icon={Radio}
        />
        <StatCard
          label="Open Assignments"
          value={counts.openAssignments}
          note="Need crew allocation"
          icon={BriefcaseBusiness}
        />
      </View>
      <SegmentedTabs tabs={STAFF_ROLES} value={role} onChange={setRole} />
      <Button variant="ghost" icon={Search}>
        {rows.length} staff visible
      </Button>
      <NativeList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <StaffCard staff={item} />}
      />
      <AddStaffSheet visible={addOpen} onClose={() => setAddOpen(false)} />
    </Screen>
  );
}

function AddStaffSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createStaff = useCreateStaff();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    team: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    try {
      await createStaff.mutateAsync(form);
      setForm({ name: "", phone: "", email: "", role: "", team: "", password: "" });
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
      <Field label="Role (must match a backend role name)">
        <Input
          value={form.role}
          onChangeText={(v) => set("role", v)}
          placeholder="e.g. Storekeeper"
        />
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
});
