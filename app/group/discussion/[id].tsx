import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/primitives';
import {
  FileAttachmentModal,
  MessageAttachmentsBlock,
  VideoAttachmentModal,
  type OutboundMessageStatus,
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
  useCreateDiscussionPostMutation,
  useDiscussionPostReactionsQuery,
  useDiscussionPostsQuery,
  useDiscussionQuery,
  useUserIsGroupAdminQuery,
  useGroupsForUserQuery,
  useIsAdminQuery,
  useJoinGroupMutation,
  useReactToPostMutation,
  useRemovePostReactionMutation,
  useUpdateDiscussionPostMutation,
  useUploadDiscussionPostAttachmentMutation,
  useUploadDiscussionPostImageMutation,
} from '@/hooks/useApiQueries';
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
import { api, getUserFacingError } from '@/lib/api';
import { enqueueDocumentPick } from '@/lib/documentPickerLock';
import { queryKeys } from '@/lib/api/queryKeys';
import type {
  CreateDiscussionPostInput,
  Discussion,
  DiscussionPost,
  MessageAttachment,
  PostReactionType,
} from '@/lib/api';
import {
  formatMessageSentClockTime,
  formatRelativeTime,
  isGroupEventDiscussionReadOnly,
  messageLocalMinuteKey,
} from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

