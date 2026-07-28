import * as FileSystem from 'expo-file-system/legacy';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

function fileExtensionLabel(fileName: string): string {
  if (!fileName.includes('.')) return '';
  return fileName.split('.').pop()?.toUpperCase() ?? '';
}

/** Remote progressive files (e.g. Supabase public URLs) need an explicit content type on iOS. */
function videoSourceFromUrl(url: string): VideoSource {
  return /^https?:\/\//i.test(url) ? { uri: url, contentType: 'progressive' } : url;
}

function VideoModalInner({
  videoUrl,
  suggestedFileName,
  onClose,
}: {
  videoUrl: string;
  suggestedFileName?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const player = useVideoPlayer(videoSourceFromUrl(videoUrl), (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        /* ignore */
      }
    };
  }, [player]);

  const handleDownload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const fromUrl = videoUrl.match(/\.(mp4|mov|webm)(\?|$)/i)?.[1]?.toLowerCase();
      const ext = suggestedFileName?.includes('.')
        ? suggestedFileName.split('.').pop()
        : (fromUrl ?? 'mp4');
      const localUri = `${FileSystem.cacheDirectory}video-share-${Date.now()}.${ext ?? 'mp4'}`;
      await FileSystem.downloadAsync(videoUrl, localUri);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert(t('common.error'), t('attachments.shareUnavailable'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), msg);
    } finally {
      setBusy(false);
    }
  }, [videoUrl, busy, suggestedFileName]);

  return (
    <View style={videoStyles.wrap}>
      <Pressable
        onPress={onClose}
        style={[videoStyles.closeBtn, { top: spacing.md + insets.top }]}
        accessibilityLabel={t('common.back')}
        accessibilityRole="button"
        hitSlop={12}
      >
        <Ionicons name="close" size={28} color={colors.onPrimary} />
      </Pressable>
      <Pressable
        onPress={handleDownload}
        disabled={busy}
        style={[videoStyles.downloadBtn, { top: spacing.md + insets.top }]}
        accessibilityLabel={t('attachments.downloadVideo')}
        accessibilityHint={t('attachments.downloadVideoHint')}
        accessibilityRole="button"
        hitSlop={12}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Ionicons name="download-outline" size={26} color={colors.onPrimary} />
        )}
      </Pressable>
      <VideoView player={player} style={videoStyles.video} nativeControls contentFit="contain" />
    </View>
  );
}

const videoStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 2,
    padding: spacing.xs,
  },
  downloadBtn: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 2,
    padding: spacing.xs,
  },
});

export interface VideoAttachmentModalProps {
  visible: boolean;
  videoUrl: string | null;
  /** Optional name hint for the shared/downloaded file extension. */
  suggestedFileName?: string;
  onRequestClose: () => void;
}

export function VideoAttachmentModal({
  visible,
  videoUrl,
  suggestedFileName,
  onRequestClose,
}: VideoAttachmentModalProps) {
  return (
    <Modal
      visible={visible && !!videoUrl}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onRequestClose}
    >
      {videoUrl ? (
        <VideoModalInner
          key={videoUrl}
          videoUrl={videoUrl}
          suggestedFileName={suggestedFileName}
          onClose={onRequestClose}
        />
      ) : null}
    </Modal>
  );
}

export interface FileAttachmentModalProps {
  visible: boolean;
  fileUrl: string | null;
  fileName: string;
  mimeType?: string;
  onRequestClose: () => void;
}

export function FileAttachmentModal({
  visible,
  fileUrl,
  fileName,
  mimeType,
  onRequestClose,
}: FileAttachmentModalProps) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const ext = fileExtensionLabel(fileName);

  const handleDownload = useCallback(async () => {
    if (!fileUrl || busy) return;
    setBusy(true);
    try {
      const safeExt = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
      const localUri = `${FileSystem.cacheDirectory}share-${Date.now()}.${safeExt ?? 'bin'}`;
      await FileSystem.downloadAsync(fileUrl, localUri);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert(t('common.error'), t('attachments.shareUnavailable'));
      }
      onRequestClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.error');
      Alert.alert(t('common.error'), msg);
    } finally {
      setBusy(false);
    }
  }, [fileUrl, busy, fileName, onRequestClose]);

  return (
    <Modal
      visible={visible && !!fileUrl}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <Pressable style={fileStyles.overlay} onPress={onRequestClose} accessibilityRole="button">
        <Pressable
          style={[fileStyles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={fileStyles.header}>
            <Text style={fileStyles.title} numberOfLines={2}>
              {fileName}
            </Text>
            <Pressable
              onPress={onRequestClose}
              accessibilityLabel={t('common.back')}
              accessibilityRole="button"
              hitSlop={10}
            >
              <Ionicons name="close" size={26} color={colors.onSurface} />
            </Pressable>
          </View>
          {ext ? <Text style={fileStyles.ext}>{ext}</Text> : null}
          {mimeType ? (
            <Text style={fileStyles.mime} numberOfLines={1}>
              {mimeType}
            </Text>
          ) : null}
          <Pressable
            style={[fileStyles.downloadBtn, busy && fileStyles.downloadBtnDisabled]}
            onPress={handleDownload}
            disabled={busy}
            accessibilityLabel={t('attachments.download')}
            accessibilityHint={t('attachments.downloadHint')}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="download-outline" size={22} color={colors.onPrimary} />
                <Text style={fileStyles.downloadLabel}>{t('attachments.download')}</Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fileStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  ext: {
    ...typography.label,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  mime: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  downloadBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  downloadBtnDisabled: {
    opacity: 0.7,
  },
  downloadLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    color: colors.onPrimary,
  },
});
