# chat-kit manifest

What to bring into a new project, and what to do with each piece. Derived by walking `@/` imports
out from the chat screens, then hand-classified — an import graph alone cannot tell you that
`theme/tokens` should be adapted rather than copied.

Three roles:

| Role       | Meaning                                                                               |
| ---------- | ------------------------------------------------------------------------------------- |
| **copy**   | Chat-owned. Take the file as-is, then fix its imports.                                |
| **merge**  | Shared file the host already has. Move only the chat parts in.                        |
| **expect** | The host must already provide this. Do not copy — retarget imports to its equivalent. |

---

## copy — chat-owned

### Screens (`app/(tabs)/messages/`)

| File                            | Notes                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `_layout.tsx`                   | Stack config; `chatChildOptions` sends sub-screen backs to their chat.                                  |
| `index.tsx`                     | Conversation list: avatars, preview, relative time, unread badge, people search.                        |
| `create.tsx`                    | New chat. Multi-select, optional name/description/image, reuses an existing chat with the same members. |
| `chat/[id].tsx`                 | The thread. Largest file in the kit (~1,450 lines).                                                     |
| `chat/[id]/edit.tsx`            | Chat name, description, image.                                                                          |
| `chat/[id]/manage-members.tsx`  | Add and remove members.                                                                                 |
| `chat/[id]/media-and-links.tsx` | Shared media grid, links, files.                                                                        |
| `requests.tsx`                  | Message requests inbox (needs the reach rule; see the schema header).                                   |
| `friends.tsx`                   | Friends list. Drop it if the host has its own social model.                                             |

### Components (`components/messages/`) — all of it

`MessageRow.tsx` · `MessageHoverActions.tsx` · `useMessageRowState.ts` · `MessageAttachmentsBlock.tsx` ·
`OpenChatsList.tsx` ·
`AttachmentPreviewModals.tsx` · `TypingIndicator.tsx` · `VoiceMessageBubble.tsx` · `VoiceRecorderModal.tsx` ·
`FriendPickerSheet.tsx` · `constants.ts` · `types.ts` · `index.ts`

### Components (`components/patterns/`)

`ComposeBar.tsx` · `ReactionSheet.tsx` · `FadeActionSheet.tsx` · `UploadProgressBar.tsx` ·
`MessageVideoEmbed.tsx` · `StackHeaderBack.tsx`

`EmptyState.tsx` is used but generic — **expect** it if the host has one.

### Contexts

`contexts/OpenChatsContext.tsx` — which conversations are open, whether the list is folded, and
both of those persisted per user. Mount the provider under whatever holds the session. It reads
the session itself (`useAuth`) to key its storage, so a host with a different auth hook needs
that one import repointed.

The list it feeds is `components/messages/OpenChatsList.tsx`, which the host renders wherever its
navigation lives — in the source app, under the Messages item of the desktop sidebar. It needs a
chats query exposing `unreadCount` and `lastMessageAt` per chat (`useChatsForUserQuery`) and
`router.push('/messages/chat/<id>')`; both are listed under **expect** below in spirit — retarget
them, do not copy a second query layer.

### Hooks

`hooks/useComposeAttachments.ts` · `hooks/useFadeSheetAnimation.ts` ·
`hooks/useIosKeyboardAvoidingParentOffset.ts`

### lib

`lib/reactions.ts` · `lib/readReceipts.ts` · `lib/openChats.ts` · `lib/chatScrollAnchor.ts` · `lib/chatPreview.ts` · `lib/pointer.ts` · `lib/uploadErrors.ts` · `lib/clipboard.ts` ·
`lib/animation.ts` · `lib/composeAttachments.ts` · `lib/chatSharedContent.ts` ·
`lib/mediaViewerBounds.ts` · `lib/cloudinaryVideo.ts` · `lib/videoPoster.ts` ·
`lib/documentPickerLock.ts` · `lib/downloadFile.ts` · `lib/extractUrlsFromText.ts` ·
`lib/api/messageAttachments.ts`

`lib/api/adapters/supabase/jwtSkewRetryFetch.ts` is not chat-specific and is worth taking anyway:
PostgREST rejects a freshly refreshed token whose `iat` is ahead of its own clock (401, PGRST303),
which reads as a random failed request roughly once an hour per client. Pass it to `createClient`
as `global.fetch`. Skip it only if the host already wraps its fetch.

