-- Event-linked discussions stay open after the event starts; only cancelled events lock the thread.

CREATE OR REPLACE FUNCTION public.is_group_event_discussion_locked(p_discussion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_events ge
    WHERE ge.discussion_id = p_discussion_id
      AND ge.status = 'cancelled'
  );
$$;
