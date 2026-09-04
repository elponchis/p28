# send-chat-message

Push notifications for chat messages.

## Deploy

```bash
supabase functions deploy send-chat-message --no-verify-jwt
```

`--no-verify-jwt` matches `send-announcement` and `send-group-event-created`: the function does its
own auth with `verifyUserFromAuthorizationHeader`, then checks that the caller is the author of the
message it was asked to announce.

## Invoke

The app calls it automatically. `createChatMessage` in the Supabase data adapter fires it after the
row is stored, without awaiting:

```
POST { "messageId": "<uuid>" }
```

A failure here is logged and dropped. The message is already sent; a push that did not go out must
never look like a message that did not.

## Who gets notified

Every other member of the chat, minus:

| Skipped                                             | Why                                          |
| --------------------------------------------------- | -------------------------------------------- |
| `notification_preferences.messages_enabled = false` | They turned message pushes off.              |
| `chat_members.request_state = 'declined'`           | They declined the conversation.              |
| `last_read_at >= message.created_at`                | They are in the thread reading it right now. |
| Already has an unread message here                  | They have been told once; see below.         |

**Only the first unread message notifies.** Ten people writing in a group used to produce ten
pushes, which is how a chat app teaches people to turn notifications off. Someone who already
has something unread in this chat has been told; the next push waits until they have caught up
and fallen behind again. The badge count is unaffected — it keeps counting either way.

"Unread" is measured from `last_read_at`, falling back to `joined_at` for a member who has never
opened the chat. Without that fallback a new member's entire backlog would count as prior unread
and they would never be notified at all.

A **pending** request still notifies — an unanswered message request the recipient never hears
about is the same as no message at all.

## Response

```json
{ "ok": true, "recipients": 2, "messagesQueued": 2, "ticketsOk": 2, "ticketErrors": [] }
```

`recipients` counts people, `messagesQueued` counts devices (deduplicated by token), and
`ticketErrors` carries whatever Expo rejected — the first place to look when a device stops
receiving pushes, since a `DeviceNotRegistered` ticket means the stored token is dead.

## Notification payload

`data` is `{ type: 'chat_message', chatId, messageId }`. `navigateFromNotificationData` in
`lib/push.ts` routes a tap on it to `/messages/chat/{chatId}`.

`channelId` is deliberately omitted, as in `send-group-event-created`: naming an Android channel
that was never created on the device makes Android drop the notification silently.
