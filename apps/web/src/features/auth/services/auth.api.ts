import { client, authStorage } from "@/lib/api/client";
import type { AuthUser } from "@/hooks/use-auth-user";

// Persisted "first login: must change password" flag. Survives reloads so the
// forced-change flow is enforced on every render, not just right after login.
const MUST_CHANGE_PASSWORD_KEY = "vortex_must_change_password";

export function getMustChangePassword(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUST_CHANGE_PASSWORD_KEY) === "true";
}

function setMustChangePassword(value: boolean): void {
  if (typeof window === "undefined") return;
  if (value) localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, "true");
  else localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
}

export function clearMustChangePassword(): void {
  setMustChangePassword(false);
}

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

// --- Session validation (one server round-trip per page load) ---------------
// Guards initial render so protected pages never flash cached (possibly stale)
// role content before the token is confirmed valid by the backend.

let sessionValidated = false;
let sessionValidationInFlight: Promise<boolean> | null = null;

function hasStoredToken(): boolean {
  const token = authStorage.getToken();
  return !!(token && token !== "undefined" && token !== "null");
}

export function isSessionValidated(): boolean {
  return sessionValidated;
}

/** Mark the session valid without a round-trip (e.g. right after login). */
export function markSessionValidated(): void {
  sessionValidated = true;
}

/** Clear cached validation so the next load re-checks (e.g. on logout). */
export function resetSessionValidation(): void {
  sessionValidated = false;
  sessionValidationInFlight = null;
}

/**
 * Validate the stored token against the backend exactly once per page load.
 * Resolves `true` when the session is usable (valid token, or a transient
 * network error where the cached user is kept), and `false` when the token is
 * definitively invalid — the API client clears it on a 401 response.
 */
export function validateSession(): Promise<boolean> {
  if (sessionValidated) return Promise.resolve(true);
  if (!hasStoredToken()) return Promise.resolve(false);
  if (!sessionValidationInFlight) {
    sessionValidationInFlight = refreshAuthUser()
      .then(() => {
        sessionValidated = true;
        return true;
      })
      .catch(() => {
        // On 401 the API client has already cleared the token: treat as invalid.
        // Keep transient (network) failures signed in using the cached user.
        if (hasStoredToken()) {
          sessionValidated = true;
          return true;
        }
        return false;
      })
      .finally(() => {
        sessionValidationInFlight = null;
      });
  }
  return sessionValidationInFlight;
}

export async function loginApi(payload: any): Promise<LoginResponse> {
  const data = await client.post<LoginResponse>("/api/auth/login", payload);
  authStorage.setToken(data.accessToken);

  // Backend returns `mustChangePassword` at the top level (older clients also
  // read it off `user`). Persist it so the forced-change flow survives reloads.
  const mustChange = !!(
    data.mustChangePassword ??
    data.user?.mustChangePassword ??
    data.user?.isFirstLogin
  );
  setMustChangePassword(mustChange);

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

  // Freshly authenticated: skip the extra validation round-trip on next render.
  markSessionValidated();

  return data;
}

export interface ChangePasswordPayload {
  newPassword: string;
  // Required by the backend only when changing a password voluntarily (i.e. not
  // a forced first-login change).
  oldPassword?: string;
}

export async function changePasswordApi(
  payload: ChangePasswordPayload,
): Promise<{ message: string }> {
  const res = await client.post<{ message: string }>("/api/auth/change-password", payload);
  // Password changed: the backend cleared the DB flag, so clear it locally too.
  clearMustChangePassword();
  return res;
}

export async function logoutApi(): Promise<void> {
  try {
    await client.post("/api/auth/logout");
  } catch {
    // Ignore error to ensure client-side logout completes
  } finally {
    resetSessionValidation();
    clearMustChangePassword();
    authStorage.clearToken();
    authStorage.clearUser();
    if (typeof window !== "undefined") {
      localStorage.removeItem("vortex_active_profile");
    }
  }
}
