# Supabase migrations

Migrations live in `supabase/migrations/`. Apply via Supabase CLI (`supabase db push` or `supabase migration up`) or via CI.

## Group announcements

Announcements are stored as **published** immediately. The app calls the **`send-announcement`** Edge Function after insert to deliver pushes. Migration **`00041_remove_announcement_scheduling.sql`** removes the old grace period, `scheduled_publish_at`, and the `pg_cron` hook from **`00040`** (if applied).

## Group events (push)

After a successful **`create_group_event_with_discussion`** RPC, the app best-effort invokes **`send-group-event-created`** with `{ eventId }` so group members (including the creator) with **`notification_preferences.events_enabled`** receive an Expo push. The function response includes `messagesQueued`, `ticketsOk`, and `ticketErrors` for debugging. Deploy with:

`supabase functions deploy send-group-event-created --no-verify-jwt` (align `verify_jwt` with **`send-announcement`**). See **`supabase/functions/send-group-event-created/README.md`**.

## Chat messages (push)

After a chat message row is stored, the adapter fires **`send-chat-message`** with `{ messageId }`
without awaiting it, so a push failure can never look like a send failure. Recipients are the
chat's other members, filtered by `notification_preferences.messages_enabled`, by
`chat_members.request_state`, and by whether they have already read the message. Deploy with:

`supabase functions deploy send-chat-message --no-verify-jwt`. See
**`supabase/functions/send-chat-message/README.md`**.

Read receipts ride on **`00082_chat_members_realtime.sql`**, which puts `chat_members` in the
`supabase_realtime` publication so a moving `last_read_at` reaches the sender live.

## Schema overview (as of Story 2.1)

- **organizations** — id, name, created_at, updated_at
- **ministries** — id, organization_id (FK → organizations), name, created_at, updated_at; UNIQUE(organization_id, name)
- **groups** — id, ministry_id (FK → ministries), name, created_at, updated_at; UNIQUE(ministry_id, name)
- **org_members** — PK (user_id, organization_id); user_id, organization_id, role (admin|member), joined_at
- **ministry_leads** — PK (user_id, ministry_id); user_id, ministry_id, assigned_at

Hierarchy: Organization → Ministry → Group.

## RLS (as of Story 2.3)

- **00006–00007:** Authenticated read (SELECT) on organizations, ministries, groups, org_members, ministry_leads.
- **00008:** Authenticated INSERT and UPDATE on organizations, ministries, groups.
- **00009:** Admin-only writes. Organizations: any authenticated can INSERT (creator is added as admin by app); only org admins can UPDATE. Ministries and groups: only users with `org_members.role='admin'` for the org can INSERT/UPDATE. org_members: users can add themselves (used when creating org).

`updated_at` on org/ministry/group is app-maintained (no trigger).
