import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  VideoAttachmentModal,
} from '@/components/messages';
import { ComposeBar, type PendingComposeAttachment } from '@/components/patterns/ComposeBar';
import { FadeActionSheet, FADE_SHEET_PICKER_DEFER_MS } from '@/components/patterns/FadeActionSheet';
import {
  ReactionSheet,
  type ReactionSheetPrimaryAction,
} from '@/components/patterns/ReactionSheet';
import { useAuth } from '@/hooks/useAuth';
import { useIosKeyboardAvoidingParentOffset } from '@/hooks/useIosKeyboardAvoidingParentOffset';
import {
  useChatMessageReactionsQuery,
  useChatMessagesQuery,
  useChatQuery,
  useCreateChatMessageMutation,
  useCreateChatMutation,
  useMarkChatReadMutation,
  useReactToChatMessageMutation,
  useRemoveChatMessageReactionMutation,
  useUpdateChatMessageMutation,
  useUploadChatImageMutation,
  useUploadChatMessageAttachmentMutation,
} from '@/hooks/useApiQueries';
import { api, getUserFacingError } from '@/lib/api';
import { enqueueDocumentPick } from '@/lib/documentPickerLock';
import {
  DOCUMENT_PICKER_MIME_WHITELIST,
  newComposeAttachmentId,
  pendingToMessageAttachments,
  storedMessageToPendingAttachments,
} from '@/lib/composeAttachments';
import { tryGetVideoPosterUri } from '@/lib/videoPoster';
import {
  isAllowedMessageAttachmentMimeType,
  MAX_MESSAGE_ATTACHMENT_BYTES,
  normalizeMimeTypeForAllowlist,
} from '@/lib/api/messageAttachments';
import { queryKeys } from '@/lib/api/queryKeys';
import type { ChatMessage, CreateChatMessageInput, PostReactionType } from '@/lib/api';
import { formatDateHeader, isSameDay, messageLocalMinuteKey } from '@/lib/dates';
import { t } from '@/lib/i18n';

