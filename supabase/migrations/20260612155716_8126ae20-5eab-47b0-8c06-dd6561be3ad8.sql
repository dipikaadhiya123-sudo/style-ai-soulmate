GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outfits TO authenticated;
GRANT SELECT ON public.outfits TO anon;
GRANT ALL ON public.outfits TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.looks TO authenticated;
GRANT SELECT ON public.looks TO anon;
GRANT ALL ON public.looks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT EXECUTE ON FUNCTION public.get_shared_look(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_outfit(text) TO anon, authenticated, service_role;