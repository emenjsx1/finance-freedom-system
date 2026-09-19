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

function emit(payload: AppAlertPayload) {
  if (typeof window === "undefined") return;
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
