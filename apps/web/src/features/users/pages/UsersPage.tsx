import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  UserCheck,
  Users,
  Radio,
  BriefcaseBusiness,
  Phone,
  Calendar,
  ShieldCheck,
  UsersRound,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import {
  STAFF_ROLES,
  staffMatchesRoleFilter,
  type StaffMember,
} from "@/features/checkout/services/operations.api";
import { AddStaffModal } from "../components/AddStaffModal";
import { AssignStaffToBookingModal } from "../components/AssignStaffToBookingModal";
import { EditStaffModal } from "../components/EditStaffModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStaffApi,
  getPermissionsApi,
  getRolesWithPermissionsApi,
  createRoleApi,
  deleteRoleApi,
  addRolePermissionApi,
  removeRolePermissionApi,
  resetPasswordApi,
  toggleUserActiveApi,
  setStaffFreelancerApi,
  type RoleWithPermissions,
} from "@/features/users/services/staff.api";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";
import { toast } from "sonner";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const _Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff · Vortex Visual" },
      { name: "description", content: "Manage Vortex Visual staff, roles, teams, and availability." },
    ],
  }),
  component: StaffPage,
});

const statusColor: Record<string, string> = {
  ACTIVE: "var(--color-bom-returned)",
  ONSITE: "var(--color-status-accepted)",
  "OFF DUTY": "var(--text-3)",
  "ON LEAVE": "var(--color-pay-advance)",
};

function roleKeyFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function StaffPage() {
  const [activeView, setActiveView] = useState<"staff" | "roles">("staff");
  const [pendingPermissionByRole, setPendingPermissionByRole] = useState<Record<string, string>>({});
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof STAFF_ROLES)[number]>("All");
  const [assignPerson, setAssignPerson] = useState<StaffMember | null>(null);
  const [editingPerson, setEditingPerson] = useState<StaffMember | null>(null);
  const { can } = usePermissions();
  const { formatDate } = useDateFormatter();
  const canViewStaff = can(PERMISSION.USER_VIEW);
  const canManageStaff = can(PERMISSION.USER_MANAGE);
  const canViewRoles = can(PERMISSION.ROLE_VIEW);
  const canManageRoles = can(PERMISSION.ROLE_MANAGE);
  const canAssignStaff =
    can(PERMISSION.ASSIGNMENT_ASSIGN_TECHNICIAN) || can(PERMISSION.ASSIGNMENT_ASSIGN_CREW);
  const queryClient = useQueryClient();

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: getStaffApi,
    enabled: canViewStaff,
  });
  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleWithPermissions[]>({
    queryKey: ["roles-with-permissions"],
    queryFn: getRolesWithPermissionsApi,
    enabled: canViewStaff && canViewRoles && activeView === "roles",
  });
  const { data: permissions = [] } = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: getPermissionsApi,
    enabled: canViewStaff && canViewRoles && activeView === "roles",
  });

  const canViewBookings =
    can(PERMISSION.BOOKING_VIEW_ALL) || can(PERMISSION.BOOKING_VIEW_ASSIGNED);
  const { data: bookingsList = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
    enabled: canViewBookings,
  });

  const { mutate: resetPassword } = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: (res, userId) => {
      const userObj = staffList.find((s) => s.id === userId);
      toast.success(
        `Password reset for ${userObj?.name || "staff"}! Temporary password: ${res.temporaryPassword}`,
        { duration: 15000, description: "Copy and share securely. User must update it on first login." }
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reset password");
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      toggleUserActiveApi(userId, active),
    onSuccess: (_, variables) => {
      toast.success(variables.active ? "Account activated successfully" : "Account deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to toggle account status");
    },
  });

  const { mutate: toggleFreelancer } = useMutation({
    mutationFn: ({ userId, isFreelancer }: { userId: string; isFreelancer: boolean }) =>
      setStaffFreelancerApi(userId, isFreelancer),
    onSuccess: (_, variables) => {
      toast.success(variables.isFreelancer ? "Marked as freelancer" : "Freelancer flag removed");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update freelancer flag");
    },
  });

  const { mutate: updateRolePermission, isPending: updatingRolePermission } = useMutation({
    mutationFn: ({ roleId, permissionId, granted }: { roleId: string; permissionId: string; granted: boolean }) =>
      granted
        ? removeRolePermissionApi(roleId, permissionId)
        : addRolePermissionApi(roleId, permissionId),
    onSuccess: (_, variables) => {
      toast.success(variables.granted ? "Permission revoked" : "Permission granted");
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      setPendingPermissionByRole((current) => ({ ...current, [variables.roleId]: "" }));
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role permission");
    },
  });

  const { mutate: createRole, isPending: creatingRole } = useMutation({
    mutationFn: createRoleApi,
    onSuccess: (role) => {
      toast.success(`${role.displayName} role created`);
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setCreateRoleOpen(false);
      setRoleName("");
      setRoleKey("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create role");
    },
  });

  const { mutate: deleteRole, isPending: deletingRole } = useMutation({
    mutationFn: deleteRoleApi,
    onSuccess: () => {
      toast.success("Role deleted");
      queryClient.invalidateQueries({ queryKey: ["roles-with-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete role");
    },
  });

  const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = roleName.trim();
    const key = roleKeyFromName(roleKey || roleName);
    if (!displayName || !key) {
      toast.error("Enter a role name and a valid role key.");
      return;
    }
    createRole({ displayName, key });
  };

  const handleResetPassword = (userId: string, name: string) => {
    if (confirm(`Are you sure you want to reset the password for ${name}?`)) {
      resetPassword(userId);
    }
  };

  const handleToggleActive = (userId: string, currentActive: boolean) => {
    const action = currentActive ? "deactivate" : "activate";
    if (confirm(`Are you sure you want to ${action} this staff member's account?`)) {
      toggleActive({ userId, active: !currentActive });
    }
  };

  const rows = useMemo(
    () =>
      staffList.filter(
        (person) =>
          staffMatchesRoleFilter(person, roleFilter) &&
          `${person.name} ${person.role} ${person.team}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, roleFilter, staffList],
  );

  const counts = useMemo(() => {
    const openAssignments = bookingsList.filter(
      (b) =>
        (b.status === "CONFIRMED" || b.status === "ASSIGNED") &&
        (!b.assignees || b.assignees.length === 0),
    ).length;
    return {
      total: staffList.length,
      active: staffList.filter((s) => s.status === "ACTIVE").length,
      onsite: staffList.filter((s) => s.status === "ONSITE").length,
      openAssignments,
    };
  }, [staffList, bookingsList]);

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:gap-4">
        <div>
          <div className="label-eyebrow mb-1">People Operations</div>
          <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight">Staff Management</h1>
          <p className="mt-1 text-[12px] text-text-2">Roles, duty status, workload, and crew contact directory.</p>
        </div>
        {canManageStaff && (
          <div className="self-start">
            <AddStaffModal />
          </div>
        )}
      </div>

      {!canViewStaff ? (
        <div
          className="rounded-lg border p-8 text-center text-[13px]"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-2)" }}
        >
          You need <code className="font-mono text-[11px]">user.view</code> to see the staff directory.
        </div>
      ) : (
      <>
      {/* Stats */}
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Staff", value: String(counts.total), note: `Across ${STAFF_ROLES.length - 1} operational roles`, icon: Users },
          { label: "Available Now", value: String(counts.active), note: "Ready for assignment", icon: UserCheck },
          { label: "Currently Onsite", value: String(counts.onsite), note: "Across active jobs", icon: Radio },
          { label: "Open Assignments", value: String(counts.openAssignments), note: "Need crew allocation", icon: BriefcaseBusiness },
        ].map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <span className="label-eyebrow">{label}</span>
              <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
            </div>
            <div className="mt-3 text-[22px] font-bold">{value}</div>
            <div className="mt-1 text-[11px] text-text-2">{note}</div>
          </div>
        ))}
      </div>

      {canViewRoles && (
        <div className="mb-4 flex border-b" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setActiveView("staff")}
            className="flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-semibold"
            style={{
              borderColor: activeView === "staff" ? "var(--accent)" : "transparent",
              color: activeView === "staff" ? "var(--foreground)" : "var(--text-2)",
            }}
          >
            <Users className="h-3.5 w-3.5" /> Staff
          </button>
          <button
            type="button"
            onClick={() => setActiveView("roles")}
            className="flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-semibold"
            style={{
              borderColor: activeView === "roles" ? "var(--accent)" : "transparent",
              color: activeView === "roles" ? "var(--foreground)" : "var(--text-2)",
            }}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Roles
          </button>
        </div>
      )}

      {activeView === "staff" ? (
      <>
      {/* Role filter tabs */}
      <div className="mb-3 scrollable-tabs gap-1 border-b" style={{ borderColor: "var(--border)" }}>
        {STAFF_ROLES.map((role) => {
          const active = roleFilter === role;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className="relative px-3 py-2.5 text-[12px] font-semibold transition whitespace-nowrap"
              style={{ color: active ? "var(--foreground)" : "var(--text-2)" }}
            >
              {role}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: "var(--text-3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff, role or team…"
            className="h-9 w-full rounded-md border bg-[var(--surface-2)] pl-9 pr-3 text-xs outline-none focus:border-[var(--accent)]"
            style={{ borderColor: "var(--border)" }}
          />
        </div>
        <span className="text-xs" style={{ color: "var(--text-2)" }}>{rows.length} staff visible</span>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          return (
            <div key={p.id || p.name} className="group rounded-lg border p-4 transition hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                    {p.initials}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold">{p.name}</div>
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
                      <span>{p.role}</span>
                      {p.isFreelancer && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
                        >
                          Freelancer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span
                  className="rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ borderColor: "var(--border)", color: statusColor[p.status] || "var(--text-2)" }}
                >
                  {p.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                <div className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
                  <Users className="h-3 w-3" /> {p.team}
                </div>
                <div className="flex items-center gap-1.5 font-mono" style={{ color: "var(--text-2)" }}>
                  <Phone className="h-3 w-3" /> {p.phone.slice(-9)}
                </div>
              </div>

              {/* Workload — active assignments from live bookings */}
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[10px]">
                  <span style={{ color: "var(--text-3)" }}>Active assignments</span>
                  <span
                    className="font-mono font-semibold"
                    style={{ color: p.jobs >= 5 ? "var(--destructive)" : "var(--accent)" }}
                  >
                    {p.jobs} job{p.jobs === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((p.jobs / 5) * 100, 100)}%`,
                      background: p.jobs >= 5 ? "var(--destructive)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>

               {canManageStaff && p.id && (
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setEditingPerson(p)}
                    title={`Edit ${p.name}`}
                    className="rounded bg-[var(--surface-2)] p-1.5 transition hover:bg-border"
                    style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleResetPassword(p.id!, p.name)}
                    className="rounded bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold transition hover:bg-border cursor-pointer"
                    style={{ color: "var(--text-2)", border: "1px solid var(--border)" }}
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => toggleFreelancer({ userId: p.id!, isFreelancer: !p.isFreelancer })}
                    className="rounded px-2.5 py-1 text-[10px] font-semibold transition cursor-pointer"
                    style={{
                      background: p.isFreelancer ? "rgba(16, 185, 129, 0.12)" : "var(--surface-2)",
                      color: p.isFreelancer ? "#10b981" : "var(--text-2)",
                      border: p.isFreelancer ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid var(--border)",
                    }}
                  >
                    {p.isFreelancer ? "Freelancer ✓" : "Mark Freelancer"}
                  </button>
                  <button
                    onClick={() => handleToggleActive(p.id!, p.status !== "OFF DUTY")}
                    className="rounded px-2.5 py-1 text-[10px] font-semibold transition cursor-pointer"
                    style={{
                      background: p.status !== "OFF DUTY" ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                      color: p.status !== "OFF DUTY" ? "#f87171" : "#4ade80",
                      border: p.status !== "OFF DUTY" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    {p.status !== "OFF DUTY" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t pt-3 text-[10px]" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-3)" }}>
                  <Calendar className="mr-1 inline h-3 w-3" />
                  Joined {formatDate(p.joinedDate)}
                </span>
                {canAssignStaff ? (
                  <button
                    type="button"
                    className="font-semibold cursor-pointer hover:underline"
                    style={{ color: "var(--accent)" }}
                    onClick={() => setAssignPerson(p)}
                  >
                    Assign to Booking →
                  </button>
                ) : (
                  <span style={{ color: "var(--text-3)" }}>No assign permission</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      ) : (
        <>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold">Roles and permissions</h2>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>
              Create a role, then grant or revoke its permissions below.
            </p>
          </div>
          {canManageRoles && (
            <button
              type="button"
              onClick={() => setCreateRoleOpen(true)}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Create role
            </button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rolesLoading ? (
            <div className="col-span-full py-10 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
              Loading roles…
            </div>
          ) : (
            roles.map((role) => {
              const members = staffList.filter(
                (person) =>
                  person.roleKey === role.key ||
                  person.role.toLowerCase() === role.displayName.toLowerCase(),
              );
              const availablePermissions = permissions.filter(
                (permission) => !role.permissions.some((granted) => granted.id === permission.id),
              );
              const selectedPermissionId = pendingPermissionByRole[role.id] || "";
              return (
                <section
                  key={role.id}
                  className="rounded-lg border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[14px] font-bold">
                        <ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
                        {role.displayName}
                      </div>
                      <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                        {role.key}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded border px-2 py-0.5 text-[10px] font-semibold"
                        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                      >
                        {role.permissions.length} permissions
                      </span>
                      {canManageRoles && !role.isSystem && (
                        <button
                          type="button"
                          disabled={deletingRole}
                          title={`Delete ${role.displayName}`}
                          aria-label={`Delete ${role.displayName}`}
                          onClick={() => {
                            const staffWarning = members.length
                              ? ` ${members.length} staff member${members.length === 1 ? "" : "s"} will lose this role.`
                              : "";
                            if (confirm(`Delete the ${role.displayName} role? This cannot be undone.${staffWarning}`)) {
                              deleteRole(role.id);
                            }
                          }}
                          className="rounded border p-1.5 text-destructive disabled:opacity-50"
                          style={{ borderColor: "rgba(239, 68, 68, 0.45)" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      <UsersRound className="h-3.5 w-3.5" /> {members.length} staff members
                    </div>
                    {members.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {members.map((member) => (
                          <span
                            key={member.id || member.name}
                            className="rounded border px-2 py-1 text-[10px]"
                            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                          >
                            {member.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px]" style={{ color: "var(--text-3)" }}>No staff assigned</span>
                    )}
                  </div>

                  <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="mb-2 text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                      Granted permissions
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.map((permission) => (
                        <button
                          type="button"
                          key={permission.id}
                          disabled={!canManageRoles || updatingRolePermission}
                          onClick={() => {
                            if (confirm(`Revoke ${permission.key} from ${role.displayName}?`)) {
                              updateRolePermission({
                                roleId: role.id,
                                permissionId: permission.id,
                                granted: true,
                              });
                            }
                          }}
                          title={canManageRoles ? `Revoke ${permission.key}` : undefined}
                          className="rounded border px-1.5 py-0.5 font-mono text-[9px] disabled:cursor-default"
                          style={{
                            borderColor: "var(--border)",
                            color: canManageRoles ? "var(--accent)" : "var(--text-2)",
                          }}
                        >
                          {permission.key}
                        </button>
                      ))}
                    </div>
                    {canManageRoles && (
                      <div className="mt-3 flex gap-2">
                        <select
                          value={selectedPermissionId}
                          onChange={(event) =>
                            setPendingPermissionByRole((current) => ({
                              ...current,
                              [role.id]: event.target.value,
                            }))
                          }
                          className="h-8 min-w-0 flex-1 rounded border bg-[var(--surface-2)] px-2 text-[10px]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <option value="">Add a permission</option>
                          {availablePermissions.map((permission) => (
                            <option key={permission.id} value={permission.id}>
                              {permission.key}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedPermissionId || updatingRolePermission}
                          onClick={() =>
                            updateRolePermission({
                              roleId: role.id,
                              permissionId: selectedPermissionId,
                              granted: false,
                            })
                          }
                          className="h-8 shrink-0 rounded border px-2.5 text-[10px] font-semibold disabled:opacity-40"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                        >
                          Grant
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
        </>
      )}
      </>
      )}
      <Dialog
        open={createRoleOpen}
        onOpenChange={(open) => {
          setCreateRoleOpen(open);
          if (!open) {
            setRoleName("");
            setRoleKey("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateRole}>
            <DialogHeader>
              <DialogTitle>Create role</DialogTitle>
              <DialogDescription>
                Roles start without permissions. Grant the required permissions from the Roles tab after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <label className="grid gap-1.5 text-[12px] font-medium">
                Role name
                <Input
                  value={roleName}
                  onChange={(event) => {
                    const name = event.target.value;
                    setRoleName(name);
                    if (!roleKey) setRoleKey(roleKeyFromName(name));
                  }}
                  placeholder="e.g. Client Relations Coordinator"
                  autoFocus
                />
              </label>
              <label className="grid gap-1.5 text-[12px] font-medium">
                Role key
                <Input
                  value={roleKey}
                  onChange={(event) => setRoleKey(roleKeyFromName(event.target.value))}
                  placeholder="e.g. client_relations_coordinator"
                />
                <span className="text-[10px] font-normal" style={{ color: "var(--text-3)" }}>
                  The key is used internally and cannot be changed later.
                </span>
              </label>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setCreateRoleOpen(false)}
                className="h-9 rounded-md border px-3 text-[12px] font-semibold"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingRole || !roleName.trim()}
                className="h-9 rounded-md px-3 text-[12px] font-semibold disabled:opacity-50"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {creatingRole ? "Creating..." : "Create role"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AssignStaffToBookingModal
        person={assignPerson}
        open={!!assignPerson}
        onClose={() => setAssignPerson(null)}
      />
      <EditStaffModal
        person={editingPerson}
        open={!!editingPerson}
        onClose={() => setEditingPerson(null)}
      />
    </AppShell>
  );
}
