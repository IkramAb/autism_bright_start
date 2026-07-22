import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  exchangeGoogleCode,
  fetchGoogleAccountEmail,
  storeGoogleTokens,
} from "@/lib/integrations/google-oauth";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";
import { setIntegrationStatus } from "@/lib/integrations/connect";
import { isGoogleService } from "@/lib/integrations/config";

function settingsUrl(request: Request, params: Record<string, string>) {
  const url = new URL("/settings", request.url);
  url.searchParams.set("tab", "integrations");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      settingsUrl(request, {
        error: oauthError === "access_denied" ? "google_denied" : oauthError,
      }),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(settingsUrl(request, { error: "missing_code" }));
  }

  const payload = verifyOAuthState(state);
  if (!payload || !isGoogleService(payload.service)) {
    return NextResponse.redirect(settingsUrl(request, { error: "invalid_state" }));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    await storeGoogleTokens(payload.service, tokens);
    const email = await fetchGoogleAccountEmail(tokens.access_token);
    await setIntegrationStatus(payload.service, true, email);

    revalidatePath("/settings");
    revalidatePath("/documents");

    const label = payload.service === "drive" ? "drive" : "gmail";
    return NextResponse.redirect(
      settingsUrl(request, { connected: label }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google connection failed.";
    return NextResponse.redirect(
      settingsUrl(request, { error: encodeURIComponent(message) }),
    );
  }
}
