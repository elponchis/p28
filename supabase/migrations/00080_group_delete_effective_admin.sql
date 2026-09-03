-- Group deletion: bring DELETE in line with what UPDATE has done since 00059.
--
-- The intended rule -- creator, group admin, or super admin -- was written on 2026-07-29 as
-- 00025b_group_delete_admin_super_admin_rls.sql, and that file has never run against any
-- database. `supabase db push` skips any migration whose prefix is not all digits
-- ("file name must match pattern <timestamp>_name.sql") and reports it as a notice rather
-- than an error, so every push since has passed it by in silence. The remote groups table
-- still carries the original "Group creator can delete group" from the base schema.
--
-- The app already assumes the wider rule: app/group/edit.tsx:77 shows the delete action when
-- isCreator || isGroupAdmin || isAppAdmin. So a group admin who is not the creator sees the
-- button, and the DELETE matches zero rows -- RLS filters rather than raises, so it fails
-- with no error to show.
--
-- This is deliberately NOT a verbatim replay of 00025b. That file inlines
--   EXISTS (SELECT 1 FROM public.app_roles WHERE user_id = auth.uid() AND role = 'super_admin')
-- into the policy body, which is the exact shape 00012 was written to remove -- see its
-- section 4, "Drop and recreate groups policies (they reference app_roles)". Reading a
-- RLS-protected table from inside a policy is what produced the recursion 00012 fixed, and
-- the project's answer has been the SECURITY DEFINER helper ever since. Using that helper
-- here also means DELETE and UPDATE on groups now read identically.

DROP POLICY IF EXISTS "Group creator can delete group" ON public.groups;
DROP POLICY IF EXISTS "Creator, group admin, or super admin can delete group" ON public.groups;

CREATE POLICY "Creator, group admin, or super admin can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR public.current_user_is_effective_group_admin(id)
  );
