UPDATE storage.buckets SET public = false WHERE id = 'tryon-results';
DROP POLICY IF EXISTS "Public can view tryon results" ON storage.objects;
CREATE POLICY "Users view own tryon results"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-results' AND auth.uid()::text = (storage.foldername(name))[1]);