-- Portal client RLS — Phase 6 of the Portal Auth Refactor.
--
-- The portal browser fetches a short-lived Supabase JWT from
-- `/api/portal/sb-token`. That JWT carries `sub = client_<uuid>`,
-- `client_id` (uuid), and `professional_id` (uuid) claims, signed with
-- `SUPABASE_JWT_SECRET`.
--
-- The existing dashboard policies key off `auth.jwt() ->> 'sub'` (the
-- Clerk user id). They keep working unchanged. The policies below add a
-- parallel grant for portal clients keyed off `auth.jwt() ->> 'client_id'`,
-- so a portal session can subscribe to its own Realtime stream and upload
-- to its own Storage paths.
--
-- All policies are PERMISSIVE; PostgreSQL OR-merges multiple permissive
-- policies on the same (table, action), so adding these alongside the
-- existing `*_participants_all` / `media_client_own` policies just unions
-- the access — it never narrows the agent path.

-- ── conversations: portal client SELECT ────────────────────────────────────
-- Portal RSCs read conversations via dbAdmin; this policy is required for
-- Realtime subscriptions on the `conversations` table to deliver updates to
-- the portal client (e.g. `last_message_at` bumps).
create policy "conversations_portal_client_select"
  on public.conversations for select to authenticated
  using (
    auth.jwt() ->> 'client_id' is not null
    and conversations.client_id = (auth.jwt() ->> 'client_id')::uuid
  );

-- ── messages: portal client SELECT + INSERT ────────────────────────────────
-- Scoped by conversation ownership: a portal client can read/insert messages
-- only in conversations whose `client_id` matches their JWT claim.
create policy "messages_portal_client_select"
  on public.messages for select to authenticated
  using (
    auth.jwt() ->> 'client_id' is not null
    and messages.conversation_id in (
      select id from public.conversations
      where client_id = (auth.jwt() ->> 'client_id')::uuid
    )
  );

create policy "messages_portal_client_insert"
  on public.messages for insert to authenticated
  with check (
    auth.jwt() ->> 'client_id' is not null
    and messages.conversation_id in (
      select id from public.conversations
      where client_id = (auth.jwt() ->> 'client_id')::uuid
    )
  );

-- ── storage.objects: documents bucket ──────────────────────────────────────
-- Path convention (set in `lib/services/documents/_helpers.ts`):
--   <professional_id>/<client_id | "general">/<uuid>-<filename>
-- Portal clients read/insert files where folder segment 2 matches their
-- `client_id` claim. The portal upload action mints the storage key
-- server-side (so the professional segment is trustworthy); RLS still
-- enforces the client segment so a stolen JWT can't reach the wrong folder.
create policy "documents_portal_client_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and auth.jwt() ->> 'client_id' is not null
    and (storage.foldername(name))[2] = (auth.jwt() ->> 'client_id')
  );

create policy "documents_portal_client_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and auth.jwt() ->> 'client_id' is not null
    and (storage.foldername(name))[2] = (auth.jwt() ->> 'client_id')
  );

-- ── storage.objects: media bucket (chat attachments) ───────────────────────
-- Path convention (set in `components/shared/chat/message-input.tsx`):
--   <owner_id>/<conversation_id>/<timestamp>-<filename>
-- For portal uploads, owner_id == client_id, so segment 1 is the client's
-- uuid. SELECT lets `createSignedUrl` succeed against the same upload.
create policy "media_portal_client_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and auth.jwt() ->> 'client_id' is not null
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'client_id')
  );

create policy "media_portal_client_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and auth.jwt() ->> 'client_id' is not null
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'client_id')
  );
