import React from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface PendingComposeAttachment {
  id: string;
  kind: 'image' | 'video' | 'file' | 'audio';
  fileName?: string;
  mimeType?: string;
  /** Local or remote URI shown in preview */
  displayUri: string;
  uploadedUrl?: string;
  uploadedThumbnailUrl?: string;
  uploading: boolean;
  /** True when the upload failed; the attachment stays in the list with a retry affordance. */
  failed?: boolean;
  /** Duration in seconds (voice messages). */
  durationSec?: number;
  /** Original local file URI to re-upload from on retry (undefined for audio, which isn't retryable here). */
  sourceUri?: string;
  /** Base64 data captured at pick time, so retry doesn't need to re-read the file. */
  sourceBase64?: string | null;
}

function formatDurationLabel(seconds?: number): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface ContextBanner {
  preview: string;
  onCancel: () => void;
}

interface ReplyContextBanner extends ContextBanner {
  authorName: string;
}

export interface ComposeBarProps {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
  placeholder?: string;
  sendLabel?: string;

  pendingAttachments: PendingComposeAttachment[];
  onRemoveAttachment: (id: string) => void;
  onRetryAttachment?: (id: string) => void;
  onOpenAttachmentMenu: () => void;
  isUploadingAttachment: boolean;
  maxAttachments?: number;

  editingContext?: ContextBanner | null;
  replyingToContext?: ReplyContextBanner | null;

  variant?: 'discussion' | 'chat';

  /**
   * Desktop web only: Enter sends, Shift+Enter inserts a newline. Off by default because a
   * long-form composer (discussions) wants Enter to mean "new paragraph".
   */
  submitOnEnter?: boolean;
}

