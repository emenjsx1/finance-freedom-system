/**
 * Preferences persistence. Device-local until the backend lands; the shape
 * mirrors a future `user_preferences` row so the swap is contained.
 */
import { DEFAULT_PREFERENCES, type UserPreferences } from "@/lib/prefs/types";

const STORAGE_KEY = "pfos.prefs.v1";

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      homeModules: parsed.homeModules?.length ? parsed.homeModules : DEFAULT_PREFERENCES.homeModules,
      terminology: parsed.terminology ?? {},
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
