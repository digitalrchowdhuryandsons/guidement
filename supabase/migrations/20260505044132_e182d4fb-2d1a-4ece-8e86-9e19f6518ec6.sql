CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_course_completed_unique
  ON public.purchases (user_id, course_id)
  WHERE status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_payment_id_unique
  ON public.purchases (stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;