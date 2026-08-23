import { client } from "@/lib/api/client";
import { StaffMember } from "@/features/checkout/services/operations.api";

export interface Role {
  id: string;
  key: string;
  displayName: string;
}

export interface Permission {
  id: string;
  key: string;
  description?: string | null;
}

export interface RoleWithPermissions extends Role {
  isSystem: boolean;
  permissions: Permission[];
}

export async function getRolesApi(): Promise<Role[]> {
  return client.get<Role[]>("/api/roles");
}

/** Roles including their granted permission objects (from GET /roles). */
export async function getRolesWithPermissionsApi(): Promise<RoleWithPermissions[]> {
  return client.get<RoleWithPermissions[]>("/api/roles");
}

/** Full catalog of permission definitions. */
export async function getPermissionsApi(): Promise<Permission[]> {
  return client.get<Permission[]>("/api/permissions");
}

export async function createRoleApi(payload: Pick<Role, "key" | "displayName">): Promise<RoleWithPermissions> {
  return client.post<RoleWithPermissions>("/api/roles", payload);
}

export async function addRolePermissionApi(roleId: string, permissionId: string): Promise<RoleWithPermissions> {
  return client.post<RoleWithPermissions>(`/api/roles/${roleId}/permissions`, { permissionId });
}

export async function removeRolePermissionApi(roleId: string, permissionId: string): Promise<RoleWithPermissions> {
  return client.delete<RoleWithPermissions>(`/api/roles/${roleId}/permissions/${permissionId}`);
}

export async function getStaffApi(): Promise<StaffMember[]> {
  const [users, bookings] = await Promise.all([
    client.get<any[]>("/api/users"),
    client.get<any[]>("/api/bookings").catch(() => [] as any[]),
  ]);

  const jobsByUser = new Map<string, number>();
  const onsiteUsers = new Set<string>();
  for (const b of bookings || []) {
    const activeBooking = !["CANCELED", "DONE"].includes(String(b.status || ""));
    for (const a of b.assignments || []) {
      if (a.status === "DECLINED") continue;
      const uid = a.userId || a.user?.id;
      if (!uid) continue;
      if (activeBooking) {
        jobsByUser.set(uid, (jobsByUser.get(uid) || 0) + 1);
      }
      if (b.status === "ONSITE") {
        onsiteUsers.add(uid);
      }
    }
  }

  return users.map((u) => {
    const roleObj = u.role || (u.roles && u.roles[0]) || null;
    const roleName = roleObj?.displayName || "Staff";
    const roleKey = roleObj?.key || undefined;

    const initials = u.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const jobs = jobsByUser.get(u.id) || 0;
    let status: StaffMember["status"] = u.active ? "ACTIVE" : "OFF DUTY";
    if (u.active && onsiteUsers.has(u.id)) status = "ONSITE";

    return {
      id: u.id,
      name: u.name,
      role: roleName,
      roleKey,
      team: u.team?.trim() || "—",
      phone: u.phone || "",
      email: u.email || "",
      status,
      jobs,
      capacity: Math.max(jobs, 5),
      initials: initials || "?",
      joinedDate: u.createdAt ? u.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      isFreelancer: Boolean(u.isFreelancer),
    };
  });
}

export async function createStaffApi(payload: any): Promise<StaffMember> {
  // 1. Fetch roles list to map payload.role (displayName) to roleId
  const roles = await getRolesApi().catch(() => []);
  const matchedRole = roles.find(
    (r) =>
      r.displayName.toLowerCase() === payload.role.toLowerCase() ||
      r.key.toLowerCase() === payload.role.toLowerCase()
  );

  if (!matchedRole) {
    throw new Error(`Role "${payload.role}" not found in backend roles.`);
  }

  // 2. Prepare payload for backend
  const cleanPhone = (payload.phone || "").replace(/[^0-9]/g, "");
  const suffix = cleanPhone ? `.${cleanPhone.slice(-6)}` : "";
  const backendPayload = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email || `${payload.name.toLowerCase().replace(/\s+/g, ".")}${suffix}@vortexvisual.com`,
    password: payload.password,
    roleId: matchedRole.id,
    isFreelancer: Boolean(payload.isFreelancer),
    team: String(payload.team || "").trim() || undefined,
  };

  // 3. Post to users
  const newUser = await client.post<any>("/api/users", backendPayload);

  // 4. Return formatted StaffMember
  const initials = newUser.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    id: newUser.id,
    name: newUser.name,
    role: matchedRole.displayName,
    team: newUser.team || payload.team || "—",
    phone: newUser.phone || "",
    status: "ACTIVE",
    jobs: 0,
    capacity: 5,
    initials: initials || "?",
    joinedDate: new Date().toISOString().slice(0, 10),
    isFreelancer: Boolean(newUser.isFreelancer ?? payload.isFreelancer),
  };
}

export async function setStaffFreelancerApi(userId: string, isFreelancer: boolean): Promise<void> {
  await client.patch(`/api/users/${userId}`, { isFreelancer });
}

export async function updateStaffApi(
  userId: string,
  payload: Pick<StaffMember, "name" | "phone" | "team" | "isFreelancer"> & {
    email?: string;
    active: boolean;
  },
): Promise<StaffMember> {
  return client.patch<StaffMember>(`/api/users/${userId}`, {
    ...payload,
    team: payload.team === "—" ? "" : payload.team,
    email: payload.email?.trim() || undefined,
  });
}

export async function resetPasswordApi(userId: string): Promise<{ temporaryPassword: string }> {
  return client.post<{ temporaryPassword: string }>(`/api/users/${userId}/reset-password`);
}

export async function toggleUserActiveApi(userId: string, active: boolean): Promise<any> {
  return client.patch<any>(`/api/users/${userId}`, { active });
}
