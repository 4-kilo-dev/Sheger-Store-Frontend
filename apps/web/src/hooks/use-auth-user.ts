import { useState, useEffect } from "react";
import { authStorage } from "@/lib/api/client";

/**
 * Backend auth user from login / GET /auth/me.
 * - `permissions` = raw DB union of permission keys (sole source for can()).
 * - `roles` = informational role keys (badges / admin UX).
 * - `role` = cosmetic first role (display / back-compat only — never gate on it).
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  team?: string;
}

/**
 * Hook that exposes the stored backend user (login or /auth/me).
 * For permission checks use `usePermissions()` / `can()`.
 * For display (name, initials, color), use `useActiveProfile()`.
 */
export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = authStorage.getUser();
    if (stored) setUser(stored);
  }, []);

  useEffect(() => {
    const syncUser = () => {
      const stored = authStorage.getUser();
      setUser(stored);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vortex_auth_user") {
        syncUser();
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("vortex-auth-change", syncUser);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vortex-auth-change", syncUser);
    };
  }, []);

  return user;
}
