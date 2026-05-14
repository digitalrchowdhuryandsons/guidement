CREATE OR REPLACE FUNCTION public.has_purchased(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(_user_id = auth.uid(), false)
    AND EXISTS (
      SELECT 1
      FROM public.purchases
      WHERE user_id = _user_id
        AND course_id = _course_id
        AND status = 'completed'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_lecture_preview(_lecture_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lectures l
    JOIN public.sections s ON s.id = l.section_id
    WHERE l.id = _lecture_id
      AND (
        l.is_preview = true
        OR s.id = (
          SELECT s2.id
          FROM public.sections s2
          WHERE s2.course_id = s.course_id
          ORDER BY s2.position ASC, s2.created_at ASC
          LIMIT 1
        )
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_lecture_preview(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_purchased(uuid, uuid) TO authenticated;