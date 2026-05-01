-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  gender TEXT,
  height_cm INTEGER,
  weight_kg INTEGER,
  skin_tone TEXT,
  hair_type TEXT,
  body_shape TEXT,
  style_prefs TEXT[],
  face_photo_path TEXT,
  body_photo_path TEXT,
  ai_analysis JSONB,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- OUTFITS
CREATE TABLE public.outfits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occasion TEXT NOT NULL,
  title TEXT,
  items JSONB NOT NULL,
  style_score NUMERIC(3,1),
  score_breakdown JSONB,
  rationale TEXT,
  suggestions JSONB,
  share_slug TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfits" ON public.outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view outfits by share slug" ON public.outfits FOR SELECT USING (saved = true);
CREATE POLICY "Users can insert own outfits" ON public.outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outfits" ON public.outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own outfits" ON public.outfits FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX outfits_user_created_idx ON public.outfits(user_id, created_at DESC);
CREATE INDEX outfits_share_slug_idx ON public.outfits(share_slug);

-- CHAT MESSAGES
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX chat_messages_user_created_idx ON public.chat_messages(user_id, created_at);

-- STORAGE: user-photos bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('user-photos', 'user-photos', false);

CREATE POLICY "Users can view own photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'user-photos' AND auth.uid()::text = (storage.foldername(name))[1]);