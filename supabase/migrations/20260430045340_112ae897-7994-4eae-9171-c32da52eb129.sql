DROP POLICY IF EXISTS "Lectures viewable by preview or purchase" ON public.lectures;

CREATE POLICY "Lectures viewable by preview or purchase"
ON public.lectures
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sections s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = lectures.section_id
      AND (
        c.instructor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
        OR (
          c.is_published = true
          AND c.is_approved = true
          AND (
            lectures.is_preview = true
            OR s.id = (
              SELECT s2.id
              FROM public.sections s2
              WHERE s2.course_id = s.course_id
              ORDER BY s2.position ASC, s2.created_at ASC
              LIMIT 1
            )
            OR EXISTS (
              SELECT 1
              FROM public.purchases p
              WHERE p.user_id = auth.uid()
                AND p.course_id = c.id
                AND p.status = 'completed'
            )
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can insert progress for accessible lectures" ON public.progress;
DROP POLICY IF EXISTS "Users can update progress for accessible lectures" ON public.progress;

CREATE POLICY "Users can insert progress for accessible lectures"
ON public.progress
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.lectures l
    JOIN public.sections s ON s.id = l.section_id
    JOIN public.courses c ON c.id = s.course_id
    WHERE l.id = progress.lecture_id
      AND (
        c.instructor_id = auth.uid()
        OR l.is_preview = true
        OR s.id = (
          SELECT s2.id
          FROM public.sections s2
          WHERE s2.course_id = s.course_id
          ORDER BY s2.position ASC, s2.created_at ASC
          LIMIT 1
        )
        OR EXISTS (
          SELECT 1
          FROM public.purchases p
          WHERE p.user_id = auth.uid()
            AND p.course_id = c.id
            AND p.status = 'completed'
        )
      )
  )
);

CREATE POLICY "Users can update progress for accessible lectures"
ON public.progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.lectures l
    JOIN public.sections s ON s.id = l.section_id
    JOIN public.courses c ON c.id = s.course_id
    WHERE l.id = progress.lecture_id
      AND (
        c.instructor_id = auth.uid()
        OR l.is_preview = true
        OR s.id = (
          SELECT s2.id
          FROM public.sections s2
          WHERE s2.course_id = s.course_id
          ORDER BY s2.position ASC, s2.created_at ASC
          LIMIT 1
        )
        OR EXISTS (
          SELECT 1
          FROM public.purchases p
          WHERE p.user_id = auth.uid()
            AND p.course_id = c.id
            AND p.status = 'completed'
        )
      )
  )
);

REVOKE EXECUTE ON FUNCTION public.is_lecture_preview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_purchased(uuid, uuid) FROM PUBLIC, anon, authenticated;