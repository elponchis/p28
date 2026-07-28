-- Publish pending announcements on a server schedule (pg_cron → Edge Function send-announcement).
-- Does not require any device to keep the app open or stay on the group screen.
--
-- After this migration, create Vault secrets (Dashboard → SQL Editor) and set the Edge Function secret
-- ANNOUNCEMENT_CRON_SECRET. See supabase/functions/send-announcement/README.md.

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.invoke_process_due_announcements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, pg_temp
AS $$
DECLARE
  base_url text;
  ak text;
  crsecret text;
BEGIN
  SELECT ds.decrypted_secret INTO base_url
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'announcements_cron_project_url'
  LIMIT 1;

  SELECT ds.decrypted_secret INTO ak
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'announcements_cron_anon_key'
  LIMIT 1;

  SELECT ds.decrypted_secret INTO crsecret
  FROM vault.decrypted_secrets AS ds
  WHERE ds.name = 'announcements_cron_secret'
  LIMIT 1;

  IF base_url IS NULL OR btrim(base_url) = '' THEN
    RETURN;
  END IF;
  IF ak IS NULL OR btrim(ak) = '' THEN
    RETURN;
  END IF;
  IF crsecret IS NULL OR btrim(crsecret) = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(base_url, '/') || '/functions/v1/send-announcement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || ak,
      'X-Announcement-Cron-Secret', crsecret
    ),
    body := '{"processDue":true}'::jsonb
  );
END;
$$;

ALTER FUNCTION app_private.invoke_process_due_announcements() OWNER TO postgres;

REVOKE ALL ON FUNCTION app_private.invoke_process_due_announcements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.invoke_process_due_announcements() TO postgres;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO postgres;

COMMENT ON FUNCTION app_private.invoke_process_due_announcements() IS
  'POSTs to Edge Function send-announcement with processDue when Vault secrets announcements_cron_* exist; invoked by pg_cron.';

DO $$
DECLARE
  jid int;
BEGIN
  SELECT j.jobid INTO jid FROM cron.job j WHERE j.jobname = 'process_due_announcements';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'process_due_announcements',
  '* * * * *',
  'SELECT app_private.invoke_process_due_announcements();'
);
