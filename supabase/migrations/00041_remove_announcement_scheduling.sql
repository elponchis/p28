-- Remove announcement grace period / scheduling: immediate publish only; drop pg_cron hook and pending lifecycle.

-- 1. Tear down pg_cron job and helper from 00040 (extensions left in place).
DO $$
DECLARE
  jid int;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    SELECT j.jobid INTO jid FROM cron.job j WHERE j.jobname = 'process_due_announcements';
    IF jid IS NOT NULL THEN
      PERFORM cron.unschedule(jid);
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS app_private.invoke_process_due_announcements();

-- 2. Backfill any pending rows before tightening constraints.
UPDATE public.announcements
SET
  status = 'published',
  published_at = COALESCE(published_at, now())
WHERE status = 'pending';

-- 3. Drop scheduling trigger and column machinery.
DROP TRIGGER IF EXISTS trg_announcements_scheduled_publish ON public.announcements;
DROP FUNCTION IF EXISTS public.set_announcement_scheduled_publish();
DROP INDEX IF EXISTS idx_announcements_status_scheduled;
ALTER TABLE public.announcements DROP COLUMN IF EXISTS scheduled_publish_at;

-- 4. Replace status check: no pending.
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_status_check;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_status_check
  CHECK (status IN ('published', 'cancelled'));

ALTER TABLE public.announcements
  ALTER COLUMN status SET DEFAULT 'published';

-- 5. Remove client UPDATE policy used only to cancel pending announcements.
DROP POLICY IF EXISTS "Creator or group admin can cancel pending announcement" ON public.announcements;
