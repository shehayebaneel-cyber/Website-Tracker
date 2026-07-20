import { api } from "./api";
import { setCurrency } from "./format";

interface AppConfig {
  role: string;
  currency: string;
  companyName: string;
}

let cache: AppConfig | null = null;

// Loaded once after login. Applies the configured currency app-wide.
export async function loadAppConfig(): Promise<AppConfig> {
  if (cache) return cache;
  cache = await api.get<AppConfig>("/app");
  setCurrency(cache.currency);
  return cache;
}

export function companyName(): string {
  return cache?.companyName?.trim() || "our studio";
}

export function clearAppConfig() {
  cache = null;
}
