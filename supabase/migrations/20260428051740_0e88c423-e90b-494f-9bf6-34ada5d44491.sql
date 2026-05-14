
REVOKE EXECUTE ON FUNCTION public.has_purchased(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_lecture_preview(uuid) FROM PUBLIC, anon, authenticated;
