-- One public course with one video, so the Watch tab has something in it before any real
-- content is loaded. Public because it has no group: everyone signed in can see it.
--
-- Safe to delete once real videos are in. Written to be re-runnable and to leave any edits
-- alone: it inserts only if a course with this title does not already exist.

DO $$
DECLARE
  v_course_id uuid;
BEGIN
  SELECT id INTO v_course_id
  FROM public.courses
  WHERE group_id IS NULL AND title = 'Watch test'
  LIMIT 1;

  IF v_course_id IS NULL THEN
    INSERT INTO public.courses (group_id, title, description, sort_order)
    VALUES (
      NULL,
      'Watch test',
      'Sample video for checking the Watch tab. Delete once real content is in.',
      0
    )
    RETURNING id INTO v_course_id;

    INSERT INTO public.lessons (course_id, title, video_url, sort_order)
    VALUES (
      v_course_id,
      'Test video',
      -- Unlisted: the /<hash> segment is part of the address, not decoration. The embed keeps
      -- it as ?h=, without which the player answers "Private video".
      'https://vimeo.com/1153516468/e830c8eb95',
      0
    );
  END IF;
END $$;
