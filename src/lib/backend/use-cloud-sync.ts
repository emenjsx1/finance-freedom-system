/**
 * Keeps one domain in sync with the backend.
 *
 * Device storage remains the offline cache. On sign-in the cloud copy wins,
 * merged with anything that only exists on this device, so a failed upload can
 * never silently delete real records. Saves retry with backoff and flush when
 * the connection or the tab comes back — a dropped save used to leave the
 * account half-written, which is how movements ended up pointing at purposes
 * that no longer existed.
 */
import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";
import { notifyError } from "@/lib/ui/feedback";

interface Options<T> {
  state: T;
  hydrated: boolean;
  /** Applies the cloud copy locally (state + device cache). */
  apply: (state: T) => void;
  load: (base: T) => Promise<T | null>;
  save: (userId: string, state: T) => Promise<void>;
}

const RETRY_DELAYS = [1_000, 4_000, 15_000];

export function useCloudSync<T>({ state, hydrated, apply, load, save }: Options<T>): void {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const stateRef = useRef(state);
  stateRef.current = state;
  const syncedFor = useRef<string | null>(null);
  const loaded = useRef(false);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const attempt = useRef(0);
  const warned = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) {
      syncedFor.current = null;
      loaded.current = false;
      return;
    }
    if (!hydrated || syncedFor.current === userId) return;
    syncedFor.current = userId;
    void (async () => {
      try {
        const cloud = await load(stateRef.current);
        if (cloud) apply(cloud);
        loaded.current = true;
        dirty.current = true; // re-upload anything the cloud copy was missing
      } catch (error) {
        console.error("[cloud-sync] initial sync failed", error);
        syncedFor.current = null;
      }
    })();
  }, [userId, hydrated, apply, load]);

  // One writer: runs whenever something is pending, retries until it lands.
  useEffect(() => {
    if (!userId || syncedFor.current !== userId || !loaded.current) return undefined;

    const flush = () => {
      if (inFlight.current || !dirty.current) return;
      inFlight.current = true;
      dirty.current = false;
      const snapshot = stateRef.current;
      void save(userId, snapshot)
        .then(() => {
          attempt.current = 0;
          warned.current = false;
        })
        .catch((error) => {
          console.error("[cloud-sync] save failed", error);
          dirty.current = true;
          const delay = RETRY_DELAYS[Math.min(attempt.current, RETRY_DELAYS.length - 1)]!;
          attempt.current += 1;
          if (attempt.current >= RETRY_DELAYS.length && !warned.current) {
            warned.current = true;
            notifyError(
              "Os teus dados não estão a chegar à tua conta",
              "Guardámos tudo neste aparelho e voltamos a tentar assim que houver ligação.",
            );
          }
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(flush, delay);
        })
        .finally(() => {
          inFlight.current = false;
        });
    };

    dirty.current = true;
    const timer = setTimeout(flush, 700);
    const onWake = () => flush();
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [state, userId, save]);
}
