import { useMemo } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { authStorage } from "@/lib/api/client";

const EMPTY_PERMISSIONS: string[] = [];
const EMPTY_ROLES: string[] = [];

/** Exact key match against `/auth/me` (backend already expanded manage⇒view, etc.). */
export function hasPermission(
  permissions: string[] | undefined | null,
  key: string
): boolean {
  if (!key) return false;
  return (permissions ?? EMPTY_PERMISSIONS).includes(key);
}

export function hasAnyPermission(
  permissions: string[] | undefined | null,
  keys: string[]
): boolean {
  return keys.some((key) => hasPermission(permissions, key));
}

/** Sync read from localStorage — prefer `usePermissions()` in React trees. */
export function canPermission(key: string): boolean {
  const user = authStorage.getUser();
  return hasPermission(user?.permissions, key);
}

/**
 * Permission helpers from the stored auth user (`/auth/me` / login).
 * Sole FE source of truth for can() — never gate on role strings.
 */
export function usePermissions() {
  const user = useAuthUser();
  const permissions = user?.permissions ?? EMPTY_PERMISSIONS;
  const roles = user?.roles ?? EMPTY_ROLES;

  return useMemo(
    () => ({
      permissions,
      roles,
      can: (key: string) => hasPermission(permissions, key),
      canAny: (keys: string[]) => hasAnyPermission(permissions, keys),
    }),
    [permissions, roles]
  );
}
