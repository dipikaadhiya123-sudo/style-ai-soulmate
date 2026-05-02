CREATE TABLE public.looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_path text NOT NULL,
  item_image_url text,
  item_label text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  highlights jsonb,
  share_slug text NOT NULL DEFAULT encode(extensions.gen_random_bytes(8), 'hex'),
  saved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX looks_share_slug_idx ON public.looks(share_slug);
CREATE INDEX looks_user_idx ON public.looks(user_id, created_at DESC);

ALTER TABLE public.looks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own looks" ON public.looks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view saved looks by slug" ON public.looks FOR SELECT USING (saved = true);
CREATE POLICY "Users can insert own looks" ON public.looks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own looks" ON public.looks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own looks" ON public.looks FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public) VALUES ('tryon-photos', 'tryon-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own tryon photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own tryon photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own tryon photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own tryon photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'tryon-photos' AND auth.uid()::text = (storage.foldername(name))[1]);