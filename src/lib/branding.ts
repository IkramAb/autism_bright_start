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

export const LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "image/gif",
];

export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

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
