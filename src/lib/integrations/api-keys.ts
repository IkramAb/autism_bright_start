import type { ApiKeyIntegrationService } from "./types";

export type ApiKeyVerifyResult = {
  ok: boolean;
  accountLabel: string;
  error?: string;
};

export async function verifyResendApiKey(): Promise<ApiKeyVerifyResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      accountLabel: "",
      error: "RESEND_API_KEY is not set. Add it to .env.local or Vercel environment variables.",
    };
  }

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    return {
      ok: false,
      accountLabel: "",
      error: "Resend rejected the API key. Check RESEND_API_KEY and try again.",
    };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "configured sender";
  return { ok: true, accountLabel: from };
}

export async function verifyDocsealApiKey(): Promise<ApiKeyVerifyResult> {
  const key = process.env.DOCSEAL_API_KEY?.trim();
  const baseUrl = (process.env.DOCSEAL_BASE_URL ?? "https://api.docuseal.com").replace(/\/$/, "");

  if (!key) {
    return {
      ok: false,
      accountLabel: "",
      error: "DOCSEAL_API_KEY is not set. Add it to .env.local or Vercel environment variables.",
    };
  }

  const res = await fetch(`${baseUrl}/templates?limit=1`, {
    headers: { "X-Auth-Token": key },
  });

  if (!res.ok) {
    return {
      ok: false,
      accountLabel: "",
      error: `DocSeal rejected the API key (HTTP ${res.status}). Check DOCSEAL_API_KEY and DOCSEAL_BASE_URL.`,
    };
  }

  return { ok: true, accountLabel: new URL(baseUrl).host };
}

export function apiKeyEnvHint(service: ApiKeyIntegrationService): string {
  if (service === "resend") {
    return "Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment, then click Connect.";
  }
  return "Set DOCSEAL_API_KEY (and optionally DOCSEAL_BASE_URL) in your environment, then click Connect.";
}
