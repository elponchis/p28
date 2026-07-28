-- In-app notification rows respect per-group member toggles (same idea as push eligibility).

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
  v_group_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  IF v_group_name IS NULL THEN
    v_group_name := '';
  END IF;

  v_summary := left(btrim(regexp_replace(NEW.body, '[[:space:]]+', ' ', 'g')), 280);
  IF v_summary IS NULL OR v_summary = '' THEN
    v_summary := NEW.title;
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, announcement_id, group_event_id, title, summary
  )
  SELECT
    gm.user_id,
    NEW.group_id,
    v_group_name,
    'announcement'::TEXT,
    NEW.id,
    NULL::UUID,
    NEW.title,
    v_summary
  FROM public.group_members gm
  LEFT JOIN public.group_member_settings gms
    ON gms.group_id = gm.group_id AND gms.user_id = gm.user_id
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id IS DISTINCT FROM NEW.created_by_user_id
    AND COALESCE(gms.announcements_enabled, true);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_in_app_notifications_for_group_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary TEXT;
  v_group_name TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  IF v_group_name IS NULL THEN
    v_group_name := '';
  END IF;

  v_summary := left(NULLIF(btrim(NEW.description), ''), 280);
  IF v_summary IS NULL OR v_summary = '' THEN
    v_summary := to_char(NEW.starts_at AT TIME ZONE 'UTC', 'Mon DD, YYYY HH24:MI') || ' UTC';
  END IF;

  INSERT INTO public.in_app_notifications (
    user_id, group_id, group_name, kind, announcement_id, group_event_id, title, summary
  )
  SELECT
    gm.user_id,
    NEW.group_id,
    v_group_name,
    'group_event'::TEXT,
    NULL::UUID,
    NEW.id,
    NEW.title,
    v_summary
  FROM public.group_members gm
  LEFT JOIN public.group_member_settings gms
    ON gms.group_id = gm.group_id AND gms.user_id = gm.user_id
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id IS DISTINCT FROM NEW.created_by_user_id
    AND COALESCE(gms.events_enabled, true);

  RETURN NEW;
END;
$$;
