# send-group-event-created

Sends **Expo** push notifications to **group members** (including the event creator) when a new **group event** is created.

## Invoke

- **Method:** `POST`
- **Headers:** `Authorization: Bearer <user JWT>`, `apikey: <anon or service key>`
- **Body:** `{ "eventId": "<uuid>" }`

The caller must be a **group admin** for the event’s group. The event must exist and have `status = 'active'`.

**Response (success):** `{ "ok": true, "eligibleMembers": n, "messagesQueued": m, "ticketsOk": k, "ticketErrors": [...] }`

- `messagesQueued`: Expo messages built from `push_tokens` for eligible users.
- `ticketsOk`: push tickets with `status: "ok"` from Expo (accepted for delivery).
- If `messagesQueued > 0` but `ticketsOk === 0`, check `ticketErrors` and [Expo push receipts](https://docs.expo.dev/push-notifications/sending-notifications/#push-receipts).

## Recipients

- All `group_members` for the event’s group (**including** the creator, so admins see a notification when testing on their own device).
- Must have `notification_preferences.events_enabled` true (default **true** if no preference row).

## Payload

- **No `channelId` in the Expo message:** If a channel id is set but that channel was never created on the device, **Android drops the notification** while Expo still returns HTTP 200. Omitting `channelId` uses Expo’s default channel (always created).
- **`priority`: `high`** for more reliable delivery when the device is idle (Android/iOS behavior per Expo).
- **`data`:** string values — `{ type: "group_event", eventId, groupId }` for deep linking to `/group/event/[id]`.

## Troubleshooting

1. **HTTP 200 but no banner:** Check response `ticketsOk` and `messagesQueued`. If `messagesQueued === 0`, the user has no row in `push_tokens` (open the app on a **physical device** with notifications allowed so `registerForPushTokens` runs).
2. **`events_enabled` false** in `notification_preferences` excludes the user.
3. **Wrong Expo project:** Token must match the EAS project credentials configured for your app.

## Deploy

```bash
supabase functions deploy send-group-event-created --no-verify-jwt
```

Use `--no-verify-jwt` if your project uses the same pattern as `send-announcement` (manual JWT validation via `auth/v1/user` in the function). Otherwise enable `verify_jwt` in the dashboard and align with your gateway settings.

## Env

Uses default Edge secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (anon optional; falls back to service key for `apikey` on auth request).
