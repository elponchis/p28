-- What a course is, apart from who may watch it.
--
-- group_id has been carrying two meanings: "this group's members may watch it", and — when NULL —
-- "public". The Vimeo import writes courses with no group, because which cohort gets a term is
-- decided later, so the training school's whole curriculum (A~F) arrives labelled "open to
-- everyone" on the shelf and in the admin list. It is not actually watchable by anyone, since
-- is_published is false; it is just described wrongly.
--
-- The two facts are independent and both are needed. A training school course can be public: the
-- courses sinaesga.org gives away are training school material opened to everybody, and under the
-- old model there was nowhere to say so. So a course now carries its own track, and group_id goes
-- back to meaning only what it says.
--
-- Nothing about access changes. Read policies do not mention track and are untouched; this is a
-- label, and calling a course a training school course grants nobody anything.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_track_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_track_check CHECK (track IN ('general', 'training_school'));

COMMENT ON COLUMN public.courses.track IS
  'What kind of course this is: general, or part of the training school curriculum. Independent of group_id, which says who may watch it — a training school course can be public.';

-- Backfill 1: a course that already belongs to a training school is one.
UPDATE public.courses c
SET track = 'training_school'
FROM public.groups g
WHERE g.id = c.group_id
  AND g.type = 'training_school'
  AND c.track <> 'training_school';

-- Backfill 2: the imported curriculum. These are the courses the Vimeo import created — no group,
-- not yet open, and named for the course they are ("A. 개인경건 과정" ... "F. 지도력 과정"). The
-- match is narrow on purpose: a general course that is already open, or that belongs to a group,
-- is left alone whatever it is called.
UPDATE public.courses
SET track = 'training_school'
WHERE group_id IS NULL
  AND COALESCE(is_published, false) = false
  AND title ~ '^[A-F]\.'
  AND track <> 'training_school';
