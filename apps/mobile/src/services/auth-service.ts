import * as SecureStore from "expo-secure-store";
import { authStorage, client } from "@/lib/api/client";
import type { AuthUser, Profile, UserRole } from "@/types/domain";

const MUST_CHANGE_PASSWORD_KEY = "vortex_must_change_password";

export interface AuthSession {
  profile: Profile;
  authUser: AuthUser;
  mustChangePassword: boolean;
}

interface LoginResponse {
  accessToken: string;
  mustChangePassword?: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    roles?: string[];
    permissions?: string[];
    team?: string;
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
  };
}

interface MeResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  permissions: string[];
}

/** Mirrors apps/web/src/features/auth/services/auth.api.ts mapDisplayProfile — keep roles in sync. */
function mapBackendRole(role: string): UserRole {
  const normalized = role?.toLowerCase() || "";
  if (normalized === "admin" || normalized === "supervisor") return "Admin";
  if (normalized === "ccr") return "CCR";
  if (normalized === "chief_tech") return "CTO";
  if (normalized === "technician") return "TO";
  if (
    normalized === "oo" ||
    normalized === "ops_officer" ||
    normalized === "operations_officer" ||
    normalized === "driver"
  )
    return "OO";
  if (normalized === "storekeeper") return "SK";
  if (normalized === "stagehand") return "SH";
  if (normalized === "freelancer") return "FL";
  return "Admin";
}

function toProfile(user: {
  name: string;
  role?: string;
  roles?: string[];
  email: string;
}): Profile {
  const backendRole = user.roles?.[0] || user.role || "";
  const initials =
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return {
    name: user.name,
    role: mapBackendRole(backendRole),
    initials,
    description: user.email,
  };
}

async function getMustChangePassword(): Promise<boolean> {
  return (await SecureStore.getItemAsync(MUST_CHANGE_PASSWORD_KEY)) === "true";
}

async function setMustChangePassword(value: boolean): Promise<void> {
  if (value) await SecureStore.setItemAsync(MUST_CHANGE_PASSWORD_KEY, "true");
  else await SecureStore.deleteItemAsync(MUST_CHANGE_PASSWORD_KEY);
}

async function persistAuthUser(user: AuthUser): Promise<void> {
  await authStorage.setUser(user);
}

/** Refresh the stored user from GET /api/auth/me (effective permissions). */
async function refreshAuthUser(): Promise<AuthUser> {
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
  await persistAuthUser(user);
  return user;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const data = await client.post<LoginResponse>("/api/auth/login", { email, password });
    await authStorage.setToken(data.accessToken);

    const mustChange = !!(
      data.mustChangePassword ??
      data.user?.mustChangePassword ??
      data.user?.isFirstLogin
    );
    await setMustChangePassword(mustChange);

    const loginUser = data.user;
    let authUser: AuthUser = {
      id: loginUser.id,
      name: loginUser.name,
      email: loginUser.email,
      phone: loginUser.phone,
      team: loginUser.team,
      role: loginUser.role || loginUser.roles?.[0] || "staff",
      roles: loginUser.roles ?? (loginUser.role ? [loginUser.role] : []),
      permissions: loginUser.permissions ?? [],
    };
    await persistAuthUser(authUser);

    // Prefer live /me so permissions always match the guard.
    try {
      authUser = await refreshAuthUser();
    } catch {
      // Keep login payload if /me is not reachable yet.
    }

    return { profile: toProfile(authUser), authUser, mustChangePassword: mustChange };
  },

  async changePassword(newPassword: string, oldPassword?: string): Promise<{ success: true }> {
    await client.post("/api/auth/change-password", { oldPassword, newPassword });
    await setMustChangePassword(false);
    return { success: true };
  },

  async logout(): Promise<void> {
    try {
      await client.post("/api/auth/logout");
    } finally {
      await authStorage.clearToken();
      await authStorage.clearUser();
      await setMustChangePassword(false);
    }
  },

  async restoreSession(): Promise<AuthSession | null> {
    const token = await authStorage.getToken();
    if (!token) return null;
    let authUser = (await authStorage.getUser()) as AuthUser | null;
    if (!authUser) return null;

    // Refresh permissions from the backend on every cold start so RBAC never
    // relies on a stale cached grant set.
    try {
      authUser = await refreshAuthUser();
    } catch {
      // Keep cached user on transient network failure.
    }

    const mustChangePassword = await getMustChangePassword();
    return { profile: toProfile(authUser), authUser, mustChangePassword };
  },
};
