import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IntegrationService } from "@/lib/types/settings";
import { apiKeyEnvHint, verifyDocsealApiKey, verifyResendApiKey } from "./api-keys";
import { clearIntegrationCredentials, saveIntegrationCredentials } from "./credentials";
import { disconnectGoogleIntegration } from "./google-oauth";
import type { ApiKeyIntegrationService, GoogleIntegrationService } from "./types";

export async function setIntegrationStatus(
  service: IntegrationService,
  connected: boolean,
  accountEmail: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("integrations")
    .update(
      connected
        ? {
            status: "connected",
            connected_account_email: accountEmail,
            connected_at: new Date().toISOString(),
          }
        : {
            status: "not_connected",
            connected_account_email: null,
            connected_at: null,
          },
    )
    .eq("service", service);

  if (error) throw new Error(error.message);
}

export async function connectApiKeyIntegration(
  service: ApiKeyIntegrationService,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const verified =
    service === "resend" ? await verifyResendApiKey() : await verifyDocsealApiKey();

  if (!verified.ok) {
    return { ok: false, error: verified.error ?? apiKeyEnvHint(service) };
  }

  await saveIntegrationCredentials(service, {
    accessToken: "env",
    refreshToken: null,
    tokenExpiresAt: null,
    scope: service === "resend" ? "resend:env" : "docseal:env",
  });

  await setIntegrationStatus(service, true, verified.accountLabel);
  const label = service === "resend" ? "Resend" : "DocSeal";
  return { ok: true, message: `${label} connected as ${verified.accountLabel}.` };
}

export async function disconnectIntegration(
  service: IntegrationService,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (service === "drive" || service === "gmail_workspace") {
    await disconnectGoogleIntegration(service as GoogleIntegrationService);
  } else {
    await clearIntegrationCredentials(service);
  }

  await setIntegrationStatus(service, false, null);
  const label =
    service === "drive"
      ? "Google Drive"
      : service === "gmail_workspace"
        ? "Google Workspace"
        : service === "resend"
          ? "Resend"
          : "DocSeal";
  return { ok: true, message: `${label} disconnected.` };
}

export async function markIntegrationError(
  service: IntegrationService,
  message: string,
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("integrations")
    .update({ status: "error", connected_account_email: message.slice(0, 120) })
    .eq("service", service);
}
