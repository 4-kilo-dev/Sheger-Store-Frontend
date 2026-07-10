import { client } from "@/lib/api/client";

export async function getSettingsApi(): Promise<Record<string, string>> {
  return client.get<Record<string, string>>("/api/settings");
}

export async function updateSettingsApi(settings: Record<string, string>): Promise<Record<string, string>> {
  return client.patch<Record<string, string>>("/api/settings", settings);
}
