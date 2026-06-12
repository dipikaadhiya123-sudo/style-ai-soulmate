REVOKE EXECUTE ON FUNCTION public.get_shared_look(text) FROM anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_shared_outfit(text) FROM anon, authenticated, service_role;
DROP FUNCTION public.get_shared_look(text);
DROP FUNCTION public.get_shared_outfit(text);