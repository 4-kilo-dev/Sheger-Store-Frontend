import {
  AlertTriangle,
  KeyRound,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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
  Section,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import {
  useBookings,
  useCreateAssignment,
  useCreateStaff,
  useResetPassword,
  useRoles,
  useSetStaffFreelancer,
  useStaff,
  useToggleUserActive,
  useUpdateStaff,
  useCreateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useRolesWithPermissions,
  useToggleRolePermission,
} from "@/hooks/useOperations";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { colors } from "@/theme/tokens";
import type { Booking, BookingStatus, StaffMember } from "@/types/domain";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { isChiefTechnicianRole } from "@/utils/staffRoles";

type RoleContext = "TECHNICIAN" | "CREW" | "OO";

function resolveRoleContext(person: StaffMember): RoleContext | null {
  const role = (person.role || "").toLowerCase();
  if (role.includes("technician") || role.includes("chief")) return "TECHNICIAN";
  if (
    role.includes("operation") ||
    role.includes("ops") ||
    role === "oo" ||
    role.includes("driver")
  ) {
    return "OO";
  }
  if (role.includes("stagehand") || role.includes("freelancer") || person.isFreelancer) {
    return "CREW";
  }
  return null;
}

function eligibleStatuses(roleContext: RoleContext): BookingStatus[] {
  if (roleContext === "TECHNICIAN") return ["CONFIRMED", "ASSIGNED"];
  return ["CONFIRMED", "ASSIGNED", "ACCEPTED", "PREPARATION", "ONSITE"];
}

export default function StaffScreen() {
  const { can } = usePermissions();
  const canViewStaff = can(PERMISSION.USER_VIEW);
  const canManageStaff = can(PERMISSION.USER_MANAGE);
  const { data: STAFF = [], isLoading, isError, refetch } = useStaff();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string>("All");
  const [addOpen, setAddOpen] = useState(false);
  const [assignPerson, setAssignPerson] = useState<StaffMember | null>(null);
  const [editPerson, setEditPerson] = useState<StaffMember | null>(null);
  const [activeView, setActiveView] = useState<"staff" | "roles">("staff");
  const resetPassword = useResetPassword();
  const canAssignFromStaff =
    can(PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN) || can(PERMISSION.ASSIGNMENT_ASSIGN_CREW);
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

  if (activeView === "roles") {
    return (
      <Screen>
        <View style={styles.header}>
          <AppText variant="eyebrow">People Operations</AppText>
          <AppText variant="title">Staff management</AppText>
          <SegmentedTabs
            tabs={["staff", "roles"] as const}
            value={activeView}
            onChange={setActiveView}
          />
        </View>
        <RolesPanel canManage={can(PERMISSION.ROLE_MANAGE)} />
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

  const ListHeader = () => (
    <>
      <View style={styles.header}>
        <View>
          <Field label="People Operations">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search staff, role or team..."
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </Field>
        </View>
        {canManageStaff ? <Button onPress={() => setAddOpen(true)}>Add Staff Member</Button> : null}
        {can(PERMISSION.ROLE_VIEW) ? (
          <Button variant="outline" icon={ShieldCheck} onPress={() => setActiveView("roles")}>
            Roles & permissions
          </Button>
        ) : null}
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
    </>
  );

  return (
    <Screen scroll={false}>
      <NativeList
        data={rows}
        keyExtractor={(item) => item.id}
        extraData={`${query}|${role}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <View style={{ gap: 8 }}>
            <StaffCard staff={item} />
            <View style={styles.rowActions}>
              {canAssignFromStaff && resolveRoleContext(item) ? (
                <Button variant="ghost" icon={UserPlus} onPress={() => setAssignPerson(item)}>
                  Assign
                </Button>
              ) : null}
              {canManageStaff ? (
                <>
                  <Button variant="ghost" onPress={() => setEditPerson(item)}>
                    Edit
                  </Button>
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
                </>
              ) : null}
            </View>
          </View>
        )}
      />
      {canManageStaff ? (
        <AddStaffSheet visible={addOpen} onClose={() => setAddOpen(false)} />
      ) : null}
      <AssignStaffToBookingSheet person={assignPerson} onClose={() => setAssignPerson(null)} />
      <EditStaffSheet person={editPerson} onClose={() => setEditPerson(null)} />
    </Screen>
  );
}

function RolesPanel({ canManage }: { canManage: boolean }) {
  const rolesQuery = useRolesWithPermissions();
  const permissionsQuery = usePermissionsCatalog();
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const togglePermission = useToggleRolePermission();
  const [displayName, setDisplayName] = useState("");
  const [key, setKey] = useState("");
  const roles = rolesQuery.data ?? [];
  const permissions = permissionsQuery.data ?? [];

  if (rolesQuery.isLoading || permissionsQuery.isLoading)
    return <LoadingState label="Loading roles..." />;
  if (rolesQuery.isError || permissionsQuery.isError)
    return <ErrorState detail="Could not load roles and permissions." />;

  const addRole = async () => {
    const name = displayName.trim();
    const roleKey = (key.trim() || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!name || !roleKey) return Alert.alert("Role details required", "Enter a role name.");
    try {
      await createRole.mutateAsync({ displayName: name, key: roleKey });
      setDisplayName("");
      setKey("");
    } catch (error) {
      Alert.alert(
        "Create failed",
        error instanceof Error ? error.message : "Could not create role.",
      );
    }
  };

  return (
    <>
      <Section title="Roles and permissions" icon={ShieldCheck}>
        {!canManage ? (
          <AppText variant="small" color={colors.text2}>
            You can view roles but need role.manage to change them.
          </AppText>
        ) : null}
        {roles.map((role) => {
          const granted = new Set(role.permissions.map((permission) => permission.key));
          return (
            <View key={role.id} style={styles.roleBlock}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: "800" }}>{role.displayName}</AppText>
                  <AppText variant="small" color={colors.text2}>
                    {role.key}
                  </AppText>
                </View>
                {canManage && !role.isSystem ? (
                  <Button
                    variant="danger"
                    icon={Trash2}
                    onPress={() =>
                      Alert.alert("Delete role", `Delete ${role.displayName}?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteRole.mutate(role.id),
                        },
                      ])
                    }
                  >
                    Delete
                  </Button>
                ) : null}
              </View>
              <View style={styles.chipWrap}>
                {permissions.map((permission) => (
                  <Button
                    key={permission.id}
                    variant={granted.has(permission.key) ? "success" : "outline"}
                    disabled={!canManage || togglePermission.isPending}
                    onPress={() =>
                      togglePermission.mutate({
                        roleId: role.id,
                        permissionId: permission.id,
                        active: !granted.has(permission.key),
                      })
                    }
                  >
                    {permission.key}
                  </Button>
                ))}
              </View>
            </View>
          );
        })}
      </Section>
      {canManage ? (
        <Section title="Create role" icon={Plus}>
          <Field label="Display name">
            <Input value={displayName} onChangeText={setDisplayName} placeholder="Warehouse Lead" />
          </Field>
          <Field label="Role key">
            <Input
              value={key}
              onChangeText={setKey}
              placeholder="warehouse_lead"
              autoCapitalize="none"
            />
          </Field>
          <Button disabled={createRole.isPending} onPress={addRole}>
            {createRole.isPending ? "Creating..." : "Create role"}
          </Button>
        </Section>
      ) : null}
    </>
  );
}

