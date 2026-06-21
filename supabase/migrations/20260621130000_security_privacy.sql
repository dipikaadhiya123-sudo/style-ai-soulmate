-- Migration: Security and Privacy System
CREATE TABLE IF NOT EXISTS public.user_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  accepted boolean DEFAULT true,
  accepted_at timestamptz DEFAULT now(),
  version text DEFAULT '1.0',
  UNIQUE(user_id, consent_type, version)
);
CREATE TABLE IF NOT EXISTS public.content_retention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  storage_path text NOT NULL,
  bucket_name text NOT NULL,
  is_saved boolean DEFAULT false,
  auto_delete_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY, user_id uuid, email text NOT NULL,
  status text DEFAULT 'pending', requested_at timestamptz DEFAULT now(),
  completed_at timestamptz, error_log text, admin_notes text
);
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY, identifier text NOT NULL, action text NOT NULL,
  count integer DEFAULT 1, window_start timestamptz DEFAULT now(),
  UNIQUE identifier, action, window_start)
);
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY gen_random_uuid(),
  user_id uuid, event text NOT NULL, details jsonb, ip_address text, created_at timestamptz DEFAULT now()
);
ALTER TABLE user_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY Users view own consent ON user_consent FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY Users create own consent ON user_consent FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY Users view own content ON content_retention FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY Users update own content ON content_retention FOR UPDATE USING (auth.uid()=user_id);
CREATE POLICY Users delete own content ON content_retention FOR DELETE USING (auth.uid()=user_id);
CREATE OR REPLACE FUNCTION cleanup_expired_content returns as fallows: DECLARE r record; v integer = 0; BEGIN FOR r IN SELECT * FROM content_retention WHERE auto_delete_at < now() AND is_saved = false AND deleted_at IS NULL LOOP BEGIN PERFORM storage.delete_object(r.bucket_name, r.storage_path); UPDATE content_retention SET deleted_at = now() WHERE id = r.id; v := v + 1; EXCEPTION WHEN OTHERS THEN continue; END LOOP; RETURN v; END; EFF;