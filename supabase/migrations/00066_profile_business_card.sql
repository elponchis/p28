-- Business-card profile fields: title (e.g. "Pastor"), organization (e.g. "Blue Ocean"),
-- and tags for multiple free-form labels. All nullable — no backfill needed, existing rows
-- and the on_auth_user_created trigger (00065) are unaffected since it never sets these.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- No RLS changes needed: "Users can view others' profiles" (USING (true), see 00001_profiles.sql)
-- already allows public read of every column, and "Users can update own profile" already
-- covers any column on a self-owned row.
