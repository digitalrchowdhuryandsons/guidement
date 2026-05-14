CREATE TABLE IF NOT EXISTS public.pending_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  razorpay_order_id text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  key_id text NOT NULL,
  course_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE UNIQUE INDEX IF NOT EXISTS pending_orders_user_course_unique
  ON public.pending_orders(user_id, course_id);

ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending orders"
  ON public.pending_orders FOR SELECT
  USING (auth.uid() = user_id);
