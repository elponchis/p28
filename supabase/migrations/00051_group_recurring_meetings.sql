-- Recurring meeting templates for ministry groups (wall clock + IANA timezone).
-- Discovery: meeting_link redacted via RPC for non-members (client uses RPC when !member).

CREATE TABLE public.group_recurring_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  meeting_link TEXT,
  recurrence_frequency TEXT NOT NULL CHECK (recurrence_frequency IN ('weekly', 'biweekly', 'monthly_nth')),
  -- 0 = Sunday .. 6 = Saturday (JavaScript Date.getDay)
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  time_local TIME NOT NULL,
  timezone TEXT NOT NULL CHECK (length(trim(timezone)) > 0),
  -- 1–4 = first..fourth; -1 = last; required when monthly_nth
  month_week_ordinal SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_recurring_meeting_ordinal CHECK (
    (recurrence_frequency IN ('weekly', 'biweekly') AND month_week_ordinal IS NULL)
    OR (
      recurrence_frequency = 'monthly_nth'
      AND month_week_ordinal IS NOT NULL
      AND (month_week_ordinal BETWEEN 1 AND 4 OR month_week_ordinal = -1)
    )
  )
);

CREATE INDEX idx_group_recurring_meetings_group_id ON public.group_recurring_meetings(group_id);

CREATE OR REPLACE FUNCTION public.set_group_recurring_meetings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_recurring_meetings_updated_at
  BEFORE UPDATE ON public.group_recurring_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_group_recurring_meetings_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_recurring_meeting_ministry_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = NEW.group_id AND g.type = 'ministry'
  ) THEN
    RAISE EXCEPTION 'Recurring meetings are only allowed for ministry groups';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recurring_meeting_ministry_only
  BEFORE INSERT OR UPDATE ON public.group_recurring_meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_recurring_meeting_ministry_group();

CREATE OR REPLACE FUNCTION public.discovery_group_recurring_meetings_for_group(p_group_id uuid)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  created_by_user_id uuid,
  title text,
  description text,
  location text,
  meeting_link text,
  recurrence_frequency text,
  weekday smallint,
  time_local time,
  timezone text,
  month_week_ordinal smallint,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.group_id,
    m.created_by_user_id,
    m.title,
    m.description,
    m.location,
    NULL::text AS meeting_link,
    m.recurrence_frequency,
    m.weekday,
    m.time_local,
    m.timezone,
    m.month_week_ordinal,
    m.created_at,
    m.updated_at
  FROM public.group_recurring_meetings m
  WHERE m.group_id = p_group_id
  ORDER BY m.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.discovery_group_recurring_meetings_for_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discovery_group_recurring_meetings_for_group(uuid) TO authenticated;

ALTER TABLE public.group_recurring_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read recurring meetings"
  ON public.group_recurring_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_recurring_meetings.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can insert recurring meetings"
  ON public.group_recurring_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = group_recurring_meetings.group_id AND ga.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can update recurring meetings"
  ON public.group_recurring_meetings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = group_recurring_meetings.group_id AND ga.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_admins ga
      WHERE ga.group_id = group_recurring_meetings.group_id AND ga.user_id = auth.uid()
    )
  );
