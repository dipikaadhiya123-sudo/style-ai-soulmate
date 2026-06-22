-- Migration: Profiles Table
-- Stores user profile information including Google OAuth data
-- Created after initial migration files, referenced by security migration

-- ===============================================
-- 1. PROFILES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  email         text,
  avatar_url    text,
  bio           text,
  preferences   jsonb DEFAULT '{}'::jsonb,
  ai_training_consent boolean DEFAULT false,
  data_retention_days integer DEFAULT 30,
  marketing_consent boolean DEFAULT false,
  account_status text DEFAULT 'active',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ===============================================
-- 2. RLS POLICIES
-- ===============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (created automatically on first login)
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role bypass for edge functions
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- ===============================================
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ==============================================
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();