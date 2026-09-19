import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_PREFERENCES,
  TERMINOLOGY_DEFAULTS,
  type TerminologyKey,
  type UserPreferences,
} from "@/lib/prefs/types";
import { loadCloudPreferences, saveCloudPreferences } from "@/lib/backend/cloud-store";
import { useCloudSync } from "@/lib/backend/use-cloud-sync";
import { loadPreferences, savePreferences } from "@/lib/storage/prefs-store";

/** Preferences are one document; the base copy is only a fallback. */
const loadCloudPreferencesState = () => loadCloudPreferences();

interface PrefsContextValue {
  prefs: UserPreferences;
  hydrated: boolean;
  update: (patch: Partial<UserPreferences>) => void;
  reset: () => void;
  /** Display label for an internal concept. Never used as an identifier. */
  term: (key: TerminologyKey) => string;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadPreferences());
    setHydrated(true);
  }, []);

  // Theme, accent and density are presentation-only attributes on <html>.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const prefersLight =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    const light = prefs.theme === "light" || (prefs.theme === "system" && prefersLight);
    root.classList.toggle("theme-light", light);
    root.classList.toggle("dark", !light);
    root.dataset['accent'] = prefs.accent;
    root.dataset['density'] = prefs.density;
  }, [prefs.theme, prefs.accent, prefs.density]);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
  }, []);

  const applyCloud = useCallback((next: UserPreferences) => {
    savePreferences(next);
    setPrefs(next);
  }, []);

  useCloudSync({
    state: prefs,
    hydrated,
    apply: applyCloud,
    load: loadCloudPreferencesState,
    save: saveCloudPreferences,
  });

  const term = useCallback(
    (key: TerminologyKey) => prefs.terminology[key]?.trim() || TERMINOLOGY_DEFAULTS[key],
    [prefs.terminology],
  );

  const value = useMemo(
    () => ({ prefs, hydrated, update, reset, term }),
    [prefs, hydrated, update, reset, term],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside PrefsProvider");
  return ctx;
}
