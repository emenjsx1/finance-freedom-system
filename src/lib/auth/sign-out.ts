/**
 * Sign-out hygiene: stop in-flight queries and drop cached data before the
 * session disappears, so nothing 401s or lingers behind the back button.
 */
const DEVICE_CACHE_KEYS = [
  "pfos.setup.v1",
  "pfos.ledger.v1",
  "pfos.personal.v1",
  "pfos.notifications.v1",
  "pfos.prefs.v1",
  "pfos.agent.v1",
];

export async function queryClientFreeSignOut(signOut: () => Promise<void>) {
  await signOut();
  if (typeof window !== "undefined") {
    window.sessionStorage.clear();
    // The account is the source of truth now, so the device copy of someone
    // else's data must not stay behind on a shared phone.
    for (const key of DEVICE_CACHE_KEYS) window.localStorage.removeItem(key);
  }
}
