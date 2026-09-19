/**
 * Subtle feedback for meaningful moments. On the web this uses the Vibration
 * API where available; when the app is packaged natively this is the single
 * place to swap in the real iOS haptic engine.
 */
type HapticKind = "success" | "confirm" | "warning" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  success: 12,
  confirm: 8,
  warning: [10, 60, 10],
  error: [18, 70, 18],
};

export function haptic(kind: HapticKind = "confirm"): void {
  if (typeof window === "undefined") return;
  // Respect users who asked the system for less motion/feedback.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const vibrate = navigator.vibrate?.bind(navigator);
  if (!vibrate) return;
  try {
    vibrate(PATTERNS[kind]);
  } catch {
    /* feedback is never critical */
  }
}
