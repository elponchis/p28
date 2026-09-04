/**
 * Copies the chat feature into .claude/skills/chat-kit/files/ so the skill carries the code it
 * scaffolds.
 *
 * A scaffold skill has to ship a snapshot — a new project cannot import from this repo. The cost
 * is drift: the snapshot is stale the moment chat changes here. This script is the answer to
 * that, not a workaround for it. Run it after any change to the chat feature:
 *
 *   node scripts/sync-chat-kit.cjs
 *
 * Every path is checked before anything is written. A renamed or deleted file fails the run
 * loudly rather than quietly dropping out of the kit, which is the failure that would otherwise
 * be found only by a stranger scaffolding a broken chat into a new project.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(REPO_ROOT, '.claude', 'skills', 'chat-kit', 'files', 'source');

/** Role "copy" in MANIFEST.md. Keep the two in step. */
const FILES = [
  // screens
  'app/(tabs)/messages/_layout.tsx',
  'app/(tabs)/messages/index.tsx',
  'app/(tabs)/messages/create.tsx',
  'app/(tabs)/messages/requests.tsx',
  'app/(tabs)/messages/friends.tsx',
  'app/(tabs)/messages/chat/[id].tsx',
  'app/(tabs)/messages/chat/[id]/edit.tsx',
  'app/(tabs)/messages/chat/[id]/manage-members.tsx',
  'app/(tabs)/messages/chat/[id]/media-and-links.tsx',

  // message components
  'components/messages/index.ts',
  'components/messages/MessageRow.tsx',
  'components/messages/OpenChatsList.tsx',
  'components/messages/MessageHoverActions.tsx',
  'components/messages/useMessageRowState.ts',
  'components/messages/MessageAttachmentsBlock.tsx',
  'components/messages/AttachmentPreviewModals.tsx',
  'components/messages/TypingIndicator.tsx',
  'components/messages/VoiceMessageBubble.tsx',
  'components/messages/VoiceRecorderModal.tsx',
  'components/messages/FriendPickerSheet.tsx',
  'components/messages/constants.ts',
  'components/messages/types.ts',

  // shared patterns the chat screens depend on
  'components/patterns/ComposeBar.tsx',
  'components/patterns/ReactionSheet.tsx',
  'components/patterns/FadeActionSheet.tsx',
  'components/patterns/UploadProgressBar.tsx',
  'components/patterns/MessageVideoEmbed.tsx',
  'components/patterns/StackHeaderBack.tsx',

  // contexts
  'contexts/OpenChatsContext.tsx',

  // hooks
  'hooks/useComposeAttachments.ts',
  'hooks/useFadeSheetAnimation.ts',
  'hooks/useIosKeyboardAvoidingParentOffset.ts',

  // lib
  'lib/reactions.ts',
  'lib/readReceipts.ts',
  'lib/openChats.ts',
  'lib/chatScrollAnchor.ts',
  'lib/chatPreview.ts',
  'lib/pointer.ts',
  'lib/uploadErrors.ts',
  'lib/clipboard.ts',
  'lib/animation.ts',
  'lib/composeAttachments.ts',
  'lib/chatSharedContent.ts',
  'lib/mediaViewerBounds.ts',
  'lib/cloudinaryVideo.ts',
  'lib/videoPoster.ts',
  'lib/documentPickerLock.ts',
  'lib/downloadFile.ts',
  'lib/extractUrlsFromText.ts',
  'lib/api/messageAttachments.ts',
  'lib/webPush.ts',
  'lib/api/adapters/supabase/jwtSkewRetryFetch.ts',
  'public/sw.js',

  // edge function
  'supabase/functions/send-chat-message/index.ts',
  'supabase/functions/send-chat-message/README.md',
  'supabase/functions/_shared/push-gateway.ts',
  'supabase/functions/_shared/app-badge.ts',

  // tests worth carrying
  'lib/__tests__/readReceipts.test.ts',
  'lib/__tests__/openChats.test.ts',
  'lib/__tests__/chatScrollAnchor.test.ts',
  'lib/__tests__/chatPreview.test.ts',
  'lib/__tests__/pointer.test.ts',
  'hooks/__tests__/useChatMessagesQuery.test.tsx',
  'lib/api/adapters/supabase/__tests__/jwtSkewRetryFetch.test.ts',
  'lib/__tests__/uploadErrors.test.ts',
  'lib/i18n/__tests__/translationKeys.test.ts',
  'lib/api/adapters/supabase/__tests__/chatMessagePush.test.ts',
];

function main() {
  const missing = FILES.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f)));
  if (missing.length > 0) {
    console.error('chat-kit sync failed. These files are listed but do not exist:\n');
    for (const f of missing) console.error('  ' + f);
    console.error('\nRename them in scripts/sync-chat-kit.cjs and MANIFEST.md, or drop them.');
    process.exit(1);
  }

  fs.rmSync(OUT_ROOT, { recursive: true, force: true });

  let bytes = 0;
  let lines = 0;
  for (const relative of FILES) {
    const from = path.join(REPO_ROOT, relative);
    const to = path.join(OUT_ROOT, relative);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const contents = fs.readFileSync(from);
    fs.writeFileSync(to, contents);
    bytes += contents.length;
    lines += contents.toString('utf8').split('\n').length;
  }

  console.log(
    `chat-kit: ${FILES.length} files, ${lines.toLocaleString()} lines, ${(bytes / 1024).toFixed(0)} kB`
  );
  console.log(`written to ${path.relative(REPO_ROOT, OUT_ROOT)}`);
}

main();
