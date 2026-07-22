import { createHmac, timingSafeEqual } from "crypto";
import { oauthStateSecret } from "./config";
import type { OAuthStatePayload } from "./types";

const TTL_MS = 10 * 60 * 1000;

function sign(payloadB64: string): string {
  return createHmac("sha256", oauthStateSecret()).update(payloadB64).digest("base64url");
}

export function createOAuthState(
  payload: Omit<OAuthStatePayload, "exp">,
): string {
  const full: OAuthStatePayload = { ...payload, exp: Date.now() + TTL_MS };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
    if (!payload.service || !payload.adminId || !payload.exp) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
