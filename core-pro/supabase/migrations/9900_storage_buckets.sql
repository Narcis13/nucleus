-- Provision Supabase Storage buckets used by the app.
-- Runs after the Drizzle-generated schema so tables exist (policies in 9901 reference them).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',   'avatars',   true,  5 * 1024 * 1024,   array['image/png','image/jpeg','image/webp','image/gif']),
  ('documents', 'documents', false, 25 * 1024 * 1024,  null),
  ('media',     'media',     false, 100 * 1024 * 1024, null),
  ('marketing', 'marketing', true,  25 * 1024 * 1024,  null)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
