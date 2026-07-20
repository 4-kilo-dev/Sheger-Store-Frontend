import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { to } from "@/utils/routes";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const TOKEN_KEY = "vortex_auth_token";
const USER_KEY = "vortex_auth_user";

export const authStorage = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clearToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  getUser: async () => {
    const user = await SecureStore.getItemAsync(USER_KEY);
    try {
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: unknown) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  clearUser: () => SecureStore.deleteItemAsync(USER_KEY),
};

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // The backend has no global "/api" prefix; strip it here so every service
  // file can use "/api/..." paths for parity with the web client, which does
  // the same normalization before hitting the real backend.
  const targetPath = path.startsWith("/api") ? path.replace(/^\/api/, "") : path;
  const url = targetPath.startsWith("http") ? targetPath : `${BASE_URL}${targetPath}`;

  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = await authStorage.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  let data: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (response.status === 401) {
      await authStorage.clearToken();
      await authStorage.clearUser();
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        router.replace(to("/login"));
      }
    }
    const body =
      data && typeof data === "object" ? (data as { message?: unknown; error?: unknown }) : null;
    const errorMessage = body?.message || body?.error || response.statusText || "Request failed";
    throw new ApiError(
      Array.isArray(errorMessage) ? errorMessage.join(", ") : String(errorMessage),
      response.status,
      data,
    );
  }

  return data as T;
}

export const client = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export { ApiError };
