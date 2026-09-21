-- The verse on the home screen, rotating a day at a time.
--
-- One row per verse per language, ordered by `sort_order`. The app picks the row whose position
-- matches the day, so the list cycles on its own and nobody has to post anything each morning.
-- Adding a verse is inserting a row — no deploy.

CREATE TABLE public.daily_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  reference TEXT NOT NULL,
  passage TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_verses_locale_supported CHECK (locale IN ('en', 'ko', 'km')),
  CONSTRAINT daily_verses_reference_nonempty CHECK (length(trim(reference)) > 0),
  CONSTRAINT daily_verses_passage_nonempty CHECK (length(trim(passage)) > 0),
  CONSTRAINT daily_verses_unique_position UNIQUE (locale, sort_order)
);

CREATE INDEX idx_daily_verses_locale_order ON public.daily_verses (locale, sort_order);

ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily verses"
  ON public.daily_verses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can write daily verses"
  ON public.daily_verses
  FOR ALL
  TO authenticated
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

-- The verse the home screen already showed, so the rotation starts with something in it.
INSERT INTO public.daily_verses (locale, sort_order, reference, passage) VALUES
  ('ko', 1, '시편 27:1', '여호와는 나의 빛이요 나의 구원이시니 내가 누구를 두려워하리요 여호와는 내 생명의 능력이시니 내가 누구를 무서워하리요'),
  ('en', 1, 'Psalm 27:1', 'The Lord is my light and my salvation; whom shall I fear? The Lord is the stronghold of my life; of whom shall I be afraid?'),
  ('km', 1, 'ទំនុកតម្កើង ២៧:១', 'ព្រះអម្ចាស់ជាពន្លឺ និងជាសេចក្តីសង្គ្រោះរបស់ខ្ញុំ ខ្ញុំនឹងខ្លាចអ្នកណា? ព្រះអម្ចាស់ជាកម្លាំងនៃជីវិតខ្ញុំ ខ្ញុំនឹងភ័យអ្នកណា?');