function EditStaffSheet({ person, onClose }: { person: StaffMember | null; onClose: () => void }) {
  const updateStaff = useUpdateStaff();
  const [form, setForm] = useState({ name: "", phone: "", email: "", team: "" });
  const [active, setActive] = useState(true);
  const [isFreelancer, setIsFreelancer] = useState(false);

  useEffect(() => {
    if (!person) return;
    setForm({
      name: person.name,
      phone: person.phone,
      email: person.email || "",
      team: person.team === "—" ? "" : person.team,
    });
    setActive(person.status !== "OFF DUTY");
    setIsFreelancer(person.isFreelancer);
  }, [person]);

  const save = async () => {
    if (!person) return;
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert("Details required", "Name and phone number are required.");
      return;
    }
    try {
      await updateStaff.mutateAsync({
        id: person.id,
        payload: { ...form, name: form.name.trim(), active, isFreelancer },
      });
      onClose();
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Could not update staff details.",
      );
    }
  };

  return (
    <BottomSheet visible={!!person} title="Edit staff member" onClose={onClose}>
      <Field label="Full name">
        <Input
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        />
      </Field>
      <Field label="Phone">
        <Input
          value={form.phone}
          onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
          keyboardType="phone-pad"
        />
      </Field>
      <Field label="Email">
        <Input
          value={form.email}
          onChangeText={(email) => setForm((current) => ({ ...current, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Team">
        <Input
          value={form.team}
          onChangeText={(team) => setForm((current) => ({ ...current, team }))}
        />
      </Field>
      <Field label="Account status">
        <View style={styles.chipWrap}>
          <Chip label="Active" active={active} onPress={() => setActive(true)} />
          <Chip label="Inactive" active={!active} onPress={() => setActive(false)} />
        </View>
      </Field>
      <Field label="Classification">
        <View style={styles.chipWrap}>
          <Chip label="Staff" active={!isFreelancer} onPress={() => setIsFreelancer(false)} />
          <Chip label="Freelancer" active={isFreelancer} onPress={() => setIsFreelancer(true)} />
        </View>
      </Field>
      <Button disabled={updateStaff.isPending} onPress={save}>
        {updateStaff.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </BottomSheet>
  );
}

function AssignStaffToBookingSheet({
  person,
  onClose,
}: {
  person: StaffMember | null;
  onClose: () => void;
}) {
  const { formatDate } = useDateFormatter();
  const { data: bookings = [], isLoading } = useBookings();
  const createAssignment = useCreateAssignment();
  const [bookingId, setBookingId] = useState("");
  const [asTeamLead, setAsTeamLead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleContext = person ? resolveRoleContext(person) : null;

  const options = useMemo(() => {
    if (!person || !roleContext) return [] as Booking[];
    const allowed = new Set(eligibleStatuses(roleContext));
    return bookings
      .filter((b) => allowed.has(b.status))
      .filter((b) => {
        const already = (b.assignments || []).some(
          (a) => a.userId === person.id && a.roleContext === roleContext && !a.declineReason,
        );
        return !already;
      })
      .sort((a, b) => (b.assemblyDate || "").localeCompare(a.assemblyDate || ""));
  }, [bookings, person, roleContext]);

  const handleAssign = async () => {
    if (!person?.id) return;
    if (!roleContext) {
      setError(
        `${person.name} cannot be assigned from Staff — their role is not TECHNICIAN, CREW, or OO.`,
      );
      return;
    }
    if (!bookingId) {
      setError("Select a booking.");
      return;
    }
    setError(null);
    try {
      await createAssignment.mutateAsync({
        bookingId,
        payload: {
          userId: person.id,
          roleContext,
          isTeamLead:
            roleContext === "CREW"
              ? asTeamLead
              : roleContext === "TECHNICIAN" && isChiefTechnicianRole(person.role),
        },
      });
      setBookingId("");
      setAsTeamLead(false);
      onClose();
      Alert.alert("Assigned", `${person.name} assigned to booking.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign staff.");
    }
  };

  return (
    <BottomSheet
      visible={!!person}
      title={person ? `Assign ${person.name}` : "Assign staff"}
      onClose={() => {
        setBookingId("");
        setAsTeamLead(false);
        setError(null);
        onClose();
      }}
    >
      {!person ? null : !roleContext ? (
        <AppText variant="subtitle" color={colors.text2}>
          Only technicians, stagehands/freelancers (crew), and operations officers can be assigned
          to bookings from here.
        </AppText>
      ) : (
        <>
          <AppText variant="small" color={colors.text3}>
            {person.role} · {roleContext}
            {roleContext === "TECHNICIAN" ? " · CONFIRMED / ASSIGNED only" : ""}
          </AppText>
          <Field label="Booking">
            {isLoading ? (
              <LoadingState label="Loading bookings..." />
            ) : options.length === 0 ? (
              <AppText variant="subtitle" color={colors.text3}>
                No eligible open bookings for this role.
              </AppText>
            ) : (
              <View style={styles.chipWrap}>
                {options.map((b) => (
                  <Chip
                    key={b.id}
                    label={`${b.code} · ${b.status} · ${b.client} · ${formatDate(b.assemblyDate || b.eventDate)}`}
                    active={bookingId === b.id}
                    onPress={() => setBookingId(b.id)}
                  />
                ))}
              </View>
            )}
          </Field>
          {roleContext === "CREW" ? (
            <Field label="Stagehand team lead">
              <View style={styles.chipWrap}>
                <Chip label="Yes" active={asTeamLead} onPress={() => setAsTeamLead(true)} />
                <Chip label="No" active={!asTeamLead} onPress={() => setAsTeamLead(false)} />
              </View>
            </Field>
          ) : null}
          {error ? (
            <AppText variant="small" color={colors.destructive}>
              {error}
            </AppText>
          ) : null}
          <Button disabled={!bookingId || createAssignment.isPending} onPress={handleAssign}>
            {createAssignment.isPending ? "Assigning..." : "Assign"}
          </Button>
        </>
      )}
    </BottomSheet>
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
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  roleBlock: {
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
