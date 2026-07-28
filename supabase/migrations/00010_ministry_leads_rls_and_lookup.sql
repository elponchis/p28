-- Story 2.4: ministry_leads RLS (admin-only writes) + email lookup RPC

-- Admin-only INSERT on ministry_leads (org admin of the ministry's org)
CREATE POLICY "Org admin can assign ministry leads"
  ON public.ministry_leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ministries m
      JOIN public.org_members om ON om.organization_id = m.organization_id
      WHERE m.id = ministry_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- Admin-only DELETE on ministry_leads
CREATE POLICY "Org admin can remove ministry leads"
  ON public.ministry_leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ministries m
      JOIN public.org_members om ON om.organization_id = m.organization_id
      WHERE m.id = ministry_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- RPC: look up user_id by email (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE LOWER(email) = LOWER(lookup_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
