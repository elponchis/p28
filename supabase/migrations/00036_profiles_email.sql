-- Add email column to profiles, backfill from auth.users, and auto-populate on insert.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

-- Trigger function: copy email from auth.users on profile insert when not explicitly set
CREATE OR REPLACE FUNCTION public.set_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT email INTO NEW.email FROM auth.users WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_profile_email
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_email();
