-- Track when users (or guests) attempt to buy a locked course
CREATE TABLE public.purchase_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  course_id UUID NOT NULL,
  lecture_id UUID,
  source TEXT NOT NULL DEFAULT 'course_detail',
  is_guest BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_attempts_course ON public.purchase_attempts(course_id);
CREATE INDEX idx_purchase_attempts_user ON public.purchase_attempts(user_id);
CREATE INDEX idx_purchase_attempts_created_at ON public.purchase_attempts(created_at DESC);

ALTER TABLE public.purchase_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone (guest or signed-in) can log their own attempt
CREATE POLICY "Anyone can log a purchase attempt"
  ON public.purchase_attempts
  FOR INSERT
  WITH CHECK (
    (user_id IS NULL AND is_guest = true)
    OR (user_id = auth.uid() AND is_guest = false)
  );

-- Users can view their own logged attempts
CREATE POLICY "Users can view own purchase attempts"
  ON public.purchase_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Instructors can view attempts for their own courses
CREATE POLICY "Instructors can view attempts on their courses"
  ON public.purchase_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = purchase_attempts.course_id
        AND c.instructor_id = auth.uid()
    )
  );

-- Admins and super admins can view & manage all
CREATE POLICY "Admins can manage purchase attempts"
  ON public.purchase_attempts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
