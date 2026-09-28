-- 그룹을 운영하는 사람은 그 그룹에만 권한이 있다.
--
-- 00095가 group_admins를 앱 관리자로 흡수했다. 근거는 "당시 group_admins 행이 하나였고 그
-- 사람은 이미 super admin이라, per-group 임명은 아무것도 결정하지 않고 있었다"였다. 데이터가
-- 비어 있던 건 맞지만 결론이 틀렸다 — 임명하는 화면을 아직 만들지 않아서 비어 있었을 뿐이고,
-- 의도는 처음부터 "super_admin이 그룹마다 admin을 지정한다"였다.
--
-- 그래서 00059의 모델로 되돌린다. 층은 둘이다:
--   super_admin  — 플랫폼. 그룹을 만들고, 그룹 admin을 임명하고, 전체 공지와 말씀을 쓴다.
--   그룹 admin   — 그 그룹의 group_admins 행. 그 그룹만 운영한다.
-- 앱 레벨 admin 역할은 없앤다.
--
-- 00095가 그랬듯 여기서도 바뀌는 건 함수 하나다. 쉰여섯 개 정책이
-- current_user_is_effective_group_admin에게 묻고 있어서, 손대지 않아도 새 답을 따른다.

-- =============================================================================
-- 1. 그룹 운영 권한: 그 그룹의 group_admins 행, 또는 super_admin
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_is_effective_group_admin(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.group_admins ga
      WHERE ga.group_id = p_group_id AND ga.user_id = auth.uid()
    )
    OR public.current_user_is_super_admin();
$$;

-- by_id 쪽은 00095가 건드리지 않아 이미 같은 기준이다. 다만 service_role에게만 열려 있어서
-- 클라이언트가 "이 사람이 이 그룹의 admin인가"를 물을 수 없었다. 앱이 app_roles를 직접
-- 읽는 대신 이 함수를 쓰게 하려고 authenticated에도 연다. SECURITY DEFINER라, 남의 역할을
-- 볼 수 없는 RLS 아래에서도 정직한 답이 나온다.
GRANT EXECUTE ON FUNCTION public.user_is_effective_group_admin_by_id(uuid, uuid) TO authenticated;

-- =============================================================================
-- 2. 앱 레벨 admin 역할 제거
-- =============================================================================

-- 이름은 쉰여섯 개 정책이 부르고 있어 그대로 두고, 뜻만 바꾼다. admin 역할이 사라졌으니
-- 이 질문의 답은 super_admin 하나뿐이다. 역할이 돌아오면 이 한 줄만 되돌리면 된다.
CREATE OR REPLACE FUNCTION public.current_user_is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_is_super_admin();
$$;

-- 이 제약은 안전장치이기도 하다. admin 행이 하나라도 남아 있으면 Postgres가 기존 행을
-- 검증하다 실패하므로, 누군가 조용히 권한을 잃는 일이 생기지 않는다. 실패하면 그 사람을
-- 어느 그룹의 admin으로 넣을지 정한 뒤 다시 적용할 것.
ALTER TABLE public.app_roles DROP CONSTRAINT IF EXISTS app_roles_role_check;
ALTER TABLE public.app_roles
  ADD CONSTRAINT app_roles_role_check CHECK (role IN ('super_admin'));

-- admin을 넣던 정책은 이제 성립할 수 없다. super_admin은 예전부터 이 경로로 만들 수 없었고
-- (정책이 role = 'admin'만 허용했다) SQL로 심어 왔다. 죽은 정책을 남겨 두지 않는다.
DROP POLICY IF EXISTS "Super admin can insert admin roles" ON public.app_roles;

-- =============================================================================
-- 3. 그룹 admin은 super_admin만 임명한다
-- =============================================================================

-- 지금까지는 "그룹 생성자 또는 super_admin"이었다. 그룹을 만드는 것도 이제 super_admin의
-- 일이므로 생성자 조항은 의미가 없고, 임명은 한 곳에서만 일어나야 한다.
DROP POLICY IF EXISTS "Group creator or super admin can add group admin" ON public.group_admins;
DROP POLICY IF EXISTS "Group creator or super admin can remove group admin" ON public.group_admins;

CREATE POLICY "Super admin can add group admin"
  ON public.group_admins FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY "Super admin can remove group admin"
  ON public.group_admins FOR DELETE
  TO authenticated
  USING (public.current_user_is_super_admin());

COMMENT ON TABLE public.group_admins IS
  '누가 어느 그룹을 운영하는지. super_admin이 임명하고, 여기 행이 있는 사람만 그 그룹의 admin이다.';
