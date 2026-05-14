-- Add FK relationships so PostgREST can embed profiles via hinted FKs used by the app.
-- The existing courses_instructor_id_fkey points to auth.users; we add a separately named FK to profiles.
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_profile_fkey
  FOREIGN KEY (instructor_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
