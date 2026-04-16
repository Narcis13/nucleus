-- Storage policies mirror the row-level scoping used on the corresponding tables.
-- Convention: files are uploaded under `<professional_id>/...` (or
-- `<professional_id>/<client_id>/...` for client-scoped documents) so the top
-- path segment can be used to derive ownership.

-- ── AVATARS ────────────────────────────────────────────────────────────────
-- Public read (used on micro-sites, portal headers). Writes only to own folder.
create policy "avatars_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      -- professional uploading to their own folder
      (storage.foldername(name))[1] = (
        select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
      or
      -- client uploading to their own folder
      (storage.foldername(name))[1] = (
        select id::text from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  );

create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (
        select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
      or
      (storage.foldername(name))[1] = (
        select id::text from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  );

create policy "avatars_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (
        select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
      or
      (storage.foldername(name))[1] = (
        select id::text from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')
      )
    )
  );

-- ── DOCUMENTS ──────────────────────────────────────────────────────────────
-- Private bucket. Professional reads/writes within their folder; clients read
-- objects under `<professional_id>/<their_client_id>/...`.
create policy "documents_professional_all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );

create policy "documents_client_read_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[2] in (
      select id::text from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );

-- ── MEDIA ──────────────────────────────────────────────────────────────────
-- Private media (voice notes, images attached to messages). Professional owns
-- their folder; clients may read/write their own sub-folder.
create policy "media_professional_all"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );

create policy "media_client_own"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[2] in (
      select id::text from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[2] in (
      select id::text from public.clients where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );

-- ── MARKETING ──────────────────────────────────────────────────────────────
-- Publicly readable (used on micro-sites). Writes restricted to owner.
create policy "marketing_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'marketing');

create policy "marketing_owner_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'marketing'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );

create policy "marketing_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'marketing'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );

create policy "marketing_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'marketing'
    and (storage.foldername(name))[1] = (
      select id::text from public.professionals where clerk_user_id = (select auth.jwt() ->> 'sub')
    )
  );
