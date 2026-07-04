import { BriefcaseBusiness, Calendar, Radio, Search, UserCheck, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StaffCard } from "@/components/cards";
import { Button, Field, Input, NativeList, Screen, SegmentedTabs, StatCard } from "@/components/ui";
import { STAFF, STAFF_ROLES } from "@/data/mock";

export default function StaffScreen() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof STAFF_ROLES)[number]>("All");
  const rows = useMemo(
    () =>
      STAFF.filter(
        (person) =>
          (role === "All" || person.role === role) &&
          `${person.name} ${person.role} ${person.team}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, role],
  );
  const counts = {
    total: STAFF.length,
    active: STAFF.filter((person) => person.status === "ACTIVE").length,
    onsite: STAFF.filter((person) => person.status === "ONSITE").length,
    openAssignments: 7,
  };

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
        <Button>Add Staff Member</Button>
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
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <StaffCard staff={item} />}
      />
    </Screen>
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
