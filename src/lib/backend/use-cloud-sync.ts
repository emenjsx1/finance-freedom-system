/**
 * Keeps one domain in sync with the backend.
 *
 * Device storage remains the offline cache. When a person signs in, the cloud
 * copy wins if it exists; if the cloud is still empty, whatever is on the
 * device is uploaded once so nothing real is ever lost.
 */
import { useEffect, useRef } from "react";

import { useAuth } from "@/hooks/use-auth";

interface Options<T> {
  state: T;
  hydrated: boolean;
  /** Applies the cloud copy locally (state + device cache). */
  apply: (state: T) => void;
  load: (base: T) => Promise<T | null>;
  save: (userId: string, state: T) => Promise<void>;
}

export function useCloudSync<T>({ state, hydrated, apply, load, save }: Options<T>): void {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const stateRef = useRef(state);
  stateRef.current = state;
  const syncedFor = useRef<string | null>(null);
  const skipNextPush = useRef(false);

  useEffect(() => {
    if (!userId) {
      syncedFor.current = null;
      return;
    }
    if (!hydrated || syncedFor.current === userId) return;
    syncedFor.current = userId;
    void (async () => {
      try {
        const cloud = await load(stateRef.current);
        if (cloud) {
          skipNextPush.current = true;
          apply(cloud);
        } else {
          await save(userId, stateRef.current);
        }
      } catch (error) {
        console.error("[cloud-sync] initial sync failed", error);
        syncedFor.current = null;
      }
    })();
  }, [userId, hydrated, apply, load, save]);

  useEffect(() => {
    if (!userId || syncedFor.current !== userId) return undefined;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      void save(userId, stateRef.current).catch((error) => {
        console.error("[cloud-sync] save failed", error);
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [state, userId, save]);
}
