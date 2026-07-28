-- Group announcements, per-group member notification settings, push tokens, delivery log.

-- =============================================================================
-- 1. announcements
-- =============================================================================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'cancelled')),
  scheduled_publish_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 minutes'),
  published_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_group_id ON public.announcements(group_id);
CREATE INDEX idx_announcements_status_scheduled ON public.announcements(status, scheduled_publish_at)
  WHERE status = 'pending';

-- Keep scheduled_publish_at aligned with created_at + 2 minutes on insert
CREATE OR REPLACE FUNCTION public.set_announcement_scheduled_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.scheduled_publish_at := COALESCE(NEW.created_at, now()) + interval '2 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_announcements_scheduled_publish
  BEFORE INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_announcement_scheduled_publish();

-- =============================================================================
-- 2. group_member_settings (per-group toggles)
-- =============================================================================

CREATE TABLE public.group_member_settings (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  announcements_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE INDEX idx_group_member_settings_group_id ON public.group_member_settings(group_id);

-- =============================================================================
-- 3. push_tokens
-- =============================================================================

CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

-- =============================================================================
-- 4. announcement_deliveries (Edge Function / service role writes)
-- =============================================================================

CREATE TABLE public.announcement_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_announcement_deliveries_announcement_id ON public.announcement_deliveries(announcement_id);

-- =============================================================================
-- 5. RLS
-- =============================================================================

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_member_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_deliveries ENABLE ROW LEVEL SECURITY;
-- No policies: authenticated has no access; service_role bypasses RLS for Edge Function writes.

-- announcements: group admins insert
CREATE POLICY "Group admins can insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = announcements.group_id AND ga.user_id = auth.uid()
    )
    AND created_by_user_id = auth.uid()
  );

-- Members see published; group admins see all for their group
CREATE POLICY "Members can read published announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = announcements.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can read all announcements in group"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = announcements.group_id AND ga.user_id = auth.uid()
    )
  );

-- Cancel: pending only, creator or group admin
CREATE POLICY "Creator or group admin can cancel pending announcement"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND (
      created_by_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.group_admins ga
        WHERE ga.group_id = announcements.group_id AND ga.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    status = 'cancelled'
    AND cancelled_at IS NOT NULL
  );

-- group_member_settings: only if member of group, own row
CREATE POLICY "Members can read own group member settings"
  ON public.group_member_settings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_member_settings.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert own group member settings"
  ON public.group_member_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_member_settings.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update own group member settings"
  ON public.group_member_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- push_tokens: own rows only
CREATE POLICY "Users can read own push tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push tokens"
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
