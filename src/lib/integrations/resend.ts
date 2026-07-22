import { isIntegrationConnected } from "./credentials";

export async function sendPhiFreeEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!key || !from) {
    return { ok: false, error: "Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };
  }

  if (!(await isIntegrationConnected("resend"))) {
    return { ok: false, error: "Resend is not connected in Settings → Integrations." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Resend error: ${text}` };
  }

  return { ok: true };
}
