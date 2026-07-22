-- ============================================================================
-- ABA Connect — practice branding (logo) storage
-- ----------------------------------------------------------------------------
-- The org logo is a single binary asset, so it lives in a public Storage bucket
-- rather than a table column. Public read (so the browser loads it by URL with
-- no auth); writes restricted to active admins. The app's upload action also
-- provisions this bucket at runtime via the service role, so this migration is
-- only needed to keep fresh setups consistent.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read branding assets (needed to render the logo pre-login).
drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
  for select
  using (bucket_id = 'branding');

-- Only active admins may add / replace / remove branding assets.
drop policy if exists branding_admin_write on storage.objects;
create policy branding_admin_write on storage.objects
  for all
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());