function OriginalPostRow({
  discussion,
  onAuthorPress,
}: {
  discussion: Discussion;
  onAuthorPress?: () => void;
}) {
  return (
    <View style={styles.originalPost}>
      <Pressable
        onPress={onAuthorPress}
        accessibilityLabel={
          discussion.authorDisplayName
            ? `View ${discussion.authorDisplayName}'s profile`
            : 'View profile'
        }
        accessibilityRole="button"
      >
        <Avatar
          source={discussion.authorAvatarUrl ? { uri: discussion.authorAvatarUrl } : null}
          fallbackText={discussion.authorDisplayName}
          size="sm"
        />
      </Pressable>
      <View style={styles.originalPostContent}>
        <Text style={styles.topicTitle}>{discussion.title}</Text>
        {discussion.body ? <Text style={styles.postBody}>{discussion.body}</Text> : null}
        <View style={styles.postHeader}>
          <Pressable onPress={onAuthorPress} accessibilityRole="link">
            <Text style={styles.authorName}>
              by {discussion.authorDisplayName ?? t('common.loading')}
            </Text>
          </Pressable>
          <View style={styles.postHeaderMeta}>
            <Text style={styles.date}>{formatRelativeTime(discussion.createdAt)}</Text>
            {discussion.updatedAt && discussion.updatedAt !== discussion.createdAt ? (
              <Text style={styles.editedLabel}> [{t('discussions.edited')}]</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const REACTION_EMOJI: Record<PostReactionType, string> = {
  prayer: '🙏',
  laugh: '😂',
  thumbs_up: '👍',
};

type DiscussionReplyPost = DiscussionPost & {
  outboundStatus?: OutboundMessageStatus;
  outboundRetryPayload?: CreateDiscussionPostInput;
};

function ReplyRow({
  post,
  parentPost,
  onImagePress,
  onVideoPress,
  onFilePress,
  onLongPress,
  onAddReaction,
  onRemoveReaction,
  onAuthorPress,
  onRetryOutbound,
  canReact,
  currentUserId,
  showSentClockTime = true,
  extraGapAfterPeerChange = false,
}: {
  post: DiscussionReplyPost;
  parentPost?: DiscussionPost | null;
  onImagePress?: (url: string) => void;
  onVideoPress?: (att: MessageAttachment) => void;
  onFilePress?: (att: MessageAttachment) => void;
  onLongPress?: () => void;
  onAddReaction?: (reactionType: PostReactionType) => void;
  onRemoveReaction?: (reactionType: PostReactionType) => void;
  onAuthorPress?: () => void;
  onRetryOutbound?: () => void;
  canReact?: boolean;
  currentUserId?: string;
  showSentClockTime?: boolean;
  extraGapAfterPeerChange?: boolean;
}) {
  const counts = post.reactionCounts ?? { prayer: 0, laugh: 0, thumbsUp: 0 };
  const userReactions = post.userReactionTypes ?? [];
  const hasReactions = counts.prayer > 0 || counts.laugh > 0 || counts.thumbsUp > 0;
  const isOwnPost = !!currentUserId && post.userId === currentUserId;
  const outboundStatus = post.outboundStatus;
  const showFailedOutbound = isOwnPost && outboundStatus === 'failed' && !!onRetryOutbound;
  const showSendingOutbound = isOwnPost && outboundStatus === 'sending';
  const isEdited = post.updatedAt && post.updatedAt !== post.createdAt;

  const handleLongPress = useCallback(() => {
    if (!canReact || !onLongPress || outboundStatus) return;
    onLongPress();
  }, [canReact, onLongPress, outboundStatus]);

  const isUserReaction = (type: PostReactionType) =>
    !!currentUserId && userReactions.includes(type);

  const longPressHint = showFailedOutbound
    ? undefined
    : canReact
      ? isOwnPost
        ? t('discussions.messageRowLongPressHintOwn')
        : t('discussions.messageRowLongPressHintOther')
      : undefined;

  const sentClock = formatMessageSentClockTime(post.createdAt);

  return (
    <View style={[styles.replyRowOuter, extraGapAfterPeerChange && styles.replyRowOuterPeerChange]}>
      <View style={styles.replyRowMain}>
        <View style={styles.replyCardWrapper}>
          <View style={styles.replyCardSliding}>
            <Pressable
              onLongPress={canReact && !outboundStatus ? handleLongPress : undefined}
              delayLongPress={400}
              style={({ pressed }) => [
                styles.replyCard,
                showFailedOutbound && styles.replyCardFailed,
                pressed && canReact && !outboundStatus && styles.replyCardPressed,
              ]}
              accessibilityLabel={
                showFailedOutbound ? t('discussions.sendFailed') : t('discussions.reactToReply')
              }
              accessibilityHint={longPressHint}
              accessibilityRole="button"
            >
              <View style={styles.replyCardHeader}>
                <Pressable
                  onPress={onAuthorPress}
                  accessibilityLabel={
                    post.authorDisplayName
                      ? `View ${post.authorDisplayName}'s profile`
                      : 'View profile'
                  }
                  accessibilityRole="button"
                >
                  <Avatar
                    source={post.authorAvatarUrl ? { uri: post.authorAvatarUrl } : null}
                    fallbackText={post.authorDisplayName}
                    size="sm"
                  />
                </Pressable>
                <View style={styles.replyCardMeta}>
                  <View style={styles.replyCardMetaBody}>
                    <View style={styles.replyCardMetaTitleRow}>
                      <Pressable onPress={onAuthorPress} accessibilityRole="link">
                        <Text style={styles.replyAuthorName}>
                          {post.authorDisplayName ?? t('common.loading')}
                        </Text>
                      </Pressable>
                      {isEdited ? (
                        <Text style={styles.replyEditedInline}> [{t('discussions.edited')}]</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.replyCardMetaRight}>
                    {showSendingOutbound ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textSecondary}
                        style={styles.replySendingSpinner}
                      />
                    ) : null}
                  </View>
                </View>
              </View>
              {parentPost ? (
                <View style={styles.replyToPreview}>
                  <Text style={styles.replyToAuthor}>
                    {t('discussions.replyingTo')}{' '}
                    {parentPost.authorDisplayName ?? t('common.loading')}
                  </Text>
                  <Text style={styles.replyToBody} numberOfLines={2}>
                    {parentPost.body ?? ''}
                  </Text>
                </View>
              ) : null}
              {post.body ? <Text style={styles.replyBody}>{post.body}</Text> : null}
              <MessageAttachmentsBlock
                post={post}
                isOwnMessage={isOwnPost}
                onImagePress={onImagePress}
                onVideoPress={onVideoPress}
                onFilePress={onFilePress}
              />
              {showFailedOutbound ? (
                <Text style={styles.replyFailedLabel}>{t('discussions.sendFailed')}</Text>
              ) : null}
            </Pressable>
            {hasReactions ? (
              <View style={styles.reactionBadges} pointerEvents="box-none">
                {(['prayer', 'laugh', 'thumbs_up'] as PostReactionType[]).map((type) => {
                  const count =
                    type === 'thumbs_up'
                      ? counts.thumbsUp
                      : type === 'prayer'
                        ? counts.prayer
                        : counts.laugh;
                  if (count <= 0) return null;
                  const isMine = isUserReaction(type);
                  const onPress =
                    canReact && (isMine ? onRemoveReaction : onAddReaction)
                      ? () => (isMine ? onRemoveReaction?.(type) : onAddReaction?.(type))
                      : undefined;
                  return (
                    <Pressable
                      key={type}
                      onPress={onPress}
                      style={({ pressed }) => [
                        styles.reactionBadge,
                        pressed && canReact && styles.reactionBadgePressed,
                      ]}
                      disabled={!onPress}
                      accessibilityLabel={
                        isMine
                          ? `Remove ${type} reaction (${count})`
                          : onPress
                            ? `Add ${type} reaction (${count})`
                            : `${REACTION_EMOJI[type]} ${count}`
                      }
                      accessibilityRole={onPress ? 'button' : 'text'}
                    >
                      <Text style={styles.reactionBadgeEmoji}>{REACTION_EMOJI[type]}</Text>
                      {count > 1 ? <Text style={styles.reactionBadgeCount}>{count}</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {showSentClockTime ? (
              <Text style={styles.replySentClockTime} accessibilityLabel={sentClock}>
                {sentClock}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {showFailedOutbound ? (
        <Pressable
          onPress={onRetryOutbound}
          style={styles.replyRetryButton}
          accessibilityLabel={t('discussions.retrySend')}
          accessibilityHint={t('discussions.retrySendHint')}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={24} color={colors.error} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function DiscussionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { iosKeyboardVerticalOffset, parentContainerProps } = useIosKeyboardAvoidingParentOffset();

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingComposeAttachment[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    fileName: string;
    mimeType?: string;
  } | null>(null);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [reactionPost, setReactionPost] = useState<DiscussionPost | null>(null);
  const [replyingToPost, setReplyingToPost] = useState<DiscussionPost | null>(null);
  const [editingPost, setEditingPost] = useState<DiscussionPost | null>(null);
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const discussionPostsScrollFingerprintRef = useRef<string | null>(null);
  const {
    data: discussion,
    isLoading,
    isError,
    error,
    refetch: refetchDiscussion,
  } = useDiscussionQuery(id);
  const { data: posts = [], refetch: refetchPosts } = useDiscussionPostsQuery(id, { userId });

  const onDiscussionScrollContentSizeChange = useCallback(() => {
    const list = posts;
    if (list.length === 0) return;
    const last = list[list.length - 1];
    const fp = `${list.length}:${last.id}`;
    if (fp === discussionPostsScrollFingerprintRef.current) return;
    discussionPostsScrollFingerprintRef.current = fp;
    scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [posts]);

  const { data: memberGroups = [] } = useGroupsForUserQuery(userId);
  const { data: isCurrentUserGroupAdmin = false } = useUserIsGroupAdminQuery(
    discussion?.groupId,
    userId,
    { enabled: !!discussion?.groupId && !!userId }
  );
  const { data: isAppAdmin } = useIsAdminQuery(userId);
  const isMember =
    !!discussion && !!userId && memberGroups.some((g) => g.id === discussion.groupId);
  const isEventDiscussionReadOnly = useMemo(() => {
    const ev = discussion?.linkedGroupEvent;
    if (!ev) return false;
    return isGroupEventDiscussionReadOnly(ev);
  }, [discussion?.linkedGroupEvent]);
  const canEngageInThread = !!isMember && !!userId && !isEventDiscussionReadOnly;
  const canReact = canEngageInThread;
  const isCreator = !!discussion && !!userId && discussion.userId === userId;
  const isGroupAdmin = !!discussion && !!userId && isCurrentUserGroupAdmin;
  const canEdit =
    !!discussion &&
    !!userId &&
    !isEventDiscussionReadOnly &&
    (isCreator || isGroupAdmin || isAppAdmin === true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canEdit
        ? () => (
            <Pressable
              onPress={() => id && router.push(`/group/discussion/edit?discussionId=${id}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
              accessibilityLabel={t('discussions.editDiscussion')}
              accessibilityHint={t('discussions.editDiscussionHint')}
              accessibilityRole="button"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    });
  }, [canEdit, id, navigation, router]);

  const createPostMutation = useCreateDiscussionPostMutation();
  const updatePostMutation = useUpdateDiscussionPostMutation();
  const uploadImageMutation = useUploadDiscussionPostImageMutation();
  const uploadDiscussionAttachmentMutation = useUploadDiscussionPostAttachmentMutation();
  const joinMutation = useJoinGroupMutation();
  const reactMutation = useReactToPostMutation();
  const removeReactionMutation = useRemovePostReactionMutation();
  const { data: reactionDetails = [], isLoading: reactionsLoading } =
    useDiscussionPostReactionsQuery(reactionPost?.id, { enabled: !!reactionPost });

  useFocusEffect(
    useCallback(() => {
      refetchDiscussion();
      refetchPosts();
    }, [refetchDiscussion, refetchPosts])
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const channelId = `messages:discussion:${id}`;
      api.realtime.subscribe(channelId, {
        onMessage: () => {
          qc.invalidateQueries({
            predicate: (q) => q.queryKey[0] === 'discussionPosts' && q.queryKey[1] === id,
          });
        },
      });
      return () => api.realtime.unsubscribe(channelId);
    }, [id, qc])
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

  const MAX_ATTACHMENTS = 5;
  const isUploadingAttachment =
    uploadImageMutation.isPending || uploadDiscussionAttachmentMutation.isPending;
  const allPendingReady =
    pendingAttachments.length === 0 ||
    pendingAttachments.every((a) => !a.uploading && !!a.uploadedUrl);
  const canPost =
    !isUploadingAttachment &&
    allPendingReady &&
    (composeText.trim().length > 0 || pendingAttachments.length > 0);
  const isEditing = !!editingPost;

  const handlePostReply = useCallback(() => {
    const body = composeText.trim();
    if (!userId || !id || !canPost) return;
    if (editingPost) {
      updatePostMutation.mutate(
        {
          postId: editingPost.id,
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
            setEditingPost(null);
          },
          onError: () => {},
        }
      );
    } else {
      const input: CreateDiscussionPostInput = {
        body,
        attachments:
          pendingAttachments.length > 0
            ? pendingToMessageAttachments(pendingAttachments)
            : undefined,
        parentPostId: replyingToPost?.id,
      };
      setComposeText('');
      setPendingAttachments([]);
      setReplyingToPost(null);
      createPostMutation.mutate({ discussionId: id, userId, input }, { onError: () => {} });
    }
  }, [
    userId,
    id,
    canPost,
    composeText,
    pendingAttachments,
    replyingToPost?.id,
    editingPost,
    createPostMutation,
    updatePostMutation,
  ]);

  const handleRetryOutboundDiscussionPost = useCallback(
    (post: DiscussionPost) => {
      if (!userId || !id) return;
      const p = post as DiscussionReplyPost;
      const payload = p.outboundRetryPayload;
      if (!payload) return;
      createPostMutation.mutate(
        {
          discussionId: id,
          userId,
          input: {
            body: payload.body,
            imageUrls: payload.imageUrls,
            attachments: payload.attachments,
            parentPostId: payload.parentPostId,
          },
          optimisticId: post.id,
        },
        { onError: () => {} }
      );
    },
    [userId, id, createPostMutation]
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
        { id: attId, kind: 'image', displayUri: asset.uri, uploading: true },
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
      const videoUrl = await uploadDiscussionAttachmentMutation.mutateAsync({
        userId,
        localUri: asset.uri,
        contentType: normalizeMimeTypeForAllowlist(mime),
        fileName,
        objectKind: 'post',
      });
      let uploadedThumbnailUrl: string | undefined;
      if (posterUri) {
        uploadedThumbnailUrl = await uploadDiscussionAttachmentMutation.mutateAsync({
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
  }, [userId, pendingAttachments.length, uploadDiscussionAttachmentMutation]);

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
      const url = await uploadDiscussionAttachmentMutation.mutateAsync({
        userId,
        localUri: doc.uri,
        contentType: mime,
        fileName: name,
        objectKind: 'post',
      });
      setPendingAttachments((prev) =>
        prev.map((p) => (p.id === attachmentId ? { ...p, uploadedUrl: url, uploading: false } : p))
      );
    } catch {
      setPendingAttachments((prev) => prev.filter((p) => p.id !== attachmentId));
    }
  }, [userId, pendingAttachments.length, uploadDiscussionAttachmentMutation]);

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
      const filename = `discussion-image-${Date.now()}.${ext}`;
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

  const handleJoinToReply = useCallback(() => {
    if (!userId || !discussion) return;
    joinMutation.mutate(
      { groupId: discussion.groupId, userId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.groupsForUser(userId) });
        },
      }
    );
  }, [userId, discussion, joinMutation, qc]);

  const handleReact = useCallback(
    (reactionType: PostReactionType) => {
      if (!userId || !id || !reactionPost) return;
      reactMutation.mutate(
        { postId: reactionPost.id, discussionId: id, userId, reactionType },
        { onSuccess: () => setReactionPost(null) }
      );
    },
    [userId, id, reactionPost, reactMutation]
  );

  const handleRemoveReactionFromSheet = useCallback(
    (reactionType: PostReactionType) => {
      if (!reactionPost || !userId || !id) return;
      removeReactionMutation.mutate(
        {
          postId: reactionPost.id,
          discussionId: id,
          userId,
          reactionType,
        },
        { onSuccess: () => setReactionPost(null) }
      );
    },
    [reactionPost, userId, id, removeReactionMutation]
  );

  const handleAddReaction = useCallback(
    (post: DiscussionPost, reactionType: PostReactionType) => {
      if (!userId || !id) return;
      reactMutation.mutate({
        postId: post.id,
        discussionId: id,
        userId,
        reactionType,
      });
    },
    [userId, id, reactMutation]
  );

  const handleStartEditReply = useCallback((post: DiscussionPost) => {
    setReplyingToPost(null);
    setEditingPost(post);
    setComposeText(post.body ?? '');
    setPendingAttachments(storedMessageToPendingAttachments(post));
  }, []);

  const reactionSheetPrimaryActions = useMemo((): ReactionSheetPrimaryAction[] => {
    const post = reactionPost;
    if (!post || !userId || !canEngageInThread) return [];
    const outbound = (post as DiscussionReplyPost).outboundStatus;
    if (outbound) return [];
    const actions: ReactionSheetPrimaryAction[] = [
      {
        key: 'reply',
        label: t('discussions.sheetReply'),
        icon: 'arrow-undo-outline',
        accessibilityLabel: t('discussions.sheetReply'),
        accessibilityHint: t('discussions.sheetReplyHint'),
        onPress: () => {
          setReactionPost(null);
          setEditingPost(null);
          setReplyingToPost(post);
        },
      },
    ];
    if (post.userId === userId) {
      actions.push({
        key: 'edit',
        label: t('discussions.sheetEdit'),
        icon: 'pencil-outline',
        accessibilityLabel: t('discussions.sheetEdit'),
        accessibilityHint: t('discussions.sheetEditHint'),
        onPress: () => {
          setReactionPost(null);
          handleStartEditReply(post);
        },
      });
    }
    return actions;
  }, [reactionPost, userId, canEngageInThread, handleStartEditReply]);

  const handleCancelEdit = useCallback(() => {
    setEditingPost(null);
    setComposeText('');
    setPendingAttachments([]);
  }, []);

  const handleRemoveReaction = useCallback(
    (post: DiscussionPost, reactionType: PostReactionType) => {
      if (!userId || !id) return;
      removeReactionMutation.mutate({
        postId: post.id,
        discussionId: id,
        userId,
        reactionType,
      });
    },
    [userId, id, removeReactionMutation]
  );

  if (!id) {
    router.back();
    return null;
  }

  if (isLoading && !discussion) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !discussion) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error && 'message' in error ? getUserFacingError(error) : t('common.error')}
        </Text>
      </View>
    );
  }

  return (
    <View {...parentContainerProps} style={styles.screenRoot}>
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
          onContentSizeChange={onDiscussionScrollContentSizeChange}
        >
          <OriginalPostRow
            discussion={discussion}
            onAuthorPress={() => router.push(`/profile/${discussion.userId}`)}
          />

          <View style={styles.repliesSection}>
            {isEventDiscussionReadOnly ? (
              <View style={styles.readOnlyBanner} accessibilityRole="text">
                <Ionicons name="lock-closed-outline" size={18} color={colors.onSurfaceVariant} />
                <View style={styles.readOnlyBannerText}>
                  <Text style={styles.readOnlyBannerTitle}>
                    {t('groupEvents.discussionReadOnlyBanner')}
                  </Text>
                  <Text style={styles.readOnlyBannerSub}>
                    {t('groupEvents.discussionDisabledCancelled')}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.repliesHeading}>
              {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
            </Text>
            {posts.map((p, postIdx) => {
              const prevPost = postIdx > 0 ? posts[postIdx - 1] : null;
              const outboundStatus = (p as DiscussionReplyPost).outboundStatus;
              const canReactOnPost = canReact && !outboundStatus;
              const nextPost = postIdx < posts.length - 1 ? posts[postIdx + 1] : null;
              const showSentClockTime =
                !nextPost ||
                messageLocalMinuteKey(nextPost.createdAt) !== messageLocalMinuteKey(p.createdAt);
              const prevIsOwn = !!prevPost && !!userId && prevPost.userId === userId;
              const thisIsOwn = !!userId && p.userId === userId;
              const extraGapAfterPeerChange = !!prevPost && !!userId && prevIsOwn !== thisIsOwn;
              return (
                <ReplyRow
                  key={p.id}
                  post={p as DiscussionReplyPost}
                  parentPost={
                    p.parentPostId ? (posts.find((x) => x.id === p.parentPostId) ?? null) : null
                  }
                  onImagePress={(url) => setPreviewImageUrl(url)}
                  onVideoPress={(att) => setPreviewVideoUrl(att.url)}
                  onFilePress={(att) =>
                    setPreviewFile({
                      url: att.url,
                      fileName: att.fileName ?? t('attachments.file'),
                      mimeType: att.mimeType,
                    })
                  }
                  onLongPress={() => setReactionPost(p)}
                  onAddReaction={(type) => handleAddReaction(p, type)}
                  onRemoveReaction={(type) => handleRemoveReaction(p, type)}
                  onAuthorPress={() => router.push(`/profile/${p.userId}`)}
                  onRetryOutbound={
                    outboundStatus === 'failed'
                      ? () => handleRetryOutboundDiscussionPost(p)
                      : undefined
                  }
                  canReact={canReactOnPost}
                  currentUserId={userId}
                  showSentClockTime={showSentClockTime}
                  extraGapAfterPeerChange={extraGapAfterPeerChange}
                />
              );
            })}
          </View>
        </ScrollView>

        {!isMember ? (
          <View
            style={[
              styles.bottomBar,
              styles.bottomBarAux,
              { paddingBottom: spacing.md + insets.bottom },
            ]}
          >
            <Pressable
              onPress={handleJoinToReply}
              style={({ pressed }) => [
                styles.joinPrompt,
                pressed && styles.joinPromptPressed,
                joinMutation.isPending && styles.joinPromptDisabled,
              ]}
              disabled={joinMutation.isPending}
              accessibilityLabel={t('discussions.joinToReply')}
              accessibilityHint="Join the group to participate"
              accessibilityRole="button"
            >
              {joinMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.ink300} />
              ) : (
                <>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.ink300} />
                  <Text style={styles.joinPromptText}>{t('discussions.joinToReply')}</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : isEventDiscussionReadOnly ? (
          <View
            style={[
              styles.bottomBar,
              styles.bottomBarAux,
              { paddingBottom: spacing.md + insets.bottom },
            ]}
          >
            <View style={styles.readOnlyBottomBar} accessibilityRole="text">
              <Ionicons name="lock-closed-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.readOnlyBottomText}>
                {t('groupEvents.discussionReadOnlyBanner')}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.bottomBar,
              styles.bottomBarComposer,
              { paddingBottom: spacing.xxs + (keyboardOpen ? 0 : insets.bottom) },
            ]}
            collapsable={false}
          >
            <ComposeBar
              text={composeText}
              onChangeText={setComposeText}
              onSend={handlePostReply}
              canSend={canPost}
              isSending={editingPost ? updatePostMutation.isPending : createPostMutation.isPending}
              sendLabel={isEditing ? t('discussions.updateReply') : t('discussions.postReply')}
              pendingAttachments={pendingAttachments}
              onRemoveAttachment={removePendingAttachment}
              onOpenAttachmentMenu={() => setAttachmentMenuVisible(true)}
              isUploadingAttachment={isUploadingAttachment}
              maxAttachments={MAX_ATTACHMENTS}
              editingContext={
                editingPost ? { preview: editingPost.body ?? '', onCancel: handleCancelEdit } : null
              }
              replyingToContext={
                replyingToPost
                  ? {
                      authorName: replyingToPost.authorDisplayName ?? t('common.loading'),
                      preview: replyingToPost.body ?? '',
                      onCancel: () => setReplyingToPost(null),
                    }
                  : null
              }
              variant="discussion"
            />
          </View>
        )}
      </KeyboardAvoidingView>
      <ReactionSheet
        visible={!!reactionPost}
        onClose={() => setReactionPost(null)}
        reactionsLoading={reactionsLoading}
        reactionDetails={reactionDetails}
        selectedReactionTypes={reactionPost?.userReactionTypes ?? []}
        currentUserId={userId}
        canReact={canReact}
        isMutating={reactMutation.isPending || removeReactionMutation.isPending}
        onAddReaction={handleReact}
        onRemoveReaction={handleRemoveReactionFromSheet}
        primaryActions={reactionSheetPrimaryActions}
      />
      <FadeActionSheet
        visible={attachmentMenuVisible}
        onRequestClose={() => setAttachmentMenuVisible(false)}
        options={attachmentMenuOptions}
        deferOptionPressMs={FADE_SHEET_PICKER_DEFER_MS}
      />
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
                accessibilityHint={t('discussions.downloadImageHint')}
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
        visible={!!previewVideoUrl}
        videoUrl={previewVideoUrl}
        onRequestClose={() => setPreviewVideoUrl(null)}
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
  screenRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  originalPost: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  originalPostContent: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  postHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editedLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  authorName: {
    ...typography.caption,
    color: colors.primary,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  topicTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  postBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  repliesSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
  },
  readOnlyBannerText: {
    flex: 1,
  },
  readOnlyBannerTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  readOnlyBannerSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  readOnlyBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.sm,
  },
  readOnlyBottomText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  repliesHeading: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  replyRowOuter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  replyRowOuterPeerChange: {
    marginTop: spacing.xxs,
  },
  replyRowMain: {
    flex: 1,
    minWidth: 0,
  },
  replyCardFailed: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  replyFailedLabel: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  replyRetryButton: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xxs,
    justifyContent: 'flex-start',
  },
  replySendingSpinner: {
    marginRight: spacing.xs,
  },
  replyCardWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  replyCardSliding: {
    position: 'relative',
  },
  replyCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  replyCardPressed: {
    opacity: 0.9,
  },
  reactionBadges: {
    position: 'absolute',
    bottom: -6,
    right: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.surfaceContainerLow,
  },
  reactionBadgePressed: {
    opacity: 0.8,
  },
  reactionBadgeEmoji: {
    fontSize: 14,
  },
  reactionBadgeCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  replyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  replyCardMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  replyCardMetaBody: {
    flex: 1,
    minWidth: 0,
  },
  replyCardMetaTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  replyCardMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyAuthorName: {
    ...typography.label,
    color: colors.primary,
  },
  replyEditedInline: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  replySentClockTime: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.xxs,
  },
  replyToPreview: {
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    opacity: 0.85,
  },
  replyToAuthor: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: 2,
  },
  replyToBody: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  replyBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  replyImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  replyImagePressable: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  replyImage: {
    width: 120,
    height: 120,
    borderRadius: radius.card,
    backgroundColor: colors.surface100,
  },
  bottomBar: {
    paddingHorizontal: spacing.screenHorizontal,
    backgroundColor: colors.surfaceContainerLow,
  },
  bottomBarComposer: {
    paddingTop: spacing.xs,
    flexShrink: 0,
  },
  bottomBarAux: {
    paddingTop: spacing.md,
    flexShrink: 0,
  },
  joinPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface100,
    borderRadius: radius.sm,
  },
  joinPromptPressed: {
    opacity: 0.8,
  },
  joinPromptDisabled: {
    opacity: 0.6,
  },
  joinPromptText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewDownloadButton: {
    position: 'absolute',
    top: spacing.lg + (Platform.OS === 'ios' ? 50 : 24),
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    backgroundColor: 'transparent',
  },
});
