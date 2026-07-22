import type { GoogleIntegrationService } from "./types";

export const GOOGLE_SCOPES: Record<GoogleIntegrationService, string[]> = {
  drive: [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
  gmail_workspace: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
};

export function googleRedirectUri(): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/google/callback`
  );
}

export function oauthStateSecret(): string {
  const secret =
    process.env.INTEGRATION_OAUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "Set INTEGRATION_OAUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY for OAuth state signing.",
    );
  }
  return secret;
}

export function isGoogleService(
  service: string,
): service is GoogleIntegrationService {
  return service === "drive" || service === "gmail_workspace";
}
