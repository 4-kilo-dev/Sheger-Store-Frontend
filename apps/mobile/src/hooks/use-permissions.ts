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
 * Helper to determine if the current user can bypass stage locks
 */
export function canBypassBookingStageLock(
  user?: { roles?: string[]; permissions?: string[]; role?: string } | null,
): boolean {
  if (!user) return false;
  const isAdmin =
    user.roles?.includes("admin") ||
    user.roles?.some((r) => r.toLowerCase() === "admin") ||
    user.role?.toLowerCase() === "admin";
  const hasOverridePerm = user.permissions?.includes("booking.override_status_lock");
  return Boolean(isAdmin || hasOverridePerm);
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
  const canBypassStageLock = canBypassBookingStageLock(authUser);

  return useMemo(
    () => ({
      permissions,
      roles,
      can: (key: string) => hasPermission(permissions, key),
      canAny: (keys: string[]) => hasAnyPermission(permissions, keys),
      canBypassStageLock,
    }),
    [permissions, roles, canBypassStageLock],
  );
}
