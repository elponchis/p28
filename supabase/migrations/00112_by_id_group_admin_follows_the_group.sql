-- 00111이 놓친 나머지 절반.
--
-- 00095는 함수를 하나만 바꿨다고 적어 뒀지만 실제로는 둘을 바꿨다.
-- current_user_is_effective_group_admin과, 그 옆의 user_is_effective_group_admin_by_id다.
-- 00111이 앞의 것만 되돌려서, 정책은 그룹별로 판정하는데 "이 사람이 이 그룹의 admin인가"를
-- 묻는 함수는 여전히 app_roles만 보고 있었다.
--
-- 그래서 이런 모순이 나왔다 — 그룹 A의 admin이 A에 공지를 올릴 수는 있는데(정책이 허용),
-- 같은 사람에 대해 by_id는 false를 돌려준다. 앱이 관리자 배지와 버튼 노출에 이 함수를 쓰므로,
-- 권한은 있는데 화면에는 버튼이 없는 상태가 된다.
--
-- 00060의 정의로 되돌린다. 두 함수가 같은 질문에 같은 답을 해야 한다.

CREATE OR REPLACE FUNCTION public.user_is_effective_group_admin_by_id(
  p_user_id uuid,
  p_group_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.group_admins ga
      WHERE ga.group_id = p_group_id AND ga.user_id = p_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.app_roles ar
      WHERE ar.user_id = p_user_id AND ar.role = 'super_admin'
    );
$$;

-- 00095가 남긴 설명은 더 이상 사실이 아니다.
COMMENT ON TABLE public.group_admins IS
  '누가 어느 그룹을 운영하는지. super_admin이 임명하고, 여기 행이 있는 사람만 그 그룹의 admin이다.';
