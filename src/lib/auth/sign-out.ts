/**
 * Sign-out hygiene: stop in-flight queries and drop cached data before the
 * session disappears, so nothing 401s or lingers behind the back button.
 */
export async function queryClientFreeSignOut(signOut: () => Promise<void>) {
  await signOut();
  if (typeof window !== "undefined") {
    // Presentation caches only; financial data stays on the device on purpose.
    window.sessionStorage.clear();
  }
}
