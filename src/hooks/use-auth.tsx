import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  preferred_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  language: string;
  base_currency: string;
  timezone: string;
  /** ISO date (YYYY-MM-DD). Age is derived from it, never stored. */
  birth_date: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
}

export type ProviderId = "email" | "google" | "apple";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** Providers currently linked to the account. */
  providers: ProviderId[];
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "id">>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    // Listener first, then the initial read, so no event is missed.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        // Never call Supabase synchronously inside the callback.
        setTimeout(() => void loadProfile(nextSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadProfile(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Omit<Profile, "id">>) => {
      if (!session?.user) throw new Error("Sem sessão");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: session.user.id, ...patch })
        .eq("id", session.user.id);
      if (error) throw error;
      await loadProfile(session.user.id);
    },
    [session, loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const providers = useMemo<ProviderId[]>(() => {
    const identities = session?.user?.identities ?? [];
    const list = identities
      .map((identity) => identity.provider)
      .filter((p): p is ProviderId => p === "email" || p === "google" || p === "apple");
    return [...new Set(list)];
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      providers,
      refreshProfile,
      updateProfile,
      signOut,
    }),
    [session, profile, loading, providers, refreshProfile, updateProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Initials fallback for the avatar: never fake photography. */
export function initialsFrom(name: string | null | undefined, email?: string | null): string {
  const source = (name ?? "").trim() || (email ?? "").split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
