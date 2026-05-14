
CREATE TABLE public.instructor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expertise TEXT NOT NULL,
  bio TEXT NOT NULL,
  website TEXT,
  experience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own application" ON public.instructor_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create application" ON public.instructor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage applications" ON public.instructor_applications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
