-- 1) Drop the overly permissive public SELECT policies on base tables
DROP POLICY IF EXISTS "Anyone can view saved looks by slug" ON public.looks;
DROP POLICY IF EXISTS "Anyone can view outfits by share slug" ON public.outfits;

-- Base tables are now owner-only (existing "Users can view own ..." policies remain).

-- 2) Public-safe views that expose only non-sensitive columns.
--    security_invoker=on => the view runs with the caller's RLS, but since
--    base SELECT is owner-only, we expose access via a SECURITY DEFINER RPC below.
--    The views themselves are kept for typed convenience and only return safe columns.

CREATE OR REPLACE VIEW public.shared_looks_public
WITH (security_invoker = on) AS
SELECT
  share_slug,
  item_label,
  category,
  description,
  highlights,
  result_image_path,
  photo_path,
  created_at
FROM public.looks
WHERE saved = true;

CREATE OR REPLACE VIEW public.shared_outfits_public
WITH (security_invoker = on) AS
SELECT
  share_slug,
  occasion,
  title,
  items,
  style_score,
  score_breakdown,
  rationale,
  suggestions,
  created_at
FROM public.outfits
WHERE saved = true;

-- 3) SECURITY DEFINER functions: the ONLY public read path. They require the
--    caller to know the exact share_slug, so enumeration is impossible.

CREATE OR REPLACE FUNCTION public.get_shared_look(_slug text)
RETURNS TABLE (
  share_slug text,
  item_label text,
  category text,
  description text,
  highlights jsonb,
  result_image_path text,
  photo_path text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.share_slug, l.item_label, l.category, l.description,
         l.highlights, l.result_image_path, l.photo_path, l.created_at
  FROM public.looks l
  WHERE l.saved = true AND l.share_slug = _slug
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_outfit(_slug text)
RETURNS TABLE (
  share_slug text,
  occasion text,
  title text,
  items jsonb,
  style_score numeric,
  score_breakdown jsonb,
  rationale text,
  suggestions jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.share_slug, o.occasion, o.title, o.items, o.style_score,
         o.score_breakdown, o.rationale, o.suggestions, o.created_at
  FROM public.outfits o
  WHERE o.saved = true AND o.share_slug = _slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_look(text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_outfit(text) TO anon, authenticated;