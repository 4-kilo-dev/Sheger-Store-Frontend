import { client, authStorage } from "@/lib/api/client";

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    phone?: string;
    email: string;
    role: string;
    team?: string;
    isFirstLogin?: boolean;
    mustChangePassword?: boolean;
  };
}

export async function loginApi(payload: any): Promise<LoginResponse> {
  const data = await client.post<LoginResponse>("/api/auth/login", payload);
  authStorage.setToken(data.accessToken);
  authStorage.setUser(data.user);

  if (typeof window !== "undefined") {
    const backendRole = data.user.role?.toLowerCase() || "";
    let matchedRole: "Admin" | "CCR" | "CTO" | "TO" | "OO" | "SK" | "SH" | "FL" = "Admin";
    if (backendRole === "admin" || backendRole === "supervisor") matchedRole = "Admin";
    else if (backendRole === "ccr") matchedRole = "CCR";
    else if (backendRole === "chief_tech") matchedRole = "CTO";
    else if (backendRole === "technician") matchedRole = "TO";
    else if (backendRole === "oo" || backendRole === "ops_officer") matchedRole = "OO";
    else if (backendRole === "storekeeper") matchedRole = "SK";
    else if (backendRole === "stagehand") matchedRole = "SH";
    else if (backendRole === "freelancer") matchedRole = "FL";

    const initials = data.user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

    const activeProfile = {
      name: data.user.name,
      role: matchedRole,
      initials,
      color: "var(--accent)",
    };

    localStorage.setItem("vortex_active_profile", JSON.stringify(activeProfile));
  }

  return data;
}

export async function changePasswordApi(payload: any): Promise<{ success: boolean }> {
  return client.post<{ success: boolean }>("/api/auth/change-password", payload);
}

export async function logoutApi(): Promise<void> {
  try {
    await client.post("/api/auth/logout");
  } catch (e) {
    // Ignore error to ensure client-side logout completes
  } finally {
    authStorage.clearToken();
    authStorage.clearUser();
    if (typeof window !== "undefined") {
      localStorage.removeItem("vortex_active_profile");
    }
  }
}
