-- Story: Sign-up onboarding fields for profiles
-- Adds first/last name, birth date, country, and preferred language to profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language TEXT;

