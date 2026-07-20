import { useMemo } from "react";
import { useAppContext } from "@/context/AppContext";

const EMPTY_PERMISSIONS: string[] = [];
const EMPTY_ROLES: string[] = [];

/** Exact key match against `/api/auth/me` (backend already expanded manage⇒view, etc.). */
export function hasPermission(permissions: string[] | undefined | null, key: string): boolean {
  if (!key) return false;
  return (permissions ?? EMPTY_PERMISSIONS).includes(key);
}

export function hasAnyPermission(
  permissions: string[] | undefined | null,
  keys: string[],
): boolean {
  return keys.some((key) => hasPermission(permissions, key));
}

/**
 * Permission helpers from the stored auth user (`/api/auth/me` / login).
 * Sole FE source of truth for can() — never gate on role strings.
 * Mirrors apps/web/src/hooks/use-permissions.ts.
 */
export function usePermissions() {
  const { authUser } = useAppContext();
  const permissions = authUser?.permissions ?? EMPTY_PERMISSIONS;
  const roles = authUser?.roles ?? EMPTY_ROLES;

  return useMemo(
    () => ({
      permissions,
      roles,
      can: (key: string) => hasPermission(permissions, key),
      canAny: (keys: string[]) => hasAnyPermission(permissions, keys),
    }),
    [permissions, roles],
  );
}
