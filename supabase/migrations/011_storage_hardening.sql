-- Hisab Khata — 011 Storage Hardening (Sprint 1)
-- The buckets accepted any file of any size (§1.7). Both are browser uploads,
-- so cap them and restrict MIME types at the bucket level (cannot be bypassed
-- by a crafted client, unlike a client-side check).

-- Avatars: images only, 2 MB.
update storage.buckets
   set file_size_limit = 2 * 1024 * 1024,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id = 'avatars';

-- Receipts: images or PDF, 10 MB.
update storage.buckets
   set file_size_limit = 10 * 1024 * 1024,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/heic','application/pdf']
 where id = 'receipts';
