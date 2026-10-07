-- 아직 내보일 때가 아닌 그룹을 숨긴다.
--
-- 실제 사용자가 들어오기 시작하는데 "LMS 테스트 그룹"처럼 확인용으로 만든 그룹이 목록에
-- 그대로 서 있다. 지우기에는 그 안에 묵상·나눔·과제가 들어 있어서(지우면 ON DELETE
-- CASCADE로 함께 사라진다) 보이지 않게만 한다.
--
-- 그룹은 지금까지 로그인한 사람 전원에게 보였다(00011, USING (true)). 숨김 표시가 붙은
-- 그룹만 super_admin에게로 좁힌다. 나머지 그룹은 전과 똑같다.

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.groups.hidden IS
  '켜면 super_admin에게만 보인다. 확인용 그룹을 지우지 않고 치워 두는 용도.';

DROP POLICY IF EXISTS "Authenticated can read groups" ON public.groups;

CREATE POLICY "Authenticated can read groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (
    NOT hidden
    OR public.current_user_is_super_admin()
  );
