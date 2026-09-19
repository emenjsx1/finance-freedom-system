import { describe, expect, it } from "vitest";

import { sendWebPush } from "./webpush.server";

function b64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const VAPID = {
  publicKey: "BPa8u0v8c2fzDBpGy3VQOYuwA67AQK56ZGOCVtR0bB82HCrqjR-mzTudBYYtOwqlX0Ctqy0PYje55IsZtpCvtSg",
  privateJwk: JSON.stringify({
    kty: "EC",
    crv: "P-256",
    x: "9ry7S_xzZ_MMGkbLdVA5i7ADrsBArnpkY4JW1HRsHzY",
    y: "HCrqjR-mzTudBYYtOwqlX0Ctqy0PYje55IsZtpCvtSg",
    d: "cvC_jBnplir6tbcpWSNvKwYqd7k98u59eSwaHNPzafU",
  }),
  subject: "mailto:test@example.com",
};

async function fakeSubscription() {
  const keys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  return {
    endpoint: "https://push.example.com/send/abc",
    p256dh: b64url(raw),
    auth: b64url(crypto.getRandomValues(new Uint8Array(16))),
  };
}

describe("web push", () => {
  it("signs and encrypts a payload the push service accepts", async () => {
    const subscription = await fakeSubscription();
    let captured: Request | null = null;
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      captured = new Request(input as RequestInfo, init);
      return new Response(null, { status: 201 });
    }) as typeof fetch;

    const result = await sendWebPush(subscription, { title: "Olá" }, VAPID);
    globalThis.fetch = original;

    expect(result.ok).toBe(true);
    const request = captured as unknown as Request;
    expect(request.headers.get("Content-Encoding")).toBe("aes128gcm");
    expect(request.headers.get("Authorization")).toContain("vapid t=");
    expect(request.headers.get("Authorization")).toContain(`k=${VAPID.publicKey}`);

    const body = new Uint8Array(await request.arrayBuffer());
    // salt(16) + rs(4) + idlen(1) + ephemeral public key(65) + ciphertext
    expect(body.length).toBeGreaterThan(86);
    expect(body[20]).toBe(65);
  });

  it("reports a dead endpoint instead of pretending it was delivered", async () => {
    const subscription = await fakeSubscription();
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response("gone", { status: 410 })) as typeof fetch;
    const result = await sendWebPush(subscription, { title: "Olá" }, VAPID);
    globalThis.fetch = original;

    expect(result.ok).toBe(false);
    expect(result.gone).toBe(true);
  });
});
