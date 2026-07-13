import { client, authStorage } from "@/lib/api/client";
import type { AuthUser } from "@/hooks/use-auth-user";

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  mustChangePassword?: boolean;
  user: {
    id: string;
    name: string;
    phone?: string;
    email: string;
    role: string;
    roles?: string[];
    permissions?: string[];
    team?: string;
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
  };
}

function mapDisplayProfile(user: { name: string; role?: string; roles?: string[] }) {
  const backendRole = (user.roles?.[0] || user.role || "").toLowerCase();
  let matchedRole: "Admin" | "CCR" | "CTO" | "TO" | "OO" | "SK" | "SH" | "FL" = "Admin";
  if (backendRole === "admin" || backendRole === "supervisor") matchedRole = "Admin";
  else if (backendRole === "ccr") matchedRole = "CCR";
  else if (backendRole === "chief_tech") matchedRole = "CTO";
  else if (backendRole === "technician") matchedRole = "TO";
  else if (backendRole === "oo" || backendRole === "ops_officer" || backendRole === "operations_officer" || backendRole === "driver")
    matchedRole = "OO";
  else if (backendRole === "storekeeper") matchedRole = "SK";
  else if (backendRole === "stagehand") matchedRole = "SH";
  else if (backendRole === "freelancer") matchedRole = "FL";

  const initials =
    user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return {
    name: user.name,
    role: matchedRole,
    initials,
    color: "var(--accent)",
  };
}

function persistAuthUser(user: AuthUser) {
  authStorage.setUser({
    ...user,
    roles: user.roles ?? [],
    permissions: user.permissions ?? [],
    role: user.role || user.roles?.[0] || "staff",
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("vortex_active_profile", JSON.stringify(mapDisplayProfile(user)));
  }
}

/**
 * Refresh the stored user from GET /auth/me (effective DB permissions).
 * Call after login and on authenticated app bootstrap.
 */
export async function refreshAuthUser(): Promise<AuthUser> {
  const me = await client.get<MeResponse>("/api/auth/me");
  const user: AuthUser = {
    id: me.id,
    name: me.name,
    email: me.email,
    phone: me.phone,
    roles: me.roles ?? [],
    permissions: me.permissions ?? [],
    role: me.roles?.[0] || "staff",
  };
  persistAuthUser(user);
  return user;
}

export async function getMeApi(): Promise<MeResponse> {
  return client.get<MeResponse>("/api/auth/me");
}

export async function loginApi(payload: any): Promise<LoginResponse> {
  const data = await client.post<LoginResponse>("/api/auth/login", payload);
  authStorage.setToken(data.accessToken);

  const loginUser = data.user;
  persistAuthUser({
    id: loginUser.id,
    name: loginUser.name,
    email: loginUser.email,
    phone: loginUser.phone,
    team: loginUser.team,
    role: loginUser.role || loginUser.roles?.[0] || "staff",
    roles: loginUser.roles ?? (loginUser.role ? [loginUser.role] : []),
    permissions: loginUser.permissions ?? [],
  });

  // Prefer live /me so permissions always match the guard
  try {
    await refreshAuthUser();
  } catch {
    // Keep login payload if /me is not deployed yet
  }

  return data;
}

export async function changePasswordApi(payload: any): Promise<{ success: boolean }> {
  return client.post<{ success: boolean }>("/api/auth/change-password", payload);
}

export async function logoutApi(): Promise<void> {
  try {
    await client.post("/api/auth/logout");
  } catch {
    // Ignore error to ensure client-side logout completes
  } finally {
    authStorage.clearToken();
    authStorage.clearUser();
    if (typeof window !== "undefined") {
      localStorage.removeItem("vortex_active_profile");
    }
  }
}
