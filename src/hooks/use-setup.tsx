import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  EMPTY_SETUP,
  loadSetup,
  saveSetup,
  type SetupState,
} from "@/lib/storage/local-setup-store";

interface SetupContextValue {
  setup: SetupState;
  hydrated: boolean;
  update: (patch: Partial<SetupState>) => void;
}

const SetupContext = createContext<SetupContextValue | null>(null);

export function SetupProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState<SetupState>(EMPTY_SETUP);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSetup(loadSetup());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<SetupState>) => {
    setSetup((prev) => {
      const next = { ...prev, ...patch };
      saveSetup(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ setup, hydrated, update }), [setup, hydrated, update]);

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

export function useSetup(): SetupContextValue {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetup must be used inside SetupProvider");
  return ctx;
}
