import { client } from "@/lib/api/client";

export interface Role {
  id: string;
  key: string;
  displayName: string;
}

export interface Permission {
  id: string;
  key: string;
  description?: string | null;
}

export interface RoleWithPermissions extends Role {
  isSystem: boolean;
  permissions: Permission[];
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  key: string;
  type: "boolean" | "number" | "string" | "date" | "enum" | "multi_select";
  options?: string[];
  required: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getRolesApi(): Promise<Role[]> {
  return client.get<Role[]>("/api/roles");
}

export async function getRolesWithPermissionsApi(): Promise<RoleWithPermissions[]> {
  return client.get<RoleWithPermissions[]>("/api/roles");
}

export async function getPermissionsApi(): Promise<Permission[]> {
  return client.get<Permission[]>("/api/permissions");
}

export async function addRolePermissionApi(
  roleId: string,
  permissionId: string,
): Promise<RoleWithPermissions> {
  return client.post<RoleWithPermissions>(`/api/roles/${roleId}/permissions`, { permissionId });
}

export async function removeRolePermissionApi(
  roleId: string,
  permissionId: string,
): Promise<RoleWithPermissions> {
  return client.delete<RoleWithPermissions>(`/api/roles/${roleId}/permissions/${permissionId}`);
}

export async function getSettingsApi(): Promise<Record<string, string>> {
  return client.get<Record<string, string>>("/api/settings");
}

export async function updateSettingsApi(
  settings: Record<string, string>,
): Promise<Record<string, string>> {
  return client.patch<Record<string, string>>("/api/settings", settings);
}

export async function getCustomFieldDefinitionsApi(): Promise<CustomFieldDefinition[]> {
  return client.get<CustomFieldDefinition[]>("/api/custom-field-definitions");
}

export async function createCustomFieldDefinitionApi(
  payload: Omit<CustomFieldDefinition, "id" | "createdAt" | "updatedAt">,
): Promise<CustomFieldDefinition> {
  return client.post<CustomFieldDefinition>("/api/custom-field-definitions", payload);
}

export async function deleteCustomFieldDefinitionApi(id: string): Promise<void> {
  return client.delete(`/api/custom-field-definitions/${id}`);
}
