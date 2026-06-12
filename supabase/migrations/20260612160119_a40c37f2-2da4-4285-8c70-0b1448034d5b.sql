DROP POLICY IF EXISTS "Public can view saved looks" ON public.looks;
DROP POLICY IF EXISTS "Anyone can view outfits by share slug" ON public.outfits;
DROP POLICY IF EXISTS "Public can view saved outfits" ON public.outfits;

REVOKE SELECT ON public.looks FROM anon;
REVOKE SELECT ON public.outfits FROM anon;

ALTER FUNCTION public.get_shared_look(text) SECURITY DEFINER;
ALTER FUNCTION public.get_shared_outfit(text) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_shared_look(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_outfit(text) TO anon, authenticated, service_role;

ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;