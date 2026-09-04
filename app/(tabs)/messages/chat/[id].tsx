import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/primitives';
import {
  FileAttachmentModal,
  FriendPickerSheet,
  MessageRow,
  TypingIndicator,
  VideoAttachmentModal,
  VoiceRecorderModal,
} from '@/components/messages';
import { ComposeBar } from '@/components/patterns/ComposeBar';
import { FadeActionSheet, FADE_SHEET_PICKER_DEFER_MS } from '@/components/patterns/FadeActionSheet';
import {
  ReactionSheet,
  type ReactionSheetPrimaryAction,
} from '@/components/patterns/ReactionSheet';
import { useOpenChats } from '@/contexts/OpenChatsContext';
import { useAuth } from '@/hooks/useAuth';
import { useComposeAttachments } from '@/hooks/useComposeAttachments';
import { useIosKeyboardAvoidingParentOffset } from '@/hooks/useIosKeyboardAvoidingParentOffset';
import {
  useChatMessageReactionsQuery,
  useChatMessagesQuery,
  useChatQuery,
  useCreateChatMessageMutation,
  useCreateChatMutation,
  useDeleteChatMessageMutation,
  useMarkChatReadMutation,
  useReactToChatMessageMutation,
  useRemoveChatMessageReactionMutation,
  useUpdateChatMessageMutation,
  useUploadChatImageMutation,
  useUploadChatMessageAttachmentMutation,
} from '@/hooks/useApiQueries';
import { api, getUserFacingError } from '@/lib/api';
import {
  newComposeAttachmentId,
  pendingToMessageAttachments,
  storedMessageToPendingAttachments,
} from '@/lib/composeAttachments';
import { getMediaViewerSize } from '@/lib/mediaViewerBounds';
import { queryKeys } from '@/lib/api/queryKeys';
import type { ChatMessage, CreateChatMessageInput, PostReactionType } from '@/lib/api';
import { USE_NATIVE_DRIVER } from '@/lib/animation';
import { formatDateHeader, isSameDay, messageLocalMinuteKey } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { confirm, notify } from '@/lib/dialogs';
import { copyTextToClipboard } from '@/lib/clipboard';
import { countUnreadMembers } from '@/lib/readReceipts';
import { downloadFileInBrowser } from '@/lib/downloadFile';

import { colors, fontFamily, radius, shadow, spacing, typography } from '@/theme/tokens';

/** Attachments allowed on one message. */
const MAX_ATTACHMENTS = 5;

/** Messages fetched per page, and how much each "load older" adds. */
const CHAT_PAGE_SIZE = 50;

/** At most one typing broadcast per this many ms, however fast someone types. */
const TYPING_THROTTLE_MS = 2000;
/** How long a ping keeps the indicator up before silence retires it. */
const TYPING_EXPIRY_MS = 5000;

