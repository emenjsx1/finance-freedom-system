/**
 * App-wide feedback channel.
 *
 * Errors never use the plain toast strip: they open the app's own alert
 * dialog so failures look like part of the product and require a deliberate
 * dismissal. Success feedback stays lightweight (sonner).
 */
export type AlertTone = "error" | "warning" | "info";

export interface AppAlertPayload {
  title: string;
  message: string;
  tone: AlertTone;
}

export const APP_ALERT_EVENT = "app:alert";

function toMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Algo não correu bem. Tenta novamente.";
}

/**
 * The same failure often fires from several sync domains at once (setup,
 * ledger, personal…). Without dedupe the person closes one alert and the
 * next identical one opens instantly — the dialog feels impossible to
 * dismiss. Identical alerts are shown at most once per window; an alert
 * dismissed by the user stays silent for a while.
 */
const REPEAT_WINDOW_MS = 60_000;
const lastShownAt = new Map<string, number>();

function signatureOf(payload: AppAlertPayload): string {
  return `${payload.tone}:${payload.title}:${payload.message}`;
}

function emit(payload: AppAlertPayload) {
  if (typeof window === "undefined") return;
  const signature = signatureOf(payload);
  const now = Date.now();
  const last = lastShownAt.get(signature);
  if (last && now - last < REPEAT_WINDOW_MS) return;
  lastShownAt.set(signature, now);
  window.dispatchEvent(new CustomEvent<AppAlertPayload>(APP_ALERT_EVENT, { detail: payload }));
}

export function notifyError(message: unknown, title = "Não foi possível continuar") {
  emit({ title, message: toMessage(message), tone: "error" });
}

export function notifyWarning(message: unknown, title = "Atenção") {
  emit({ title, message: toMessage(message), tone: "warning" });
}

export function notifyInfo(message: unknown, title = "Nota") {
  emit({ title, message: toMessage(message), tone: "info" });
}
