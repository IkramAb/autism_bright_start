import { GOOGLE_SCOPES, googleRedirectUri } from "./config";
import {
  clearIntegrationCredentials,
  getIntegrationCredentials,
  saveIntegrationCredentials,
} from "./credentials";
import type {
  GoogleIntegrationService,
  GoogleTokenResponse,
  StoredCredentials,
} from "./types";

export function buildGoogleAuthorizeUrl(
  service: GoogleIntegrationService,
  state: string,
): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES[service].join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeToken(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  return res.json() as Promise<GoogleTokenResponse>;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  return exchangeToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  return exchangeToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Could not read Google account profile.");
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error("Google account has no email on file.");
  return data.email;
}

export function tokenExpiresAt(expiresIn: number): string {
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export async function storeGoogleTokens(
  service: GoogleIntegrationService,
  tokens: GoogleTokenResponse,
  existingRefresh?: string | null,
): Promise<void> {
  await saveIntegrationCredentials(service, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? existingRefresh ?? null,
    tokenExpiresAt: tokenExpiresAt(tokens.expires_in),
    scope: tokens.scope,
  });
}

export async function revokeGoogleToken(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

function isExpired(creds: StoredCredentials): boolean {
  if (!creds.tokenExpiresAt) return false;
  return Date.now() >= new Date(creds.tokenExpiresAt).getTime() - 60_000;
}

export async function getValidGoogleAccessToken(
  service: GoogleIntegrationService,
): Promise<string | null> {
  const creds = await getIntegrationCredentials(service);
  if (!creds?.accessToken || creds.accessToken === "env") return null;
  if (!isExpired(creds)) return creds.accessToken;
  if (!creds.refreshToken) return null;

  const refreshed = await refreshGoogleAccessToken(creds.refreshToken);
  await storeGoogleTokens(service, refreshed, creds.refreshToken);
  return refreshed.access_token;
}

export async function disconnectGoogleIntegration(
  service: GoogleIntegrationService,
): Promise<void> {
  const creds = await getIntegrationCredentials(service);
  if (creds?.accessToken && creds.accessToken !== "env") {
    try {
      await revokeGoogleToken(creds.accessToken);
    } catch {
      // Revocation is best-effort; still clear local credentials.
    }
  }
  await clearIntegrationCredentials(service);
}
