import type { IntegrationService } from "@/lib/types/settings";

export type GoogleIntegrationService = Extract<
  IntegrationService,
  "drive" | "gmail_workspace"
>;

export type ApiKeyIntegrationService = Extract<
  IntegrationService,
  "docseal" | "resend"
>;

export type OAuthStatePayload = {
  service: GoogleIntegrationService;
  adminId: string;
  exp: number;
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export type StoredCredentials = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scope: string | null;
};
