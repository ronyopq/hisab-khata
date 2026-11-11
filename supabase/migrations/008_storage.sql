-- Hisab Khata — 008 Storage Buckets & Policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false), ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- receipts: private, path {book_id}/{uuid} — membership-checked
DROP POLICY IF EXISTS receipts_select ON storage.objects;
CREATE POLICY receipts_select ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND public.is_book_member((storage.foldername(name))[1]::uuid, 'viewer'));

DROP POLICY IF EXISTS receipts_insert ON storage.objects;
CREATE POLICY receipts_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND public.is_book_member((storage.foldername(name))[1]::uuid, 'editor'));

DROP POLICY IF EXISTS receipts_update ON storage.objects;
CREATE POLICY receipts_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts' AND public.is_book_member((storage.foldername(name))[1]::uuid, 'editor'))
  WITH CHECK (bucket_id = 'receipts' AND public.is_book_member((storage.foldername(name))[1]::uuid, 'editor'));

DROP POLICY IF EXISTS receipts_delete ON storage.objects;
CREATE POLICY receipts_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND public.is_book_member((storage.foldername(name))[1]::uuid, 'editor'));

-- avatars: public read, owner-only write {user_id}/...
DROP POLICY IF EXISTS avatars_select ON storage.objects;
CREATE POLICY avatars_select ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert ON storage.objects;
CREATE POLICY avatars_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_update ON storage.objects;
CREATE POLICY avatars_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_delete ON storage.objects;
CREATE POLICY avatars_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
