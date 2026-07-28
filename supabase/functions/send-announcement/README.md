# send-announcement

Edge Function that sends **Expo push notifications** for a **published** group announcement and upserts `announcement_deliveries`. Uses the **service role** for DB access (RLS does not expose deliveries to clients).

**Auth:** This function is deployed with **gateway `verify_jwt` disabled** so invocations work with [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys) (asymmetric tokens). The handler still requires a valid user `Authorization: Bearer` token and checks it with `GET /auth/v1/user` before doing any work.

## Invoke from the app

**POST** with the signed-in user’s JWT (Authorization: Bearer …).

**Body:** `{ "announcementId": "<uuid>" }`

**Rules:**

- The announcement must exist with `status = 'published'`.
- The caller must be a **group admin** for that announcement’s group.

**Idempotency:** Users who already have an `announcement_deliveries` row for this announcement are skipped. Retries can deliver to the rest if the first run was partial. Delivery rows are only inserted when Expo returns `status: "ok"` for that device’s push ticket (no rows are written if there are no tokens or Expo rejects all tickets).

No cron, batch, or separate cron secret is required; the app invokes this once right after creating an announcement.
