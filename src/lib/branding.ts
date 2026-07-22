import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Practice branding (logo) lives in a public Supabase Storage bucket rather than
 * a table column — it is a single binary asset, not structured config. Uploads /
 * deletes go through the service-role client (a trusted admin task, same pattern
 * as integration credentials); the bucket is public so the browser reads the
 * logo directly by URL with no auth.
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
 * Creates the branding bucket if it does not already exist. Idempotent — safe to
 * call before every upload so the feature works even on a project where the
 * storage migration has not been run.
 */
export async function ensureBrandingBucket(): Promise<void> {
  const admin = createAdminClient();
  const { data: existing } = await admin.storage.getBucket(BRANDING_BUCKET);
  if (existing) return;

  const { error } = await admin.storage.createBucket(BRANDING_BUCKET, {
    public: true,
    fileSizeLimit: LOGO_MAX_BYTES,
    allowedMimeTypes: LOGO_ALLOWED_MIME_TYPES,
  });
  // Ignore a benign race where another request created it first.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(error.message);
  }
}

/**
 * Returns the public URL of the current practice logo (with a cache-busting
 * version derived from its last-modified time), or null when no logo is set.
 * Never throws — falls back to null if storage / service role is unavailable so
 * callers in layouts and pages stay resilient.
 */
export async function getOrganizationLogoUrl(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(BRANDING_BUCKET)
      .list("", { search: LOGO_OBJECT_PATH });
    if (error || !data) return null;

    const object = data.find((item) => item.name === LOGO_OBJECT_PATH);
    if (!object) return null;

    const { data: pub } = admin.storage
      .from(BRANDING_BUCKET)
      .getPublicUrl(LOGO_OBJECT_PATH);

    const version =
      object.updated_at ?? object.created_at ?? object.id ?? Date.now().toString();
    return `${pub.publicUrl}?v=${encodeURIComponent(version)}`;
  } catch {
    return null;
  }
}
