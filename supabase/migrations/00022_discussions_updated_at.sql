-- Add updated_at to discussions for "[edited]" indicator.

ALTER TABLE public.discussions ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE public.discussions SET updated_at = created_at;

ALTER TABLE public.discussions ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.discussions ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_discussions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_discussions_updated_at();
