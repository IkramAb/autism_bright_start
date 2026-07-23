import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Practice branding (logo) lives in a public Supabase Storage bucket rather than
 * a table column — it is a single binary asset, not structured config.
 *
 * Writes go through the signed-in admin's own client and are authorised by the
 * `branding_admin_write` storage RLS policy, so the feature works in any
 * deployment WITHOUT requiring the service-role secret to be present. When the
 * service-role key IS configured we prefer it (it can also provision the bucket
 * on a fresh project), but it is strictly optional. The bucket is public, so the
 * browser reads the logo directly by URL with no auth.
 */
export const BRANDING_BUCKET = "branding";
export const LOGO_OBJECT_PATH = "logo";
export const BRANDING_CONFIG_PATH = "config.json";

export const LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
];

export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Display height (px) of the logo in the sidebar / sign-in screen. */
export const DEFAULT_LOGO_HEIGHT = 40;
export const MIN_LOGO_HEIGHT = 20;
export const MAX_LOGO_HEIGHT = 96;

export type Branding = { logoUrl: string | null; logoHeight: number };

export function clampLogoHeight(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LOGO_HEIGHT;
  return Math.min(MAX_LOGO_HEIGHT, Math.max(MIN_LOGO_HEIGHT, Math.round(value)));
}

/**
 * Returns a service-role client, or null when SUPABASE_SERVICE_ROLE_KEY is not
 * configured (e.g. a deployment that only sets the public keys). Never throws.
 */
export function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Best-effort creation of the branding bucket. Requires the service role, so it
 * is a no-op when that key is absent — in that case the bucket is expected to
 * already exist (created by the storage migration / SQL). Idempotent.
 */
export async function ensureBrandingBucket(): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) return;

  const { data: existing } = await admin.storage.getBucket(BRANDING_BUCKET);
  if (existing) return;

  const { error } = await admin.storage.createBucket(BRANDING_BUCKET, {
    public: true,
    fileSizeLimit: LOGO_MAX_BYTES,
    allowedMimeTypes: LOGO_ALLOWED_MIME_TYPES,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

/**
 * The deterministic public URL of the logo object (no existence check).
 */
export function brandingLogoPublicUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BRANDING_BUCKET}/${LOGO_OBJECT_PATH}`;
}

/**
 * Returns the public URL of the current practice logo (with a cache-busting
 * version derived from its ETag / last-modified time), or null when no logo is
 * set. Uses a plain public HEAD request, so it needs neither auth nor the
 * service role and works on the unauthenticated login screen. Never throws.
 */
export async function getOrganizationLogoUrl(): Promise<string | null> {
  const publicUrl = brandingLogoPublicUrl();
  if (!publicUrl) return null;

  try {
    const res = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
    if (!res.ok) return null;

    const version = (
      res.headers.get("etag") ??
      res.headers.get("last-modified") ??
      ""
    ).replace(/"/g, "");
    return version ? `${publicUrl}?v=${encodeURIComponent(version)}` : publicUrl;
  } catch {
    return null;
  }
}

/**
 * Reads the stored logo display height from the branding config object, falling
 * back to the default when unset or unavailable. Public read, no auth needed.
 */
export async function getLogoHeight(): Promise<number> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return DEFAULT_LOGO_HEIGHT;

  const url = `${base}/storage/v1/object/public/${BRANDING_BUCKET}/${BRANDING_CONFIG_PATH}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return DEFAULT_LOGO_HEIGHT;
    const json = (await res.json()) as { logoHeight?: unknown };
    return clampLogoHeight(Number(json?.logoHeight));
  } catch {
    return DEFAULT_LOGO_HEIGHT;
  }
}

/**
 * Convenience loader for both branding values in one call.
 */
export async function getBranding(): Promise<Branding> {
  const [logoUrl, logoHeight] = await Promise.all([
    getOrganizationLogoUrl(),
    getLogoHeight(),
  ]);
  return { logoUrl, logoHeight };
}
