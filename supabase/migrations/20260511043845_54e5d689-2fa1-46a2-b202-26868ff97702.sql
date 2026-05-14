-- Chapter quiz questions per section
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL,
  lecture_id UUID,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_questions_section ON public.quiz_questions(section_id);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Instructor of the course or admin can manage
CREATE POLICY "Instructors manage own quiz questions"
ON public.quiz_questions FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.sections s
  JOIN public.courses c ON c.id = s.course_id
  WHERE s.id = quiz_questions.section_id AND c.instructor_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.sections s
  JOIN public.courses c ON c.id = s.course_id
  WHERE s.id = quiz_questions.section_id AND c.instructor_id = auth.uid()
));

CREATE POLICY "Admins manage all quiz questions"
ON public.quiz_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Viewable by purchasers, instructor, admins (similar to lectures)
CREATE POLICY "Quiz questions viewable with course access"
ON public.quiz_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sections s
  JOIN public.courses c ON c.id = s.course_id
  WHERE s.id = quiz_questions.section_id
    AND (
      c.instructor_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_purchased(auth.uid(), c.id)
    )
));

CREATE TRIGGER trg_quiz_questions_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_id UUID NOT NULL,
  course_id UUID NOT NULL,
  score_percent NUMERIC NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_lecture_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_attempts_user_section ON public.quiz_attempts(user_id, section_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own attempts"
ON public.quiz_attempts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Instructors view attempts for own courses"
ON public.quiz_attempts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.courses c
  WHERE c.id = quiz_attempts.course_id AND c.instructor_id = auth.uid()
));

CREATE POLICY "Admins manage all attempts"
ON public.quiz_attempts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));