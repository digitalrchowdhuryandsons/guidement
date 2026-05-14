REVOKE EXECUTE ON FUNCTION public.get_retry_user_details(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_retry_user_details(uuid[]) TO authenticated;