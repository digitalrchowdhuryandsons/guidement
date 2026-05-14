
-- Helpers
CREATE OR REPLACE FUNCTION public.has_purchased(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.purchases
    WHERE user_id = _user_id
      AND course_id = _course_id
      AND status = 'completed'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_lecture_preview(_lecture_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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
          SELECT s2.id FROM public.sections s2
          WHERE s2.course_id = s.course_id
          ORDER BY s2.position ASC, s2.created_at ASC
          LIMIT 1
        )
      )
  )
$$;

-- Lectures SELECT
DROP POLICY IF EXISTS "Lectures viewable with section" ON public.lectures;
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
            public.is_lecture_preview(lectures.id)
            OR public.has_purchased(auth.uid(), c.id)
          )
        )
      )
  )
);

-- Progress policies
DROP POLICY IF EXISTS "Users can manage own progress" ON public.progress;
DROP POLICY IF EXISTS "Users can insert progress for accessible lectures" ON public.progress;
DROP POLICY IF EXISTS "Users can update progress for accessible lectures" ON public.progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.progress;

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
        OR public.is_lecture_preview(l.id)
        OR public.has_purchased(auth.uid(), c.id)
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
        OR public.is_lecture_preview(l.id)
        OR public.has_purchased(auth.uid(), c.id)
      )
  )
);

CREATE POLICY "Users can delete own progress"
ON public.progress
FOR DELETE
USING (auth.uid() = user_id);

-- Course attachments
CREATE TABLE IF NOT EXISTS public.course_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  section_id uuid,
  lecture_id uuid,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors manage own attachments" ON public.course_attachments;
DROP POLICY IF EXISTS "Admins manage all attachments" ON public.course_attachments;
DROP POLICY IF EXISTS "Purchasers can view attachments" ON public.course_attachments;

CREATE POLICY "Instructors manage own attachments"
ON public.course_attachments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_attachments.course_id
      AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_attachments.course_id
      AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Admins manage all attachments"
ON public.course_attachments
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Purchasers can view attachments"
ON public.course_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_attachments.course_id
      AND (
        c.instructor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.has_purchased(auth.uid(), c.id)
      )
  )
);

DROP TRIGGER IF EXISTS update_course_attachments_updated_at ON public.course_attachments;
CREATE TRIGGER update_course_attachments_updated_at
BEFORE UPDATE ON public.course_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_course_attachments_course ON public.course_attachments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_attachments_lecture ON public.course_attachments(lecture_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Instructors can upload course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can update course materials" ON storage.objects;
DROP POLICY IF EXISTS "Instructors can delete course materials" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users can read course materials" ON storage.objects;

CREATE POLICY "Instructors can upload course materials"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can update course materials"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Instructors can delete course materials"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.instructor_id = auth.uid()
  )
);

CREATE POLICY "Authorized users can read course materials"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'course-materials'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (
        c.instructor_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
        OR public.has_purchased(auth.uid(), c.id)
      )
  )
);