export default function ChatDetailScreen() {
  const { id, focusMessageId: focusMessageIdParam } = useLocalSearchParams<{
    id: string;
    focusMessageId?: string;
  }>();
  const focusMessageId =
    typeof focusMessageIdParam === 'string'
      ? focusMessageIdParam
      : Array.isArray(focusMessageIdParam)
        ? focusMessageIdParam[0]
        : undefined;
  const { session } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesScrollFingerprintRef = useRef<string | null>(null);
  const messageOffsetYsRef = useRef<Map<string, number>>(new Map());
  const shouldStickToEndRef = useRef(!focusMessageId);
  const lastScrolledFocusRef = useRef<string | undefined>(undefined);

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { iosKeyboardVerticalOffset, parentContainerProps } = useIosKeyboardAvoidingParentOffset();
  const [composeText, setComposeText] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{
    url: string;
    fileName?: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    fileName: string;
    mimeType?: string;
  } | null>(null);
  const [reactionMessage, setReactionMessage] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [addFriendsVisible, setAddFriendsVisible] = useState(false);
  const [chatMenuVisible, setChatMenuVisible] = useState(false);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [copiedToastVisible, setCopiedToastVisible] = useState(false);

  const { data: chat, isLoading, isError, error, refetch } = useChatQuery(id);
  /**
   * How far back the thread is loaded. A chat opens on the most recent page and grows upward
   * when the reader asks for more, so an old group thread never arrives in one response.
   */
  const [messageLimit, setMessageLimit] = useState(CHAT_PAGE_SIZE);
  const { data: messages = [], refetch: refetchMessages } = useChatMessagesQuery(id, {
    userId,
    limit: messageLimit,
  });
  // A full page back means there is probably more behind it; a short page means we reached the
  // beginning. Cheaper than a count query and wrong only in the case where the total is an
  // exact multiple, which costs one empty "load older" press.
  const mayHaveOlder = messages.length >= messageLimit;
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const { data: reactionDetails = [], isLoading: reactionsLoading } = useChatMessageReactionsQuery(
    reactionMessage?.id,
    {
      enabled: !!reactionMessage,
    }
  );

  const createMessageMutation = useCreateChatMessageMutation();
  const updateMessageMutation = useUpdateChatMessageMutation();
  const createChatMutation = useCreateChatMutation();
  const uploadImageMutation = useUploadChatImageMutation();
  const uploadChatAttachmentMutation = useUploadChatMessageAttachmentMutation();
  const reactMutation = useReactToChatMessageMutation();
  const removeReactionMutation = useRemoveChatMessageReactionMutation();
  const deleteMessageMutation = useDeleteChatMessageMutation();
  const markReadMutation = useMarkChatReadMutation();

  const {
    pendingAttachments,
    setPendingAttachments,
    isUploading: isUploadingAttachment,
    pickPhotos,
    pickVideo,
    pickDocument,
    pasteFiles: handlePasteFiles,
    retryAttachment: retryPendingAttachment,
    removeAttachment: removePendingAttachment,
  } = useComposeAttachments({
    userId,
    maxAttachments: MAX_ATTACHMENTS,
    logLabel: 'chat',
    uploadImage: ({ localUri, base64Data }) =>
      uploadImageMutation.mutateAsync({ userId: userId!, imageUri: localUri, base64Data }),
    uploadFile: ({ localUri, contentType, fileName, slot, onProgress }) =>
      uploadChatAttachmentMutation.mutateAsync({
        userId: userId!,
        localUri,
        contentType,
        fileName,
        objectKind: slot === 'thumbnail' ? 'thumbnail' : 'message',
        onProgress,
      }),
  });
  const [voiceRecorderVisible, setVoiceRecorderVisible] = useState(false);

  /**
   * Prepending older messages moves everything down by however tall they are, which would throw
   * the reader to a different part of the conversation. The offset and content height are
   * captured before the fetch and the difference is added back once the taller content lands.
   */
  const scrollOffsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const olderAnchorRef = useRef<{ height: number; offset: number } | null>(null);

  const handleLoadOlder = useCallback(async () => {
    if (isLoadingOlder) return;
    setIsLoadingOlder(true);
    olderAnchorRef.current = {
      height: contentHeightRef.current,
      offset: scrollOffsetRef.current,
    };
    shouldStickToEndRef.current = false;
    setMessageLimit((prev) => prev + CHAT_PAGE_SIZE);
    try {
      await refetchMessages();
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, refetchMessages]);

  const onChatMessagesContentSizeChange = useCallback(
    (_w: number, height: number) => {
      const anchor = olderAnchorRef.current;
      contentHeightRef.current = height;
      if (anchor) {
        olderAnchorRef.current = null;
        if (height > anchor.height) {
          scrollViewRef.current?.scrollTo({
            y: anchor.offset + (height - anchor.height),
            animated: false,
          });
        }
        return;
      }
      if (!shouldStickToEndRef.current) return;
      const msgs = messages;
      if (msgs.length === 0) return;
      const last = msgs[msgs.length - 1];
      const fp = `${msgs.length}:${last.id}`;
      if (fp === messagesScrollFingerprintRef.current) return;
      messagesScrollFingerprintRef.current = fp;
      scrollViewRef.current?.scrollToEnd({ animated: false });
    },
    [messages]
  );

  useEffect(() => {
    if (focusMessageId) shouldStickToEndRef.current = false;
  }, [focusMessageId]);

  /**
   * The arrival cue for a jump: a short sideways nudge, the way KakaoTalk answers a tap on a
   * reply quote. A background tint had to stay up long enough to be noticed, which meant it was
   * also up long enough to be read as state -- "this message is selected" -- rather than as an
   * answer to the tap. Motion is over in half a second and leaves nothing behind.
   */
  const nudge = useRef(new Animated.Value(0)).current;
  const playNudge = useCallback(() => {
    nudge.setValue(0);
    Animated.sequence([
      // Waits out the scroll, so the movement happens once the message is actually on screen.
      Animated.delay(260),
      Animated.timing(nudge, { toValue: -9, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(nudge, { toValue: 6, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(nudge, { toValue: -3, duration: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(nudge, { toValue: 0, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [nudge]);

  useEffect(() => {
    if (!focusMessageId || messages.length === 0) return;
    if (!messages.some((m) => m.id === focusMessageId)) return;
    if (lastScrolledFocusRef.current === focusMessageId) return;

    let attempts = 0;
    const maxAttempts = 28;
    const tryScroll = () => {
      const y = messageOffsetYsRef.current.get(focusMessageId);
      if (y !== undefined) {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 72), animated: true });
        setHighlightedMessageId(focusMessageId);
        playNudge();
        lastScrolledFocusRef.current = focusMessageId;
        setTimeout(() => setHighlightedMessageId(null), 1400);
        shouldStickToEndRef.current = true;
        return;
      }
      if (attempts++ < maxAttempts) {
        requestAnimationFrame(tryScroll);
      } else {
        shouldStickToEndRef.current = true;
      }
    };
    requestAnimationFrame(tryScroll);
  }, [focusMessageId, messages, playNudge]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        lastScrolledFocusRef.current = undefined;
      };
    }, [])
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Held in a ref so the realtime subscription below does not tear down and re-subscribe every
  // time the mutation object changes identity.
  const markReadRef = useRef<((chatId: string, uid: string) => void) | null>(null);
  markReadRef.current = (chatId: string, uid: string) =>
    markReadMutation.mutate({ chatId, userId: uid });

  /**
   * refetch() ignores the query's `enabled` guard, so calling it before the session resolves
   * fires the request with an undefined user id -- PostgREST answers 400 on user_id=eq.undefined.
   */
  useFocusEffect(
    useCallback(() => {
      if (!id || !userId) return;
      refetch();
      refetchMessages();
      markReadMutation.mutate({ chatId: id, userId });
    }, [refetch, refetchMessages, id, userId])
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const channelId = `messages:chat:${id}`;
      api.realtime.subscribe(channelId, {
        onMessage: () => {
          qc.invalidateQueries({ queryKey: queryKeys.chatMessages(id, userId ?? undefined) });
          qc.invalidateQueries({ queryKey: queryKeys.chatSharedContent(id) });
          // The screen is open, so the message has been seen the moment it arrives. Without
          // this, last_read_at only moves on focus and the sender's receipt would sit unread
          // for as long as the recipient stays in the thread.
          if (userId) markReadRef.current?.(id, userId);
        },
        onReadReceipt: () => {
          qc.invalidateQueries({ queryKey: queryKeys.chat(id) });
        },
        onTyping: ({ userId: typistId }) => {
          if (!typistId || typistId === userId) return;
          setTypingAt((prev) => ({ ...prev, [typistId]: Date.now() }));
        },
      });
      return () => api.realtime.unsubscribe(channelId);
    }, [id, userId, qc])
  );

  /**
   * Typing indicator.
   *
   * Outgoing: a broadcast at most once every THROTTLE, because the interesting fact is "still
   * typing", not each keystroke. Incoming: each ping records a timestamp, and a ticker drops
   * anyone who has gone quiet for longer than EXPIRY -- there is no "stopped typing" message to
   * wait for, and there should not be one, since a sender who closes the tab would never send it.
   */
  const [typingAt, setTypingAt] = useState<Record<string, number>>({});
  const lastTypingSentRef = useRef(0);

  const handleComposeTextChange = useCallback(
    (next: string) => {
      setComposeText(next);
      if (!id || !userId || next.length === 0) return;
      const now = Date.now();
      if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
      lastTypingSentRef.current = now;
      api.realtime.sendTyping(`messages:chat:${id}`, userId);
    },
    [id, userId]
  );

  useEffect(() => {
    if (Object.keys(typingAt).length === 0) return;
    const interval = setInterval(() => {
      const cutoff = Date.now() - TYPING_EXPIRY_MS;
      setTypingAt((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const [uid, at] of Object.entries(prev)) {
          if (at >= cutoff) next[uid] = at;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [typingAt]);

  const typingNames = useMemo(() => {
    const members = chat?.members ?? [];
    return Object.keys(typingAt)
      .filter((uid) => uid !== userId)
      .map((uid) => members.find((m) => m.userId === uid)?.displayName ?? t('common.loading'));
  }, [typingAt, chat?.members, userId]);

  const typingAvatarUrl = useMemo(() => {
    const uids = Object.keys(typingAt).filter((uid) => uid !== userId);
    if (uids.length !== 1) return undefined;
    return (chat?.members ?? []).find((m) => m.userId === uids[0])?.avatarUrl;
  }, [typingAt, chat?.members, userId]);

  const memberUserIds = useMemo(
    () => (chat?.members ?? []).map((m) => m.userId).filter(Boolean),
    [chat?.members]
  );

  const headerTitle = useMemo(
    () =>
      chat?.name?.trim() ||
      chat?.participantDisplayNames ||
      chat?.members
        ?.filter((m) => m.userId !== userId)
        .map((m) => m.displayName ?? t('common.loading'))
        .join(', ') ||
      t('messages.lastMessage'),
    [chat?.name, chat?.participantDisplayNames, chat?.members, userId]
  );

  /**
   * Pin this chat in the sidebar. Runs once the title is known rather than on mount, so the pin
   * never appears as "Loading" and then rename itself a beat later.
   */
  const { openChat } = useOpenChats();
  useEffect(() => {
    if (!id || !chat) return;
    openChat({ id, title: headerTitle });
  }, [id, chat, headerTitle, openChat]);

  const memberCount = chat?.members?.length ?? 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /**
   * Back always lands on the conversation list, whatever route opened this chat.
   *
   * router.back() returns to whatever happened to be underneath, so opening a chat from a
   * profile (or a notification, or a deep link) sent the user back there instead of to their
   * messages -- the one place from which they can reach a different conversation. dismissTo
   * pops to the list when it is already in the stack and replaces this screen with it when it
   * is not, so neither entry route leaves a stale chat behind.
   */
  const handleBack = useCallback(() => {
    router.dismissTo('/messages');
  }, [router]);

  /**
   * Scroll to a message and flash it, for the quoted preview on a reply.
   *
   * Offsets come from the onLayout map the deep-link path already fills, so this only works
   * for messages currently rendered -- a reply to something far enough back to be off the
   * loaded window does nothing rather than jumping somewhere wrong.
   *
   * Sticking to the end is suspended while the highlight is up, so an arriving message does
   * not yank the reader away from what they just went to look at.
   */
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    []
  );

  const jumpToMessage = useCallback(
    (messageId: string) => {
      const y = messageOffsetYsRef.current.get(messageId);
      if (y === undefined) return;
      shouldStickToEndRef.current = false;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 72), animated: true });
      setHighlightedMessageId(messageId);
      playNudge();
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
        shouldStickToEndRef.current = true;
      }, 1400);
    },
    [playNudge]
  );

  const chatMenuOptions = useMemo(
    () => [
      {
        icon: 'images-outline' as const,
        label: t('messages.mediaAndLinks'),
        onPress: () => {
          setChatMenuVisible(false);
          router.push(`/messages/chat/${id}/media-and-links`);
        },
        accessibilityHint: t('messages.mediaAndLinksHint'),
      },
      {
        icon: 'people-outline' as const,
        label: t('messages.manageMembers'),
        onPress: () => {
          setChatMenuVisible(false);
          router.push(`/messages/chat/${id}/manage-members`);
        },
      },
      {
        icon: 'create-outline' as const,
        label: t('messages.editChat'),
        onPress: () => {
          setChatMenuVisible(false);
          router.push(`/messages/chat/${id}/edit`);
        },
      },
    ],
    [id, router]
  );

  const handleAddFriend = useCallback(
    async (friendId: string) => {
      if (!userId || !id) return;
      const otherMemberIds = memberUserIds.filter((uid) => uid !== userId);
      const newMemberIds = [...otherMemberIds, friendId];

      try {
        const existing = await api.data.findExistingChatByMembers(userId, newMemberIds);
        if (existing && !('message' in existing)) {
          setAddFriendsVisible(false);
          router.push(`/messages/chat/${existing.id}`);
          return;
        }
      } catch {
        // proceed to create if lookup fails
      }

      createChatMutation.mutate(
        { userId, input: { memberUserIds: newMemberIds } },
        {
          onSuccess: (newChat) => {
            setAddFriendsVisible(false);
            router.push(`/messages/chat/${newChat.id}`);
          },
          onError: (err) => {
            void notify({
              title: t('common.error'),
              message: getUserFacingError(err),
            });
          },
        }
      );
    },
    [userId, id, memberUserIds, createChatMutation, router]
  );

  const allPendingReady =
    pendingAttachments.length === 0 ||
    pendingAttachments.every((a) => !a.uploading && !!a.uploadedUrl);

  const canPost =
    !isUploadingAttachment &&
    allPendingReady &&
    (composeText.trim().length > 0 || pendingAttachments.length > 0);

  const handlePost = useCallback(() => {
    if (!userId || !id || !canPost) return;
    const body = composeText.trim();
    if (editingMessage) {
      updateMessageMutation.mutate(
        {
          messageId: editingMessage.id,
          chatId: id,
          userId,
          input: {
            body,
            attachments: pendingToMessageAttachments(pendingAttachments),
          },
        },
        {
          onSuccess: () => {
            setComposeText('');
            setPendingAttachments([]);
            setEditingMessage(null);
          },
        }
      );
    } else {
      const input: CreateChatMessageInput = {
        body,
        attachments:
          pendingAttachments.length > 0
            ? pendingToMessageAttachments(pendingAttachments)
            : undefined,
        parentMessageId: replyingTo?.id,
      };
      setComposeText('');
      setPendingAttachments([]);
      setReplyingTo(null);
      createMessageMutation.mutate({
        chatId: id,
        userId,
        input,
      });
    }
  }, [
    userId,
    id,
    canPost,
    composeText,
    pendingAttachments,
    replyingTo,
    editingMessage,
    createMessageMutation,
    updateMessageMutation,
    setPendingAttachments,
  ]);

  const handleRetryOutboundMessage = useCallback(
    (msg: ChatMessage) => {
      if (!userId || !id) return;
      const payload = (msg as ChatMessage & { outboundRetryPayload?: CreateChatMessageInput })
        .outboundRetryPayload;
      if (!payload) return;
      createMessageMutation.mutate({
        chatId: id,
        userId,
        input: {
          body: payload.body,
          imageUrls: payload.imageUrls,
          attachments: payload.attachments,
          parentMessageId: payload.parentMessageId,
        },
        optimisticId: msg.id,
      });
    },
    [userId, id, createMessageMutation]
  );

  const handleVoiceRecorded = useCallback(
    async (localUri: string, durationSec: number, mimeType: string) => {
      if (!userId) return;
      if (pendingAttachments.length >= MAX_ATTACHMENTS) return;
      const attachmentId = newComposeAttachmentId();
      setPendingAttachments((prev) => [
        ...prev,
        {
          id: attachmentId,
          kind: 'audio',
          displayUri: localUri,
          durationSec,
          mimeType,
          uploading: true,
        },
      ]);
      try {
        const url = await uploadChatAttachmentMutation.mutateAsync({
          userId,
          localUri,
          contentType: mimeType,
          fileName: `voice-${Date.now()}.${mimeType === 'audio/webm' ? 'webm' : 'm4a'}`,
          objectKind: 'message',
        });
        setPendingAttachments((prev) =>
          prev.map((p) =>
            p.id === attachmentId ? { ...p, uploadedUrl: url, uploading: false } : p
          )
        );
      } catch {
        setPendingAttachments((prev) => prev.filter((p) => p.id !== attachmentId));
      }
    },
    [userId, pendingAttachments.length, uploadChatAttachmentMutation, setPendingAttachments]
  );

  const attachmentMenuOptions = useMemo(
    () => [
      {
        icon: 'image-outline' as const,
        label: t('attachments.photo'),
        onPress: () => {
          void pickPhotos();
        },
      },
      {
        icon: 'videocam-outline' as const,
        label: t('attachments.video'),
        onPress: () => {
          void pickVideo();
        },
      },
      {
        icon: 'document-outline' as const,
        label: t('attachments.file'),
        onPress: () => {
          void pickDocument();
        },
      },
      {
        icon: 'mic-outline' as const,
        label: t('attachments.voice'),
        onPress: () => {
          setVoiceRecorderVisible(true);
        },
      },
    ],
    [pickPhotos, pickVideo, pickDocument]
  );

  const handleDownloadImage = useCallback(async () => {
    if (!previewImageUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const ext = previewImageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] ?? 'jpg';
      const filename = `chat-image-${Date.now()}.${ext}`;
      if (Platform.OS === 'web') {
        // expo-file-system / expo-media-library are native-only.
        await downloadFileInBrowser(previewImageUrl, filename);
        return;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        void notify({
          title: t('common.error'),
          message: t('message.downloadPermissionDenied'),
        });
        return;
      }
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(previewImageUrl, localUri);
      await MediaLibrary.createAssetAsync(localUri);
      setPreviewImageUrl(null);
      void notify({
        title: t('message.downloadSuccess'),
        message: t('message.downloadSuccessMessage'),
      });
    } catch (err) {
      const msg =
        err && typeof err === 'object' && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : t('message.downloadError');
      void notify({
        title: t('common.error'),
        message: msg,
      });
    } finally {
      setIsDownloading(false);
    }
  }, [previewImageUrl, isDownloading]);

  const handleReact = useCallback(
    (type: PostReactionType) => {
      if (!userId || !id || !reactionMessage) return;
      reactMutation.mutate(
        { messageId: reactionMessage.id, chatId: id, userId, reactionType: type },
        { onSuccess: () => setReactionMessage(null) }
      );
    },
    [userId, id, reactionMessage, reactMutation]
  );

  const handleRemoveReaction = useCallback(
    (type: PostReactionType) => {
      if (!reactionMessage || !userId || !id) return;
      removeReactionMutation.mutate(
        {
          messageId: reactionMessage.id,
          chatId: id,
          userId,
          reactionType: type,
        },
        { onSuccess: () => setReactionMessage(null) }
      );
    },
    [reactionMessage, userId, id, removeReactionMutation]
  );

  const handleStartEdit = useCallback(
    (msg: ChatMessage) => {
      setReplyingTo(null);
      setEditingMessage(msg);
      setComposeText(msg.body ?? '');
      setPendingAttachments(storedMessageToPendingAttachments(msg));
    },
    [setPendingAttachments]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setComposeText('');
    setPendingAttachments([]);
  }, [setPendingAttachments]);

  const handleDeleteMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!userId || !id) return;
      const confirmed = await confirm({
        title: t('message.deleteMessageConfirmTitle'),
        message: t('message.deleteMessageConfirmBody'),
        confirmLabel: t('message.sheetDelete'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!confirmed) return;
      deleteMessageMutation.mutate({ messageId: msg.id, chatId: id, userId });
    },
    [userId, id, deleteMessageMutation]
  );

  // A copy needs an acknowledgement or it reads as a no-op, and the app has no toast
  // primitive; a blocking dialog for something this small would be worse than silence.
  const copiedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedToastTimerRef.current) clearTimeout(copiedToastTimerRef.current);
    },
    []
  );

  const handleCopyMessage = useCallback(async (msg: ChatMessage) => {
    const body = msg.body?.trim() ?? '';
    if (!body) return;
    const ok = await copyTextToClipboard(body);
    if (!ok) {
      void notify({ title: t('common.error'), message: t('message.copyFailed') });
      return;
    }
    setCopiedToastVisible(true);
    if (copiedToastTimerRef.current) clearTimeout(copiedToastTimerRef.current);
    copiedToastTimerRef.current = setTimeout(() => setCopiedToastVisible(false), 1600);
  }, []);

  /**
   * Read receipts, KakaoTalk-style: a count of who has NOT read each message you sent, beside
   * the message, gone once it reaches zero. Chosen over a single "Seen" marker on the last
   * message because it keeps working when a chat has more than two people in it -- the count
   * tells you how many are still behind, which a boolean cannot.
   */
  const unreadCountByMessageId = useMemo(() => {
    const counts = new Map<string, number>();
    if (!userId) return counts;
    for (const m of messages) {
      if (m.userId !== userId || m.deletedAt) continue;
      const outbound = (m as ChatMessage & { outboundStatus?: 'sending' | 'failed' })
        .outboundStatus;
      // A message still in flight has no read state to report yet.
      if (outbound) continue;
      const unread = countUnreadMembers(chat?.members, userId, m.createdAt);
      if (unread > 0) counts.set(m.id, unread);
    }
    return counts;
  }, [messages, userId, chat?.members]);

  const reactionSheetPrimaryActions = useMemo((): ReactionSheetPrimaryAction[] => {
    const msg = reactionMessage;
    if (!msg || !userId) return [];
    const outbound = (msg as ChatMessage & { outboundStatus?: 'sending' | 'failed' })
      .outboundStatus;
    if (outbound) return [];
    const actions: ReactionSheetPrimaryAction[] = [
      {
        key: 'reply',
        label: t('message.sheetReply'),
        icon: 'arrow-undo-outline',
        accessibilityLabel: t('message.sheetReply'),
        accessibilityHint: t('message.sheetReplyHint'),
        onPress: () => {
          setReactionMessage(null);
          setEditingMessage(null);
          setReplyingTo(msg);
        },
      },
    ];
    // Only for messages that carry text: copying an attachment-only bubble would put an
    // empty string on the clipboard.
    if (msg.body?.trim()) {
      actions.push({
        key: 'copy',
        label: t('message.sheetCopy'),
        icon: 'copy-outline',
        accessibilityLabel: t('message.sheetCopy'),
        accessibilityHint: t('message.sheetCopyHint'),
        onPress: () => {
          setReactionMessage(null);
          void handleCopyMessage(msg);
        },
      });
    }
    if (msg.userId === userId) {
      actions.push({
        key: 'edit',
        label: t('message.sheetEdit'),
        icon: 'pencil-outline',
        accessibilityLabel: t('message.sheetEdit'),
        accessibilityHint: t('message.sheetEditHint'),
        onPress: () => {
          setReactionMessage(null);
          handleStartEdit(msg);
        },
      });
      actions.push({
        key: 'delete',
        label: t('message.sheetDelete'),
        icon: 'trash-outline',
        accessibilityLabel: t('message.sheetDelete'),
        accessibilityHint: t('message.sheetDeleteHint'),
        destructive: true,
        onPress: () => {
          setReactionMessage(null);
          handleDeleteMessage(msg);
        },
      });
    }
    return actions;
  }, [reactionMessage, userId, handleStartEdit, handleDeleteMessage, handleCopyMessage]);

  if (!id) {
    router.back();
    return null;
  }

  if (isLoading && !chat) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !chat) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error && 'message' in error ? getUserFacingError(error) : t('common.error')}
        </Text>
      </View>
    );
  }

  const otherMembers = (chat.members ?? []).filter((m) => m.userId && m.userId !== userId);
  const firstOtherMember = otherMembers[0];

  return (
    <View {...parentContainerProps} style={styles.container}>
      <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>

        <Pressable
          style={styles.chatHeaderInfo}
          onPress={() => {
            if (otherMembers.length === 1 && firstOtherMember?.userId) {
              router.push(`/profile/${firstOtherMember.userId}`);
            } else {
              router.push(`/messages/chat/${id}/edit`);
            }
          }}
          accessibilityLabel={headerTitle}
          accessibilityRole="button"
        >
          <Avatar
            source={firstOtherMember?.avatarUrl ? { uri: firstOtherMember.avatarUrl } : null}
            fallbackText={headerTitle}
            size="lg"
          />
          <View style={styles.chatHeaderTextColumn}>
            <Text style={styles.chatHeaderTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            <Text style={styles.chatHeaderSubtitle}>
              {memberCount} {t('groups.members').toUpperCase()}
            </Text>
          </View>
        </Pressable>

        <View style={styles.chatHeaderActions}>
          <Pressable
            onPress={() => setChatMenuVisible(true)}
            style={styles.headerActionButton}
            accessibilityLabel={t('common.options')}
            hitSlop={8}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <View style={styles.headerDivider} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={iosKeyboardVerticalOffset}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={onChatMessagesContentSizeChange}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {mayHaveOlder ? (
            <Pressable
              onPress={handleLoadOlder}
              disabled={isLoadingOlder}
              style={({ pressed }) => [styles.loadOlder, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('messages.loadOlderMessages')}
            >
              {isLoadingOlder ? (
                <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
              ) : (
                <Text style={styles.loadOlderText}>{t('messages.loadOlderMessages')}</Text>
              )}
            </Pressable>
          ) : null}
          {messages.map((msg, idx) => {
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
            const showDateSeparator = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);

            const isFirstInGroup = !prevMsg || prevMsg.userId !== msg.userId || showDateSeparator;
            const nextIsDifferentDay =
              nextMsg != null && !isSameDay(msg.createdAt, nextMsg.createdAt);
            const isLastInGroup = !nextMsg || nextMsg.userId !== msg.userId || nextIsDifferentDay;
            const outboundStatus = (msg as ChatMessage & { outboundStatus?: 'sending' | 'failed' })
              .outboundStatus;
            const canReactToMessage = !!userId && !outboundStatus && !msg.deletedAt;
            const showSentClockTime =
              !nextMsg ||
              messageLocalMinuteKey(nextMsg.createdAt) !== messageLocalMinuteKey(msg.createdAt);
            const prevIsOwn = !!prevMsg && !!userId && prevMsg.userId === userId;
            const thisIsOwn = !!userId && msg.userId === userId;
            const extraGapAfterPeerChange =
              !!prevMsg && !!userId && !showDateSeparator && prevIsOwn !== thisIsOwn;

            return (
              <Animated.View
                key={msg.id}
                collapsable={false}
                onLayout={(e) => {
                  messageOffsetYsRef.current.set(msg.id, e.nativeEvent.layout.y);
                }}
                style={
                  highlightedMessageId === msg.id
                    ? { transform: [{ translateX: nudge }] }
                    : undefined
                }
              >
                {showDateSeparator ? (
                  <View style={styles.dateSeparator}>
                    <View style={styles.dateSeparatorLine} />
                    <Text style={styles.dateSeparatorText}>{formatDateHeader(msg.createdAt)}</Text>
                    <View style={styles.dateSeparatorLine} />
                  </View>
                ) : null}
                <MessageRow
                  post={msg}
                  parentPost={
                    msg.parentMessageId
                      ? (messages.find((m) => m.id === msg.parentMessageId) ?? null)
                      : null
                  }
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  onImagePress={(url) => setPreviewImageUrl(url)}
                  onVideoPress={(att) => setPreviewVideo({ url: att.url, fileName: att.fileName })}
                  onFilePress={(att) =>
                    setPreviewFile({
                      url: att.url,
                      fileName: att.fileName ?? t('attachments.file'),
                      mimeType: att.mimeType,
                    })
                  }
                  onLongPress={() => setReactionMessage(msg)}
                  onReply={() => {
                    setEditingMessage(null);
                    setReplyingTo(msg);
                  }}
                  onParentPress={
                    msg.parentMessageId ? () => jumpToMessage(msg.parentMessageId!) : undefined
                  }
                  onEdit={thisIsOwn ? () => handleStartEdit(msg) : undefined}
                  onDelete={thisIsOwn ? () => handleDeleteMessage(msg) : undefined}
                  onAddReaction={(reactionType) =>
                    reactMutation.mutate({
                      messageId: msg.id,
                      chatId: id,
                      userId: userId!,
                      reactionType,
                    })
                  }
                  onRemoveReaction={(reactionType) =>
                    removeReactionMutation.mutate({
                      messageId: msg.id,
                      chatId: id,
                      userId: userId!,
                      reactionType,
                    })
                  }
                  onAuthorPress={() => router.push(`/profile/${msg.userId}`)}
                  canReact={canReactToMessage}
                  currentUserId={userId}
                  onRetrySend={
                    outboundStatus === 'failed' ? () => handleRetryOutboundMessage(msg) : undefined
                  }
                  showSentClockTime={showSentClockTime}
                  extraGapAfterPeerChange={extraGapAfterPeerChange}
                  unreadCount={unreadCountByMessageId.get(msg.id) ?? 0}
                />
              </Animated.View>
            );
          })}
          <TypingIndicator names={typingNames} avatarUrl={typingAvatarUrl} />
        </ScrollView>

        <View
          collapsable={false}
          style={[
            styles.composeArea,
            { paddingBottom: spacing.xxs + (keyboardOpen ? 0 : insets.bottom) },
          ]}
        >
          <ComposeBar
            text={composeText}
            onChangeText={handleComposeTextChange}
            onSend={handlePost}
            canSend={canPost}
            isSending={
              editingMessage ? updateMessageMutation.isPending : createMessageMutation.isPending
            }
            sendLabel={editingMessage ? t('message.updateReply') : t('message.postReply')}
            pendingAttachments={pendingAttachments}
            onRemoveAttachment={removePendingAttachment}
            onRetryAttachment={retryPendingAttachment}
            onOpenAttachmentMenu={() => setAttachmentMenuVisible(true)}
            isUploadingAttachment={isUploadingAttachment}
            maxAttachments={MAX_ATTACHMENTS}
            editingContext={
              editingMessage
                ? { preview: editingMessage.body ?? '', onCancel: handleCancelEdit }
                : null
            }
            replyingToContext={
              replyingTo
                ? {
                    authorName: replyingTo.authorDisplayName ?? t('common.loading'),
                    preview: replyingTo.body ?? '',
                    onCancel: () => setReplyingTo(null),
                  }
                : null
            }
            variant="chat"
            submitOnEnter
            onPasteFiles={handlePasteFiles}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Sheets and modals */}
      <FriendPickerSheet
        visible={addFriendsVisible}
        onRequestClose={() => setAddFriendsVisible(false)}
        onSelectFriend={handleAddFriend}
        excludeUserIds={memberUserIds}
        userId={userId ?? ''}
      />

      <FadeActionSheet
        visible={chatMenuVisible}
        onRequestClose={() => setChatMenuVisible(false)}
        options={chatMenuOptions}
      />

      <FadeActionSheet
        visible={attachmentMenuVisible}
        onRequestClose={() => setAttachmentMenuVisible(false)}
        options={attachmentMenuOptions}
        deferOptionPressMs={FADE_SHEET_PICKER_DEFER_MS}
      />

      <ReactionSheet
        visible={!!reactionMessage}
        onClose={() => setReactionMessage(null)}
        reactionsLoading={reactionsLoading}
        reactionDetails={reactionDetails}
        selectedReactionTypes={reactionMessage?.userReactionTypes ?? []}
        currentUserId={userId}
        canReact={
          !!reactionMessage &&
          !!userId &&
          // Reacting to your own message is not a thing people do. The sheet still opens on
          // an own message -- that is how edit and delete are reached -- it just does not
          // offer the emoji row.
          reactionMessage.userId !== userId &&
          !(reactionMessage as ChatMessage & { outboundStatus?: 'sending' | 'failed' })
            .outboundStatus
        }
        isMutating={reactMutation.isPending || removeReactionMutation.isPending}
        onAddReaction={handleReact}
        onRemoveReaction={handleRemoveReaction}
        primaryActions={reactionSheetPrimaryActions}
      />

      {copiedToastVisible ? (
        <View style={styles.copiedToast} pointerEvents="none" accessibilityRole="alert">
          <Ionicons name="checkmark-circle" size={16} color={colors.onPrimary} />
          <Text style={styles.copiedToastText}>{t('message.copied')}</Text>
        </View>
      ) : null}

      {/* Image preview modal */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <Pressable
          style={styles.imagePreviewOverlay}
          onPress={() => setPreviewImageUrl(null)}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          {previewImageUrl ? (
            <>
              <Image
                source={{ uri: previewImageUrl }}
                style={[styles.imagePreviewImage, getMediaViewerSize(windowWidth, windowHeight)]}
                contentFit="contain"
              />
              <Pressable
                style={styles.imagePreviewDownloadButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDownloadImage();
                }}
                disabled={isDownloading}
                accessibilityLabel={t('message.downloadImage')}
                accessibilityRole="button"
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Ionicons name="download-outline" size={24} color={colors.surface} />
                )}
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Modal>

      <VideoAttachmentModal
        visible={!!previewVideo}
        videoUrl={previewVideo?.url ?? null}
        suggestedFileName={previewVideo?.fileName}
        onRequestClose={() => setPreviewVideo(null)}
      />

      <FileAttachmentModal
        visible={!!previewFile}
        fileUrl={previewFile?.url ?? null}
        fileName={previewFile?.fileName ?? ''}
        mimeType={previewFile?.mimeType}
        onRequestClose={() => setPreviewFile(null)}
      />

      <VoiceRecorderModal
        visible={voiceRecorderVisible}
        onRequestClose={() => setVoiceRecorderVisible(false)}
        onRecorded={(localUri, durationSec, mimeType) => {
          void handleVoiceRecorded(localUri, durationSec, mimeType);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadOlder: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceContainerHigh,
  },
  loadOlderText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  copiedToast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: colors.primary,
    ...shadow.floating,
  },
  copiedToastText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.onSurface,
  },

  /* ── Custom chat header ─────────────────────────────── */
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  chatHeaderTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
  },
  chatHeaderSubtitle: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: colors.ghostBorder,
    marginHorizontal: spacing.screenHorizontal,
  },

  /* ── Messages scroll ────────────────────────────────── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  /* ── Date separator ─────────────────────────────────── */
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.4,
  },
  dateSeparatorText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },

  /* ── Compose area ───────────────────────────────────── */
  composeArea: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    flexShrink: 0,
  },

  /* ── Image preview ──────────────────────────────────── */
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewDownloadButton: {
    position: 'absolute',
    top: spacing.lg + 50,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    backgroundColor: 'transparent',
  },
});
