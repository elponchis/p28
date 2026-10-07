-- 공지를 내렸다가 고쳐서 다시 올릴 수 있게 한다.
--
-- 지금까지 올라간 공지는 손댈 방법이 없었다. 00039의 UPDATE 정책은 'pending'인 공지를
-- 취소하는 것만 허용했고, 이 앱은 공지를 언제나 'published'로 만든다. 그래서 오타 하나를
-- 고치려면 같은 글을 하나 더 올리는 수밖에 없었다.
--
-- 행을 지우지는 않는다. 공지에는 푸시 발송 기록(announcement_deliveries)과 알림
-- (in_app_notifications)이 걸려 있어서, 지우면 "받았는데 흔적도 없는" 상태가 된다.
-- 대신 status를 'cancelled'로 내리고, 고친 뒤 다시 'published'로 올린다.
--
-- 정책을 넓히는 대신 함수 셋으로 연다. 임의의 UPDATE를 열어 주면 group_id나
-- created_by_user_id까지 바꿀 수 있게 되는데, 바꿀 수 있어야 하는 것은 제목·본문·링크와
-- 상태뿐이다. 일정 쪽(cancel_group_event, update_group_event)이 이미 쓰는 방식이다.
--
-- 누가: 글쓴이 또는 그 그룹의 admin. 00039의 취소 정책이 이미 그 둘을 함께 보고 있었다.

CREATE OR REPLACE FUNCTION public.can_manage_announcement(p_announcement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.id = p_announcement_id
      AND (
        a.created_by_user_id = auth.uid()
        OR public.current_user_is_effective_group_admin(a.group_id)
      )
  );
$$;

-- =============================================================================
-- 내리기
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_announcement(p_announcement_id uuid)
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

  UPDATE public.announcements
     SET status = 'cancelled',
         cancelled_at = now()
   WHERE id = p_announcement_id
     AND status <> 'cancelled';
END;
$$;

-- =============================================================================
-- 고치기 — 내려둔 동안에도, 올라가 있는 동안에도
-- =============================================================================

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
         meeting_link = nullif(btrim(coalesce(p_meeting_link, '')), '')
   WHERE id = p_announcement_id;
END;
$$;

-- =============================================================================
-- 다시 올리기
-- =============================================================================

-- published_at을 다시 찍는다. 목록이 이 값으로 정렬되므로, 고쳐서 올린 공지는 그때의
-- 새 소식으로 선다. cancelled_at은 지운다 — 지금 내려가 있지 않다는 뜻이다.
CREATE OR REPLACE FUNCTION public.republish_announcement(p_announcement_id uuid)
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

  UPDATE public.announcements
     SET status = 'published',
         cancelled_at = NULL,
         published_at = now()
   WHERE id = p_announcement_id
     AND status <> 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_announcement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_announcement(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_announcement(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.republish_announcement(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_announcement(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.republish_announcement(uuid) TO authenticated;
