/**
 * Personal OS persistence. Device-local for now; the shape mirrors the future
 * `plans`, `strategies`, `strategy_rules`, `personal_context`, `direction` and
 * `commitments` tables described in docs/BACKEND_CONTRACT.md.
 */
import { EMPTY_PERSONAL_STATE, type PersonalState } from "@/lib/personal/types";

const STORAGE_KEY = "pfos.personal.v1";

export function loadPersonal(): PersonalState {
  if (typeof window === "undefined") return EMPTY_PERSONAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PERSONAL_STATE;
    const parsed = JSON.parse(raw) as Partial<PersonalState>;
    return {
      ...EMPTY_PERSONAL_STATE,
      ...parsed,
      direction: parsed.direction ?? [],
      plans: parsed.plans ?? [],
      context: parsed.context ?? [],
      commitments: parsed.commitments ?? [],
      strategy: parsed.strategy ?? null,
      permissions: { ...EMPTY_PERSONAL_STATE.permissions, ...(parsed.permissions ?? {}) },
    };
  } catch {
    return EMPTY_PERSONAL_STATE;
  }
}

export function savePersonal(state: PersonalState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