import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesScrollFingerprintRef = useRef<string | null>(null);
  const messageOffsetYsRef = useRef<Map<string, number>>(new Map());
  const shouldStickToEndRef = useRef(!focusMessageId);
  const lastScrolledFocusRef = useRef<string | undefined>(undefined);

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { iosKeyboardVerticalOffset, parentContainerProps } = useIosKeyboardAvoidingParentOffset();
  const [composeText, setComposeText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingComposeAttachment[]>([]);
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

  const { data: chat, isLoading, isError, error, refetch } = useChatQuery(id);
  const { data: messages = [], refetch: refetchMessages } = useChatMessagesQuery(id, {
    userId,
  });
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
  const markReadMutation = useMarkChatReadMutation();

  const onChatMessagesContentSizeChange = useCallback(() => {
    if (!shouldStickToEndRef.current) return;
    const msgs = messages;
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    const fp = `${msgs.length}:${last.id}`;
    if (fp === messagesScrollFingerprintRef.current) return;
    messagesScrollFingerprintRef.current = fp;
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [messages]);

  useEffect(() => {
    if (focusMessageId) shouldStickToEndRef.current = false;
  }, [focusMessageId]);

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
        lastScrolledFocusRef.current = focusMessageId;
        setTimeout(() => setHighlightedMessageId(null), 2200);
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
  }, [focusMessageId, messages]);

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

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchMessages();
      if (id && userId) {
        markReadMutation.mutate({ chatId: id, userId });
      }
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
        },
      });
      return () => api.realtime.unsubscribe(channelId);
    }, [id, userId, qc])
  );

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

  const memberCount = chat?.members?.length ?? 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
      {
        icon: 'folder-open-outline' as const,
        label: t('messages.addToFolder'),
        onPress: () => {
          setChatMenuVisible(false);
          router.push(`/messages/add-chat-to-folder/${id}`);
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
            Alert.alert(t('common.error'), getUserFacingError(err));
          },
        }
      );
    },
    [userId, id, memberUserIds, createChatMutation, router]
  );

  const MAX_ATTACHMENTS = 5;
  const isUploadingAttachment =
    uploadImageMutation.isPending || uploadChatAttachmentMutation.isPending;

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

  const pickPhotos = useCallback(async () => {
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.photoPermissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets.length) return;
    const slotsLeft = MAX_ATTACHMENTS - pendingAttachments.length;
    const toUpload = result.assets.slice(0, Math.max(0, slotsLeft));
    for (const asset of toUpload) {
      if (!asset.uri) continue;
      const attId = newComposeAttachmentId();
      setPendingAttachments((prev) => [
        ...prev,
        {
          id: attId,
          kind: 'image',
          displayUri: asset.uri,
          uploading: true,
        },
      ]);
      try {
        const url = await uploadImageMutation.mutateAsync({
          userId,
          imageUri: asset.uri,
          base64Data: asset.base64 ?? undefined,
        });
        setPendingAttachments((prev) =>
          prev.map((p) => (p.id === attId ? { ...p, uploadedUrl: url, uploading: false } : p))
        );
      } catch {
        setPendingAttachments((prev) => prev.filter((p) => p.id !== attId));
      }
    }
  }, [userId, pendingAttachments.length, uploadImageMutation]);

  const pickVideo = useCallback(async () => {
    if (!userId) return;
    if (pendingAttachments.length >= MAX_ATTACHMENTS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('profile.photoPermissionRequired'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    const attachmentId = newComposeAttachmentId();
    const posterUri = await tryGetVideoPosterUri(asset.uri);
    const fileName = asset.fileName ?? `video-${Date.now()}.mp4`;
    const mime = asset.mimeType ?? 'video/mp4';
    setPendingAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        kind: 'video',
        displayUri: posterUri ?? '',
        fileName,
        mimeType: mime,
        uploading: true,
      },
    ]);
    try {
      const videoUrl = await uploadChatAttachmentMutation.mutateAsync({
        userId,
        localUri: asset.uri,
        contentType: normalizeMimeTypeForAllowlist(mime),
        fileName,
        objectKind: 'message',
      });
      let uploadedThumbnailUrl: string | undefined;
      if (posterUri) {
        uploadedThumbnailUrl = await uploadChatAttachmentMutation.mutateAsync({
          userId,
          localUri: posterUri,
          contentType: 'image/jpeg',
          fileName: 'thumb.jpg',
          objectKind: 'thumbnail',
        });
      }
      setPendingAttachments((prev) =>
        prev.map((p) =>
          p.id === attachmentId
            ? {
                ...p,
                uploadedUrl: videoUrl,
                uploadedThumbnailUrl,
                uploading: false,
              }
            : p
        )
      );
    } catch {
      setPendingAttachments((prev) => prev.filter((p) => p.id !== attachmentId));
    }
  }, [userId, pendingAttachments.length, uploadChatAttachmentMutation]);

  const pickDocument = useCallback(async () => {
    if (!userId) return;
    if (pendingAttachments.length >= MAX_ATTACHMENTS) return;
    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await enqueueDocumentPick(() =>
        DocumentPicker.getDocumentAsync({
          type: DOCUMENT_PICKER_MIME_WHITELIST,
          multiple: false,
          copyToCacheDirectory: true,
        })
      );
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : String(e));
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const doc = result.assets[0];
    const mime = normalizeMimeTypeForAllowlist(doc.mimeType ?? 'application/octet-stream');
    if (!isAllowedMessageAttachmentMimeType(mime)) {
      Alert.alert(t('common.error'), t('attachments.unsupportedFileType'));
      return;
    }
    if (doc.size != null && doc.size > MAX_MESSAGE_ATTACHMENT_BYTES) {
      Alert.alert(t('common.error'), t('attachments.fileTooLarge'));
      return;
    }
    const attachmentId = newComposeAttachmentId();
    const name = doc.name || 'file';
    setPendingAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        kind: 'file',
        fileName: name,
        mimeType: mime,
        displayUri: doc.uri,
        uploading: true,
      },
    ]);
    try {
      const url = await uploadChatAttachmentMutation.mutateAsync({
        userId,
        localUri: doc.uri,
        contentType: mime,
        fileName: name,
        objectKind: 'message',
      });
      setPendingAttachments((prev) =>
        prev.map((p) => (p.id === attachmentId ? { ...p, uploadedUrl: url, uploading: false } : p))
      );
    } catch {
      setPendingAttachments((prev) => prev.filter((p) => p.id !== attachmentId));
    }
  }, [userId, pendingAttachments.length, uploadChatAttachmentMutation]);

  const removePendingAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((p) => p.id !== attachmentId));
  }, []);

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
    ],
    [pickPhotos, pickVideo, pickDocument]
  );

  const handleDownloadImage = useCallback(async () => {
    if (!previewImageUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('discussions.downloadPermissionDenied'));
        return;
      }
      const ext = previewImageUrl.match(/\.(jpe?g|png|gif|webp)/i)?.[1] ?? 'jpg';
      const filename = `chat-image-${Date.now()}.${ext}`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(previewImageUrl, localUri);
      await MediaLibrary.createAssetAsync(localUri);
      setPreviewImageUrl(null);
      Alert.alert(t('discussions.downloadSuccess'), t('discussions.downloadSuccessMessage'));
    } catch (err) {
      const msg =
        err && typeof err === 'object' && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : t('discussions.downloadError');
      Alert.alert(t('common.error'), msg);
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

  const handleStartEdit = useCallback((msg: ChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setComposeText(msg.body ?? '');
    setPendingAttachments(storedMessageToPendingAttachments(msg));
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setComposeText('');
    setPendingAttachments([]);
  }, []);

  const reactionSheetPrimaryActions = useMemo((): ReactionSheetPrimaryAction[] => {
    const msg = reactionMessage;
    if (!msg || !userId) return [];
    const outbound = (msg as ChatMessage & { outboundStatus?: 'sending' | 'failed' })
      .outboundStatus;
    if (outbound) return [];
    const actions: ReactionSheetPrimaryAction[] = [
      {
        key: 'reply',
        label: t('discussions.sheetReply'),
        icon: 'arrow-undo-outline',
        accessibilityLabel: t('discussions.sheetReply'),
        accessibilityHint: t('discussions.sheetReplyHint'),
        onPress: () => {
          setReactionMessage(null);
          setEditingMessage(null);
          setReplyingTo(msg);
        },
      },
    ];
    if (msg.userId === userId) {
      actions.push({
        key: 'edit',
        label: t('discussions.sheetEdit'),
        icon: 'pencil-outline',
        accessibilityLabel: t('discussions.sheetEdit'),
        accessibilityHint: t('discussions.sheetEditHint'),
        onPress: () => {
          setReactionMessage(null);
          handleStartEdit(msg);
        },
      });
    }
    return actions;
  }, [reactionMessage, userId, handleStartEdit]);

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
          onPress={() => router.back()}
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
        >
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
            const canReactToMessage = !!userId && !outboundStatus;
            const showSentClockTime =
              !nextMsg ||
              messageLocalMinuteKey(nextMsg.createdAt) !== messageLocalMinuteKey(msg.createdAt);
            const prevIsOwn = !!prevMsg && !!userId && prevMsg.userId === userId;
            const thisIsOwn = !!userId && msg.userId === userId;
            const extraGapAfterPeerChange =
              !!prevMsg && !!userId && !showDateSeparator && prevIsOwn !== thisIsOwn;

            return (
              <View
                key={msg.id}
                collapsable={false}
                onLayout={(e) => {
                  messageOffsetYsRef.current.set(msg.id, e.nativeEvent.layout.y);
                }}
                style={highlightedMessageId === msg.id ? styles.messageHighlight : undefined}
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
                />
              </View>
            );
          })}
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
            onChangeText={setComposeText}
            onSend={handlePost}
            canSend={canPost}
            isSending={
              editingMessage ? updateMessageMutation.isPending : createMessageMutation.isPending
            }
            sendLabel={editingMessage ? t('discussions.updateReply') : t('discussions.postReply')}
            pendingAttachments={pendingAttachments}
            onRemoveAttachment={removePendingAttachment}
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
          !(reactionMessage as ChatMessage & { outboundStatus?: 'sending' | 'failed' })
            .outboundStatus
        }
        isMutating={reactMutation.isPending || removeReactionMutation.isPending}
        onAddReaction={handleReact}
        onRemoveReaction={handleRemoveReaction}
        primaryActions={reactionSheetPrimaryActions}
      />

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
                style={[
                  styles.imagePreviewImage,
                  {
                    width: Dimensions.get('window').width,
                    height: Dimensions.get('window').height,
                  },
                ]}
                contentFit="contain"
              />
              <Pressable
                style={styles.imagePreviewDownloadButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDownloadImage();
                }}
                disabled={isDownloading}
                accessibilityLabel={t('discussions.downloadImage')}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  messageHighlight: {
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.md,
    marginHorizontal: -spacing.xs,
    paddingHorizontal: spacing.xs,
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
