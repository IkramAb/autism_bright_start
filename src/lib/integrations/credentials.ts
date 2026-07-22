import { createAdminClient } from "@/lib/supabase/admin";
import type { IntegrationService } from "@/lib/types/settings";
import type { StoredCredentials } from "./types";

export async function getIntegrationCredentials(
  service: IntegrationService,
): Promise<StoredCredentials | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("integration_credentials")
    .select("access_token, refresh_token, token_expires_at, scope")
    .eq("service", service)
    .maybeSingle();

  if (!data) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: data.token_expires_at,
    scope: data.scope,
  };
}

export async function saveIntegrationCredentials(
  service: IntegrationService,
  creds: {
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiresAt?: string | null;
    scope?: string | null;
  },
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("integration_credentials").upsert(
    {
      service,
      access_token: creds.accessToken,
      refresh_token: creds.refreshToken ?? null,
      token_expires_at: creds.tokenExpiresAt ?? null,
      scope: creds.scope ?? null,
    },
    { onConflict: "service" },
  );
  if (error) throw new Error(error.message);
}

export async function clearIntegrationCredentials(
  service: IntegrationService,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("integration_credentials")
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      scope: null,
    })
    .eq("service", service);
  if (error) throw new Error(error.message);
}

export async function isIntegrationConnected(
  service: IntegrationService,
): Promise<boolean> {
  const creds = await getIntegrationCredentials(service);
  if (!creds?.accessToken) return false;
  if (creds.accessToken === "env") return true;
  return Boolean(creds.accessToken);
}
