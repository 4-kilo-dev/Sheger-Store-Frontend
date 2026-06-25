import { client, authStorage } from "@/lib/api/client";

export interface LoginResponse {
  token: string;
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
  authStorage.setToken(data.token);
  authStorage.setUser(data.user);
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
  }
}
