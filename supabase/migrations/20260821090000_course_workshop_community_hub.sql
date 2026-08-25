-- Enrich course workshops with live-session UX metadata.
ALTER TABLE public.course_workshops
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS agenda TEXT[] DEFAULT '{}';

-- Enrich course communities with WhatsApp links and structured FAQs.
ALTER TABLE public.course_communities
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;

-- In-app learner community chat for each course.
CREATE TABLE IF NOT EXISTS public.course_community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(trim(message)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_community_messages_course_created
  ON public.course_community_messages(course_id, created_at DESC);

ALTER TABLE public.course_community_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course community messages viewable with course access"
  ON public.course_community_messages;
CREATE POLICY "Course community messages viewable with course access"
ON public.course_community_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = course_community_messages.course_id
    AND (
      c.instructor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_purchased(auth.uid(), c.id)
    )
));

DROP POLICY IF EXISTS "Course members send community messages"
  ON public.course_community_messages;
CREATE POLICY "Course members send community messages"
ON public.course_community_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_community_messages.course_id
      AND (
        c.instructor_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
        OR has_purchased(auth.uid(), c.id)
      )
  )
);
