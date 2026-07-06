-- Avatar uploads now go through /api/upload-avatar, which decodes and
-- re-encodes every file with sharp before it ever reaches storage (the
-- real validation boundary - rejects anything that isn't a genuine
-- image, regardless of claimed content-type/extension) and uploads with
-- the service_role key.
--
-- The old "Public can upload avatars" policy let any anon/authenticated
-- client write directly to the bucket with an arbitrary file and
-- content-type, completely bypassing that validation. Drop it - only
-- the server (service_role) should be able to write to this bucket now.
-- Run this in Supabase SQL Editor.

drop policy if exists "Public can upload avatars" on storage.objects;
