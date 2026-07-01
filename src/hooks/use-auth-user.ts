import { useState, useEffect } from "react";
import { authStorage } from "@/lib/api/client";

/**
 * The raw user object returned by the backend login response.
 * `role` is the backend role key (e.g., "admin", "ccr", "chief_tech", "technician", "oo", "storekeeper").
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  team?: string;
}

/**
 * Hook that exposes the raw backend user object stored at login.
 * Use this for permission checks (user.role is the backend role key).
 * For display purposes (name, initials, color), use `useActiveProfile()` instead.
 */
export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = authStorage.getUser();
    if (stored) setUser(stored);
  }, []);

  // Listen for login/logout changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vortex_auth_user") {
        const stored = authStorage.getUser();
        setUser(stored);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return user;
}
