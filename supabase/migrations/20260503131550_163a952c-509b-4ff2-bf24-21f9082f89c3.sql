ALTER TABLE public.looks ADD COLUMN IF NOT EXISTS result_image_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tryon-results', 'tryon-results', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view tryon results"
ON storage.objects FOR SELECT
USING (bucket_id = 'tryon-results');

CREATE POLICY "Users upload own tryon results"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tryon-results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own tryon results"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tryon-results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own tryon results"
ON storage.objects FOR DELETE
USING (bucket_id = 'tryon-results' AND auth.uid()::text = (storage.foldername(name))[1]);