-- Remove visibility preference from profiles (no longer used).
-- Safe for fresh installs (column never created) and existing DBs (column dropped).

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS visibility;
