CREATE TABLE IF NOT EXISTS public.payment_retries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  razorpay_order_id text,
  event_type text NOT NULL CHECK (event_type IN ('new_order', 'resume')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_retries_course_idx ON public.payment_retries(course_id);
CREATE INDEX IF NOT EXISTS payment_retries_user_idx ON public.payment_retries(user_id);

ALTER TABLE public.payment_retries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own retry events"
  ON public.payment_retries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own retry events"
  ON public.payment_retries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Instructors view retries for own courses"
  ON public.payment_retries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = payment_retries.course_id AND c.instructor_id = auth.uid()
  ));

CREATE POLICY "Admins manage retry events"
  ON public.payment_retries FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
