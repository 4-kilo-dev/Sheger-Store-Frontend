import { authStorage, client } from "@/lib/api/client";
import type { Profile, UserRole } from "@/types/domain";

export interface AuthSession {
  profile: Profile;
  mustChangePassword: boolean;
}

interface LoginResponse {
  accessToken: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
  };
}

function mapBackendRole(role: string): UserRole {
  const normalized = role?.toLowerCase() || "";
  if (normalized === "admin" || normalized === "supervisor") return "Admin";
  if (normalized === "ccr") return "CCR";
  if (normalized === "chief_tech") return "CTO";
  if (normalized === "technician") return "TO";
  if (normalized === "oo" || normalized === "ops_officer") return "OO";
  if (normalized === "storekeeper") return "SK";
  return "Admin";
}

function toProfile(user: LoginResponse["user"]): Profile {
  const initials =
    user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return {
    name: user.name,
    role: mapBackendRole(user.role),
    initials,
    description: user.email,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const data = await client.post<LoginResponse>("/auth/login", { email, password });
    await authStorage.setToken(data.accessToken);
    const profile = toProfile(data.user);
    await authStorage.setUser(profile);
    return { profile, mustChangePassword: data.mustChangePassword };
  },

  async changePassword(newPassword: string, oldPassword?: string): Promise<{ success: true }> {
    await client.post("/auth/change-password", { oldPassword, newPassword });
    return { success: true };
  },

  async logout(): Promise<void> {
    try {
      await client.post("/auth/logout");
    } finally {
      await authStorage.clearToken();
      await authStorage.clearUser();
    }
  },

  async restoreSession(): Promise<AuthSession | null> {
    const token = await authStorage.getToken();
    if (!token) return null;
    const profile = await authStorage.getUser();
    if (!profile) return null;
    return { profile, mustChangePassword: false };
  },
};
