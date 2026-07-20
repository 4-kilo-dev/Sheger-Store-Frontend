import { client } from "@/lib/api/client";
import type { StaffMember } from "@/types/domain";

export interface Role {
  id: string;
  key: string;
  displayName: string;
}

export async function getRolesApi(): Promise<Role[]> {
  return client.get<Role[]>("/api/roles");
}

interface RawUser {
  id: string;
  name: string;
  phone?: string;
  active?: boolean;
  team?: string;
  jobs?: number;
  capacity?: number;
  createdAt?: string;
  isFreelancer?: boolean;
  roles?: { displayName: string }[];
}

function toStaffMember(u: RawUser, roleName?: string): StaffMember {
  const initials =
    u.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return {
    id: u.id,
    name: u.name,
    role: roleName || u.roles?.[0]?.displayName || "Staff",
    team: u.team || "Operations",
    phone: u.phone || "",
    status: u.active ? "ACTIVE" : "OFF DUTY",
    jobs: u.jobs || 0,
    capacity: u.capacity || 30,
    initials,
    joinedDate: u.createdAt ? u.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    isFreelancer: Boolean(u.isFreelancer),
  };
}

export async function getStaffApi(): Promise<StaffMember[]> {
  const users = await client.get<RawUser[]>("/api/users");
  return users.map((u) => toStaffMember(u));
}

export async function createStaffApi(payload: {
  name: string;
  phone?: string;
  email?: string;
  password: string;
  role: string;
  team?: string;
  isFreelancer?: boolean;
}): Promise<StaffMember> {
  const roles = await getRolesApi().catch(() => []);
  const matchedRole = roles.find(
    (r) =>
      r.displayName.toLowerCase() === payload.role.toLowerCase() ||
      r.key.toLowerCase() === payload.role.toLowerCase(),
  );
  if (!matchedRole) {
    throw new Error(`Role "${payload.role}" not found in backend roles.`);
  }

  const newUser = await client.post<RawUser>("/api/users", {
    name: payload.name,
    phone: payload.phone,
    email: payload.email || `${payload.name.toLowerCase().replace(/\s+/g, ".")}@vortexvisual.com`,
    password: payload.password,
    roleId: matchedRole.id,
    isFreelancer: Boolean(payload.isFreelancer),
  });

  return toStaffMember(
    { ...newUser, active: true, team: payload.team, isFreelancer: payload.isFreelancer },
    matchedRole.displayName,
  );
}

export async function resetPasswordApi(userId: string): Promise<{ temporaryPassword: string }> {
  return client.post<{ temporaryPassword: string }>(`/api/users/${userId}/reset-password`);
}

export async function toggleUserActiveApi(userId: string, active: boolean): Promise<void> {
  await client.patch(`/api/users/${userId}`, { active });
}

export async function setStaffFreelancerApi(userId: string, isFreelancer: boolean): Promise<void> {
  await client.patch(`/api/users/${userId}`, { isFreelancer });
}
