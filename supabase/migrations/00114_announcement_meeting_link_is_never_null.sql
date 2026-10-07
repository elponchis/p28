-- 00113의 update_announcement가 회의 링크를 비우면 NULL을 넣었다.
--
-- announcements.meeting_link는 00045부터 `TEXT NOT NULL DEFAULT ''`다. 링크 없는 공지는
-- NULL이 아니라 빈 문자열이고, 만드는 쪽도 그렇게 넣는다. nullif로 비운 탓에 링크가 없는
-- 공지를 고치면 23502(not-null 위반)로 저장 자체가 실패했다 — 제목만 바꿔도 마찬가지다.
--
-- 빈 값은 빈 문자열로 둔다.

CREATE OR REPLACE FUNCTION public.update_announcement(
  p_announcement_id uuid,
  p_title text,
  p_body text,
  p_meeting_link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.can_manage_announcement(p_announcement_id) THEN
    RAISE EXCEPTION 'Not allowed to manage this announcement';
  END IF;
  IF btrim(coalesce(p_title, '')) = '' OR btrim(coalesce(p_body, '')) = '' THEN
    RAISE EXCEPTION 'Title and message are required';
  END IF;

  UPDATE public.announcements
     SET title = btrim(p_title),
         body = btrim(p_body),
         meeting_link = btrim(coalesce(p_meeting_link, ''))
   WHERE id = p_announcement_id;
END;
$$;
