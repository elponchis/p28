import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { MessageAttachment } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography, fontFamily } from '@/theme/tokens';

import type { MessageLike } from './types';

export function messageLikeToAttachments(post: MessageLike): MessageAttachment[] {
  if (post.attachments?.length) return post.attachments;
  const urls = post.imageUrls ?? [];
  return urls.map((url) => ({ kind: 'image' as const, url }));
}

export interface MessageAttachmentsBlockProps {
  post: MessageLike;
  isOwnMessage: boolean;
  onImagePress?: (url: string) => void;
  onVideoPress?: (att: MessageAttachment) => void;
  onFilePress?: (att: MessageAttachment) => void;
}

function fileExtension(fileName?: string, url?: string): string {
  const fromName = fileName?.includes('.') ? fileName.split('.').pop() : undefined;
  if (fromName) return fromName.toUpperCase().slice(0, 8);
  const fromUrl = url?.split('?')[0]?.split('.').pop();
  return fromUrl ? fromUrl.toUpperCase().slice(0, 8) : 'FILE';
}

export function MessageAttachmentsBlock({
  post,
  isOwnMessage,
  onImagePress,
  onVideoPress,
  onFilePress,
}: MessageAttachmentsBlockProps) {
  const attachments = messageLikeToAttachments(post);
  if (attachments.length === 0) return null;

  const labelColor = isOwnMessage ? styles.fileLabelOwn : styles.fileLabelOther;
  const subColor = isOwnMessage ? styles.fileSubOwn : styles.fileSubOther;

  return (
    <View style={styles.row}>
      {attachments.map((att, idx) => {
        const key = `${att.kind}-${att.url}-${idx}`;
        if (att.kind === 'image') {
          return (
            <Pressable
              key={key}
              onPress={() => onImagePress?.(att.url)}
              style={styles.imagePressable}
              accessibilityLabel={`${t('attachments.viewImage')} ${idx + 1}`}
              accessibilityRole="button"
            >
              <Image source={{ uri: att.url }} style={styles.messageImage} contentFit="cover" />
            </Pressable>
          );
        }
        if (att.kind === 'video') {
          const thumb = att.thumbnailUrl?.trim();
          return (
            <Pressable
              key={key}
              onPress={() => onVideoPress?.(att)}
              style={styles.imagePressable}
              accessibilityLabel={t('attachments.playVideo')}
              accessibilityHint={t('attachments.playVideoHint')}
              accessibilityRole="button"
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.messageImage} contentFit="cover" />
              ) : (
                <View style={[styles.messageImage, styles.videoPosterFallback]}>
                  <Ionicons name="videocam-outline" size={36} color={colors.onSurfaceVariant} />
                </View>
              )}
              <View style={styles.playOverlay}>
                <Ionicons name="play-circle" size={44} color={colors.onPrimary} />
              </View>
            </Pressable>
          );
        }
        const ext = fileExtension(att.fileName, att.url);
        const name = att.fileName?.trim() || t('attachments.file');
        return (
          <Pressable
            key={key}
            onPress={() => onFilePress?.(att)}
            style={[styles.fileCard, isOwnMessage ? styles.fileCardOwn : styles.fileCardOther]}
            accessibilityLabel={t('attachments.openFile')}
            accessibilityHint={name}
            accessibilityRole="button"
          >
            <Ionicons
              name="document-text-outline"
              size={22}
              color={isOwnMessage ? colors.onPrimary : colors.primary}
            />
            <View style={styles.fileTextCol}>
              <Text style={[styles.fileName, labelColor]} numberOfLines={2}>
                {name}
              </Text>
              <Text style={[styles.fileExt, subColor]}>{ext}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignItems: 'flex-start',
  },
  imagePressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  messageImage: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
  },
  videoPosterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 220,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  fileCardOther: {
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  fileCardOwn: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  fileLabelOther: {
    color: colors.onSurface,
  },
  fileLabelOwn: {
    color: colors.onPrimary,
  },
  fileExt: {
    ...typography.caption,
    marginTop: 2,
  },
  fileSubOther: {
    color: colors.onSurfaceVariant,
  },
  fileSubOwn: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
