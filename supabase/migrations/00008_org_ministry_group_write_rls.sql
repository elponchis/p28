-- Story 2.2: RLS policies for create/update on org, ministry, group.
-- Authenticated users can write; Story 2.3 (admin UI) will restrict to admin role.

-- Organizations: authenticated insert/update
CREATE POLICY "Authenticated can insert organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update organizations"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ministries: authenticated insert/update
CREATE POLICY "Authenticated can insert ministries"
  ON public.ministries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update ministries"
  ON public.ministries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Groups: authenticated insert/update
CREATE POLICY "Authenticated can insert groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update groups"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
