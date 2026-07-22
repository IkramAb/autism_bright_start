import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { buildGoogleAuthorizeUrl } from "@/lib/integrations/google-oauth";
import { createOAuthState } from "@/lib/integrations/oauth-state";
import { isGoogleService } from "@/lib/integrations/config";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service") ?? "";
  if (!isGoogleService(service)) {
    return NextResponse.redirect(
      new URL("/settings?tab=integrations&error=invalid_service", request.url),
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(
        "/settings?tab=integrations&error=google_not_configured",
        request.url,
      ),
    );
  }

  try {
    const state = createOAuthState({ service, adminId: admin.id });
    const url = buildGoogleAuthorizeUrl(service, state);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth setup failed.";
    return NextResponse.redirect(
      new URL(
        `/settings?tab=integrations&error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