export function ComposeBar({
  text,
  onChangeText,
  onSend,
  canSend,
  isSending,
  placeholder,
  sendLabel,
  pendingAttachments,
  onRemoveAttachment,
  onRetryAttachment,
  onOpenAttachmentMenu,
  isUploadingAttachment,
  maxAttachments = 5,
  submitOnEnter = false,
  editingContext,
  replyingToContext,
  variant = 'discussion',
}: ComposeBarProps) {
  const isChat = variant === 'chat';
  const atLimit = pendingAttachments.length >= maxAttachments;

  /**
   * Enter-to-send on desktop web.
   *
   * Two things this must not break:
   *
   * 1. IME composition. Typing Korean or Khmer goes through a composition session, and the
   *    Enter that commits a candidate is a *different* Enter from the one that means "send".
   *    Sending on the first would truncate the word being typed, so the composing keystroke
   *    (`isComposing`, or the legacy keyCode 229 that older browsers report) is ignored.
   *    react-native-web's own submit path makes the same check; this mirrors it.
   * 2. Touch keyboards. On a phone browser Enter is the newline key, so this is gated on a
   *    fine pointer rather than on Platform.OS === 'web' alone.
   *
   * preventDefault stops both the newline insertion and react-native-web's built-in
   * onSubmitEditing path, which would otherwise blur the input and cost the user their focus.
   */
  const handleKeyPress = React.useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (!submitOnEnter || Platform.OS !== 'web') return;
      const webEvent = e as unknown as {
        key?: string;
        shiftKey?: boolean;
        preventDefault?: () => void;
        nativeEvent?: { isComposing?: boolean; keyCode?: number };
      };
      if (webEvent.key !== 'Enter' || webEvent.shiftKey) return;
      const native = webEvent.nativeEvent;
      if (native?.isComposing || native?.keyCode === 229) return;
      if (typeof window !== 'undefined' && window.matchMedia) {
        if (!window.matchMedia('(pointer: fine)').matches) return;
      }
      webEvent.preventDefault?.();
      if (!canSend || isSending || isUploadingAttachment) return;
      onSend();
    },
    [submitOnEnter, canSend, isSending, isUploadingAttachment, onSend]
  );

  return (
    <View>
      {editingContext ? (
        <View style={isChat ? chatStyles.contextBanner : styles.contextBanner}>
          <View style={isChat ? chatStyles.contextBannerContent : styles.contextBannerContent}>
            <Text style={isChat ? chatStyles.contextBannerLabel : styles.contextBannerLabel}>
              {t('discussions.editingReply')}
            </Text>
            <Text
              style={isChat ? chatStyles.contextBannerPreview : styles.contextBannerPreview}
              numberOfLines={2}
            >
              {editingContext.preview}
            </Text>
          </View>
          <Pressable
            onPress={editingContext.onCancel}
            style={isChat ? chatStyles.contextBannerClose : styles.contextBannerClose}
            accessibilityLabel={t('discussions.cancelEdit')}
            accessibilityHint={t('discussions.cancelEdit')}
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={isChat ? 18 : 20}
              color={isChat ? colors.onSurfaceVariant : colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : replyingToContext ? (
        <View style={isChat ? chatStyles.contextBanner : styles.contextBanner}>
          <View style={isChat ? chatStyles.contextBannerContent : styles.contextBannerContent}>
            <Text style={isChat ? chatStyles.contextBannerLabel : styles.contextBannerLabel}>
              {t('discussions.replyingTo')}{' '}
              <Text style={isChat ? chatStyles.contextBannerAuthor : styles.contextBannerAuthor}>
                {replyingToContext.authorName}
              </Text>
            </Text>
            <Text
              style={isChat ? chatStyles.contextBannerPreview : styles.contextBannerPreview}
              numberOfLines={2}
            >
              {replyingToContext.preview}
            </Text>
          </View>
          <Pressable
            onPress={replyingToContext.onCancel}
            style={isChat ? chatStyles.contextBannerClose : styles.contextBannerClose}
            accessibilityLabel={t('discussions.cancelReply')}
            accessibilityHint={t('discussions.cancelReply')}
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={isChat ? 18 : 20}
              color={isChat ? colors.onSurfaceVariant : colors.textSecondary}
            />
          </Pressable>
        </View>
      ) : null}

      {pendingAttachments.length > 0 ? (
        <View style={isChat ? chatStyles.attachedImagesRow : styles.attachedImagesRow}>
          {pendingAttachments.map((att) => (
            <View key={att.id} style={styles.attachedImageWrap}>
              {att.kind === 'audio' ? (
                <View
                  style={isChat ? chatStyles.filePreview : styles.filePreview}
                  accessibilityLabel={t('attachments.voiceMessage')}
                >
                  <Ionicons
                    name="mic-outline"
                    size={22}
                    color={isChat ? colors.onSurfaceVariant : colors.primary}
                  />
                  <Text
                    style={isChat ? chatStyles.filePreviewName : styles.filePreviewName}
                    numberOfLines={1}
                  >
                    {formatDurationLabel(att.durationSec)}
                  </Text>
                  {att.uploading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.previewSpinner}
                    />
                  ) : null}
                </View>
              ) : att.kind === 'file' ? (
                <Pressable
                  style={isChat ? chatStyles.filePreview : styles.filePreview}
                  onPress={() => att.failed && onRetryAttachment?.(att.id)}
                  disabled={!att.failed}
                  accessibilityLabel={att.fileName ?? t('attachments.file')}
                >
                  <Ionicons
                    name={att.failed ? 'refresh-outline' : 'document-text-outline'}
                    size={22}
                    color={
                      att.failed ? colors.error : isChat ? colors.onSurfaceVariant : colors.primary
                    }
                  />
                  <Text
                    style={isChat ? chatStyles.filePreviewName : styles.filePreviewName}
                    numberOfLines={2}
                  >
                    {att.fileName ?? t('attachments.file')}
                  </Text>
                  {att.uploading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      style={styles.previewSpinner}
                    />
                  ) : att.failed ? (
                    <Text style={styles.retryLabel}>{t('attachments.retryUpload')}</Text>
                  ) : null}
                </Pressable>
              ) : att.kind === 'video' && !att.displayUri.trim() ? (
                <Pressable
                  style={[
                    styles.thumbWrap,
                    isChat ? chatStyles.videoPosterPlaceholder : styles.videoPosterPlaceholder,
                  ]}
                  onPress={() => att.failed && onRetryAttachment?.(att.id)}
                  disabled={!att.failed}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={isChat ? 26 : 28}
                    color={isChat ? colors.onSurfaceVariant : colors.textSecondary}
                    accessibilityLabel={t('attachments.videoPreview')}
                  />
                  <View style={styles.playIconOverlay}>
                    <Ionicons name="play-circle" size={28} color={colors.onPrimary} />
                  </View>
                  {att.uploading ? (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : att.failed ? (
                    <View style={styles.uploadingOverlay}>
                      <Ionicons name="refresh-outline" size={22} color={colors.error} />
                    </View>
                  ) : null}
                </Pressable>
              ) : (
                <Pressable
                  style={styles.thumbWrap}
                  onPress={() => att.failed && onRetryAttachment?.(att.id)}
                  disabled={!att.failed}
                >
                  <Image
                    source={{ uri: att.displayUri }}
                    style={isChat ? chatStyles.attachedImage : styles.attachedImage}
                    contentFit="cover"
                    accessibilityLabel={
                      att.kind === 'video' ? t('attachments.videoPreview') : t('attachments.image')
                    }
                  />
                  {att.kind === 'video' ? (
                    <View style={styles.playIconOverlay}>
                      <Ionicons name="play-circle" size={28} color={colors.onPrimary} />
                    </View>
                  ) : null}
                  {att.uploading ? (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : att.failed ? (
                    <View style={styles.uploadingOverlay}>
                      <Ionicons name="refresh-outline" size={22} color={colors.error} />
                    </View>
                  ) : null}
                </Pressable>
              )}
              <Pressable
                style={styles.removeAttachedButton}
                onPress={() => onRemoveAttachment(att.id)}
                accessibilityLabel={t('discussions.removeImage')}
                accessibilityRole="button"
              >
                <Ionicons
                  name="close-circle"
                  size={isChat ? 22 : 24}
                  color={isChat ? colors.onSurfaceVariant : colors.textSecondary}
                />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={isChat ? chatStyles.inputRow : styles.inputRow}>
        <Pressable
          style={isChat ? chatStyles.attachButton : styles.attachButton}
          onPress={onOpenAttachmentMenu}
          disabled={isSending || isUploadingAttachment || atLimit}
          accessibilityLabel={t('attachments.addAttachment')}
          accessibilityHint={
            isUploadingAttachment
              ? t('discussions.uploadingImages')
              : t('attachments.addAttachmentHint')
          }
          accessibilityRole="button"
        >
          {isUploadingAttachment ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="add"
              size={isChat ? 26 : 24}
              color={
                atLimit
                  ? isChat
                    ? colors.outlineVariant
                    : colors.ink300
                  : isChat
                    ? colors.onSurfaceVariant
                    : colors.primary
              }
            />
          )}
        </Pressable>

        <TextInput
          style={isChat ? chatStyles.composeInput : styles.composeInput}
          placeholder={placeholder ?? t('discussions.replyPlaceholder')}
          placeholderTextColor={isChat ? colors.outlineVariant : colors.ink300}
          value={text}
          onChangeText={onChangeText}
          onKeyPress={handleKeyPress}
          multiline
          maxLength={2000}
          editable={!isSending}
          accessibilityLabel={placeholder ?? t('discussions.replyPlaceholder')}
          accessibilityHint={sendLabel ?? t('discussions.postReply')}
        />

        {isChat ? (
          <Pressable
            style={[chatStyles.sendButton, canSend && !isSending && chatStyles.sendButtonActive]}
            onPress={onSend}
            disabled={!canSend || isSending || isUploadingAttachment}
            accessibilityLabel={sendLabel ?? t('discussions.postReply')}
          >
            <Ionicons
              name="send"
              size={18}
              color={canSend && !isSending ? colors.onPrimary : colors.outlineVariant}
            />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.sendButton, (!canSend || isSending) && styles.sendButtonDisabled]}
            onPress={onSend}
            disabled={!canSend || isSending || isUploadingAttachment}
            accessibilityLabel={sendLabel ?? t('discussions.postReply')}
            accessibilityHint={sendLabel ? `Posts your message` : 'Posts your reply'}
          >
            <Ionicons
              name="send"
              size={20}
              color={!canSend || isSending ? colors.ink300 : colors.primary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  contextBannerContent: {
    flex: 1,
    minWidth: 0,
  },
  contextBannerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contextBannerAuthor: {
    ...typography.label,
    color: colors.primary,
  },
  contextBannerPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  contextBannerClose: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },

  attachedImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  attachedImageWrap: {
    position: 'relative',
  },
  thumbWrap: {
    position: 'relative',
  },
  attachedImage: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface100,
  },
  videoPosterPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreview: {
    width: 100,
    minHeight: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface100,
    padding: spacing.xs,
    flexDirection: 'column',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  filePreviewName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 13,
  },
  previewSpinner: {
    marginTop: spacing.xxs,
  },
  retryLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  removeAttachedButton: {
    position: 'absolute',
    top: -6,
    right: -6,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  attachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface100,
    borderRadius: radius.sm,
  },
  composeInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm,
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface100,
    borderRadius: radius.sm,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
});

const chatStyles = StyleSheet.create({
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  contextBannerContent: {
    flex: 1,
    minWidth: 0,
  },
  contextBannerLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  contextBannerAuthor: {
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
    color: colors.primary,
  },
  contextBannerPreview: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  contextBannerClose: {
    padding: spacing.xxs,
    marginLeft: spacing.sm,
  },

  attachedImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  attachedImage: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  videoPosterPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreview: {
    width: 96,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.xs,
    flexDirection: 'column',
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  filePreviewName: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    lineHeight: 13,
    color: colors.onSurface,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeInput: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 22,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    paddingTop: 10,
    minHeight: 40,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
});