### Server

| File                                                         | Notes                                                                                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `files/supabase/chat_schema.sql`                             | Tables, constraints, indexes, policies, functions, triggers, realtime. Read its header first — it names what it does not create. |
| `supabase/functions/send-chat-message/`                      | Push on new message. Deploy with `--no-verify-jwt`.                                                                              |
| `supabase/functions/_shared/push-gateway.ts`, `app-badge.ts` | Only if the host has no push gateway.                                                                                            |

### Tests

`lib/__tests__/readReceipts.test.ts` · `lib/__tests__/uploadErrors.test.ts` ·
`lib/__tests__/openChats.test.ts` · `lib/__tests__/chatScrollAnchor.test.ts` · `lib/__tests__/chatPreview.test.ts` · `lib/__tests__/pointer.test.ts` · `lib/api/adapters/supabase/__tests__/jwtSkewRetryFetch.test.ts` ·
`hooks/__tests__/useChatMessagesQuery.test.tsx` (needs `hooks/**/__tests__` in the host's jest
`testMatch`, and `react-test-renderer` with its types) ·
`lib/api/adapters/supabase/__tests__/chatMessagePush.test.ts` ·
`lib/i18n/__tests__/translationKeys.test.ts` (not chat-specific, but it catches the raw-key bug
this kit's i18n move is prone to)

---

## merge — shared files, chat parts only

Never overwrite these. Open the host's copy and move the chat sections in.

| File                                                           | What to move                                                                                                                                                                      |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/api/contracts/dto.ts`                                     | `Chat`, `ChatMember`, `ChatMessage`, `MessageAttachment`, `PostReactionType`, `PostReactionCounts`, and their inputs.                                                             |
| `lib/api/contracts/data.ts`                                    | The chat method signatures on `DataContract`.                                                                                                                                     |
| `lib/api/adapters/supabase/data.ts`                            | The chat methods, `readBinaryFile`/`uploadToStorage` if absent, `isKnownReaction`, `tallyReaction`.                                                                               |
| `lib/api/adapters/supabase/realtime.ts`                        | The `messages:chat:{id}` channel: message inserts, `chat_members` updates, the `typing` broadcast, and `sendTyping`.                                                              |
| `lib/api/contracts/realtime.ts`                                | `onReadReceipt`, `onTyping`, `sendTyping`.                                                                                                                                        |
| `lib/api/queryKeys.ts`                                         | `chat*`, `groupMateIds`.                                                                                                                                                          |
| `hooks/useApiQueries.ts`                                       | The chat queries and mutations, including the optimistic reaction updater. `useChatMessagesQuery` owns the thread's growing window — keep the window in the hook, not in the key. |
| `lib/i18n/locales/{en,ko,km}.ts`                               | The `message.*` namespace, plus the chat keys under `messages.*` and `attachments.*`.                                                                                             |
| `components/messages/index.ts`, `components/patterns/index.ts` | Barrel exports.                                                                                                                                                                   |

---

## expect — the host must already have these

Retarget imports; do not copy.

| Dependency                                  | Used for                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `theme/tokens`                              | Every component. **This is the file to change when re-skinning.**                                |
| `lib/i18n` (`t`, locales)                   | All user-visible strings.                                                                        |
| `contexts/AuthContext`, `hooks/useAuth`     | The current user id.                                                                             |
| `components/primitives`                     | `Avatar`, `StackedAvatars`, `Button`, `Input`.                                                   |
| `lib/dialogs` (`confirm`, `notify`)         | Confirmations and errors. Must not be `Alert` on web — it is a no-op there.                      |
| `lib/errors` (`getUserFacingError`)         | Error text.                                                                                      |
| `lib/dates`                                 | `formatRelativeTime`, `formatDateHeader`, `formatMessageSentClockTime`, `messageLocalMinuteKey`. |
| `lib/avatarFallbackInitial`                 | Avatar initials.                                                                                 |
| `components/layout/DesktopContentContainer` | Wide-screen layout. Drop it on a mobile-only app.                                                |

## Not part of the kit

Pulled into the import graph by barrels, unrelated to chat: `lib/groupEventsSort`,
`lib/upcomingJoinedGroupEvents`, `contexts/LocaleContext`. Do not copy them; they arrive only
because `components/patterns/index.ts` and `lib/api/index.ts` re-export everything.
