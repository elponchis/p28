-- Platform-wide announcements visible on the home feed (super admins only can create).

CREATE TABLE public.global_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT global_announcements_title_nonempty CHECK (length(trim(title)) > 0),
  CONSTRAINT global_announcements_description_nonempty CHECK (length(trim(description)) > 0)
);

CREATE INDEX idx_global_announcements_created_at ON public.global_announcements (created_at DESC);

ALTER TABLE public.global_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read global announcements"
  ON public.global_announcements
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert global announcements"
  ON public.global_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_super_admin()
    AND created_by_user_id = auth.uid()
  );
