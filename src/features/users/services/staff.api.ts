import { client } from "@/lib/api/client";
import { StaffMember } from "@/features/checkout/services/operations.api";

export interface Role {
  id: string;
  key: string;
  displayName: string;
}

export async function getRolesApi(): Promise<Role[]> {
  return client.get<Role[]>("/api/roles");
}

export async function getStaffApi(): Promise<StaffMember[]> {
  const users = await client.get<any[]>("/api/users");
  return users.map((u) => {
    // Determine the role name based on nested object structure
    const roleName = u.role?.displayName || (u.roles && u.roles[0]?.displayName) || "Staff";
    
    const initials = u.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return {
      name: u.name,
      role: roleName,
      team: u.team || "Operations",
      phone: u.phone || "",
      status: u.active ? "ACTIVE" : "OFF DUTY",
      jobs: u.jobs || 0,
      capacity: u.capacity || 30,
      initials: initials || "?",
      joinedDate: u.createdAt ? u.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    };
  });
}

export async function createStaffApi(payload: any): Promise<StaffMember> {
  // 1. Fetch roles list to map payload.role (displayName) to roleId
  const roles = await getRolesApi();
  const matchedRole = roles.find(
    (r) =>
      r.displayName.toLowerCase() === payload.role.toLowerCase() ||
      r.key.toLowerCase() === payload.role.toLowerCase()
  );

  if (!matchedRole) {
    throw new Error(`Role "${payload.role}" not found in backend roles.`);
  }

  // 2. Prepare payload for backend
  const backendPayload = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email || `${payload.name.toLowerCase().replace(/\s+/g, ".")}@vortexvisual.com`,
    password: payload.password,
    roleId: matchedRole.id,
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
    name: newUser.name,
    role: matchedRole.displayName,
    team: payload.team || "Operations",
    phone: newUser.phone || "",
    status: "ACTIVE",
    jobs: 0,
    capacity: 30,
    initials: initials || "?",
    joinedDate: new Date().toISOString().slice(0, 10),
  };
}
