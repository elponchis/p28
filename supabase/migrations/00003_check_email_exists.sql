-- RPC for sign-up screen: check if an email is already registered (auth.users).
-- Used to show "email already exists" without calling auth.signUp.
-- SECURITY DEFINER allows reading auth.users; anon can call this function.

CREATE OR REPLACE FUNCTION public.check_email_exists(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(check_email));
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO authenticated;
