import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FileAttachmentModal, VideoAttachmentModal } from '@/components/messages';
import { useAuth } from '@/hooks/useAuth';
import { useChatSharedContentQuery } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import type { ChatSharedContentMessage, MessageAttachment } from '@/lib/api';
import { extractUrlsFromText } from '@/lib/extractUrlsFromText';
import { getMediaViewerSize } from '@/lib/mediaViewerBounds';
import { t } from '@/lib/i18n';
import { notify } from '@/lib/dialogs';
import { downloadFileInBrowser } from '@/lib/downloadFile';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

/** Roughly the size a thumbnail wants to be: big enough to recognise, small enough to scan. */
const TARGET_CELL_PX = 150;
/** The grid stops widening here; past this the window buys more columns, not bigger cells. */
const MAX_GRID_PX = 900;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 6;

type MediaGridItem = {
  key: string;
  messageId: string;
  createdAt: string;
  attachment: MessageAttachment;
};

type FileListItem = {
  key: string;
  messageId: string;
  createdAt: string;
  attachment: MessageAttachment;
};

function hostnameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

export default function ChatMediaAndLinksScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const insets = useSafeAreaInsets();

  const {
    data: rowsData,
    isPending,
    isError,
    error,
  } = useChatSharedContentQuery(id, {
    userId,
  });
  const rows: ChatSharedContentMessage[] = useMemo(() => rowsData ?? [], [rowsData]);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<{
    url: string;
    fileName?: string;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    fileName: string;
    mimeType?: string;
  } | null>(null);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  /**
   * A thumbnail grid, sized by how many cells fit rather than by a fixed column count.
   *
   * Two columns of half the window is fine on a phone and absurd on a desktop browser, where
   * it made every photo about 780px wide -- a gallery you scroll past one image at a time. The
   * column count now grows with the window so a cell stays near TARGET_CELL_PX, and the grid
   * itself stops widening past MAX_GRID_PX so an ultra-wide monitor gets more columns rather
   * than a row of billboards.
   */
  const { cellW, gap, columns } = useMemo(() => {
    const g = spacing.sm;
    const available = Math.max(0, Math.min(windowWidth, MAX_GRID_PX) - spacing.md * 2);
    const fits = Math.floor((available + g) / (TARGET_CELL_PX + g));
    const cols = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, fits));
    return { cellW: (available - g * (cols - 1)) / cols, gap: g, columns: cols };
  }, [windowWidth]);

  const mediaItems = useMemo(() => {
    const items: MediaGridItem[] = [];
    for (const row of rows) {
      const atts = row.attachments ?? [];
      for (let i = 0; i < atts.length; i++) {
        const a = atts[i];
        if (a.kind === 'image' || a.kind === 'video') {
          items.push({
            key: `${row.id}-${i}-${a.kind}`,
            messageId: row.id,
            createdAt: row.createdAt,
            attachment: a,
          });
        }
      }
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return items;
  }, [rows]);

  const linkItems = useMemo(() => {
    const items: { key: string; url: string; messageId: string; createdAt: string }[] = [];
    for (const row of rows) {
      const urls = extractUrlsFromText(row.body);
      urls.forEach((url, i) => {
        items.push({
          key: `${row.id}-link-${i}`,
          url,
          messageId: row.id,
          createdAt: row.createdAt,
        });
      });
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return items;
  }, [rows]);

  const fileItems = useMemo(() => {
    const items: FileListItem[] = [];
    for (const row of rows) {
      const atts = row.attachments ?? [];
      for (let i = 0; i < atts.length; i++) {
        const a = atts[i];
        if (a.kind === 'file') {
          items.push({
            key: `${row.id}-file-${i}`,
            messageId: row.id,
            createdAt: row.createdAt,
            attachment: a,
          });
        }
      }
    }
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return items;
  }, [rows]);

  const openChatToMessage = useCallback(
    (messageId: string) => {
      if (!id) return;
      router.push(
        `/messages/chat/${encodeURIComponent(id)}?focusMessageId=${encodeURIComponent(messageId)}`
      );
    },
    [id, router]
  );

  const handleDownloadImage = useCallback(async () => {
    if (!previewImageUrl || isDownloadingImage) return;
    setIsDownloadingImage(true);
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
          message: t('discussions.downloadPermissionDenied'),
        });
        return;
      }
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.downloadAsync(previewImageUrl, localUri);
      await MediaLibrary.createAssetAsync(localUri);
      setPreviewImageUrl(null);
      void notify({
        title: t('discussions.downloadSuccess'),
        message: t('discussions.downloadSuccessMessage'),
      });
    } catch (err) {
      const msg =
        err && typeof err === 'object' && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : t('discussions.downloadError');
      void notify({
        title: t('common.error'),
        message: msg,
      });
    } finally {
      setIsDownloadingImage(false);
    }
  }, [previewImageUrl, isDownloadingImage]);

  const mediaRows = useMemo(() => {
    const out: MediaGridItem[][] = [];
    for (let i = 0; i < mediaItems.length; i += columns) {
      out.push(mediaItems.slice(i, i + columns));
    }
    return out;
  }, [mediaItems, columns]);

  useEffect(() => {
    if (!id) router.back();
  }, [id, router]);

  if (!id) {
    return null;
  }

  if (isPending && rowsData === undefined) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>
          {error && 'message' in error ? getUserFacingError(error) : t('common.error')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: spacing.xl + insets.bottom, paddingTop: spacing.sm },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>{t('messages.sectionPhotosAndVideos')}</Text>
      {mediaItems.length === 0 ? (
        <Text style={styles.empty}>{t('messages.emptyPhotosAndVideos')}</Text>
      ) : (
        <View style={styles.gridWrap}>
          {mediaRows.map((row, ri) => (
            <View key={`row-${ri}`} style={[styles.gridRow, { gap }]}>
              {row.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.cell, { width: cellW, height: cellW }]}
                  onPress={() => {
                    if (item.attachment.kind === 'image') {
                      setPreviewImageUrl(item.attachment.url);
                    } else {
                      setPreviewVideo({
                        url: item.attachment.url,
                        fileName: item.attachment.fileName,
                      });
                    }
                  }}
                  accessibilityLabel={
                    item.attachment.kind === 'image'
                      ? t('attachments.viewImage')
                      : t('attachments.playVideo')
                  }
                  accessibilityRole="button"
                >
                  {item.attachment.kind === 'image' ? (
                    <Image
                      source={{ uri: item.attachment.url }}
                      style={styles.cellImage}
                      contentFit="cover"
                    />
                  ) : (
                    <>
                      {item.attachment.thumbnailUrl ? (
                        <Image
                          source={{ uri: item.attachment.thumbnailUrl }}
                          style={styles.cellImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.cellImage, styles.videoFallback]}>
                          <Ionicons
                            name="videocam-outline"
                            size={32}
                            color={colors.onSurfaceVariant}
                          />
                        </View>
                      )}
                      <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={40} color={colors.onPrimary} />
                      </View>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacer]}>{t('messages.sectionLinks')}</Text>
      {linkItems.length === 0 ? (
        <Text style={styles.empty}>{t('messages.emptyLinks')}</Text>
      ) : (
        linkItems.map((item) => (
          <Pressable
            key={item.key}
            style={styles.linkRow}
            onPress={() => openChatToMessage(item.messageId)}
            accessibilityLabel={hostnameFromUrl(item.url)}
            accessibilityHint={t('messages.linkGoToMessageHint')}
            accessibilityRole="button"
          >
            <Ionicons name="link-outline" size={20} color={colors.primary} />
            <View style={styles.linkTextCol}>
              <Text style={styles.linkHost} numberOfLines={1}>
                {hostnameFromUrl(item.url)}
              </Text>
              <Text style={styles.linkUrl} numberOfLines={2}>
                {item.url}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        ))
      )}

      <Text style={[styles.sectionTitle, styles.sectionSpacer]}>{t('messages.sectionFiles')}</Text>
      {fileItems.length === 0 ? (
        <Text style={styles.empty}>{t('messages.emptyFiles')}</Text>
      ) : (
        fileItems.map((item) => (
          <Pressable
            key={item.key}
            style={styles.fileRow}
            onPress={() =>
              setPreviewFile({
                url: item.attachment.url,
                fileName: item.attachment.fileName?.trim() || t('attachments.file'),
                mimeType: item.attachment.mimeType,
              })
            }
            accessibilityLabel={item.attachment.fileName ?? t('attachments.file')}
            accessibilityHint={t('attachments.openFile')}
            accessibilityRole="button"
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text style={styles.fileName} numberOfLines={2}>
              {item.attachment.fileName?.trim() || t('attachments.file')}
            </Text>
          </Pressable>
        ))
      )}

      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <Pressable
          style={styles.imageOverlay}
          onPress={() => setPreviewImageUrl(null)}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          {previewImageUrl ? (
            <>
              <Image
                source={{ uri: previewImageUrl }}
                // Same theater box the chat screen's viewer uses: full-bleed on a phone,
                // a centered bound past the desktop breakpoint rather than a wall of image.
                style={[styles.imageFull, getMediaViewerSize(windowWidth, windowHeight)]}
                contentFit="contain"
              />
              <Pressable
                style={[styles.imageDlBtn, { top: spacing.md + insets.top }]}
                onPress={(e) => {
                  e.stopPropagation();
                  void handleDownloadImage();
                }}
                disabled={isDownloadingImage}
                accessibilityLabel={t('discussions.downloadImage')}
                accessibilityRole="button"
              >
                {isDownloadingImage ? (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  sectionSpacer: {
    marginTop: spacing.lg,
  },
  empty: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  gridWrap: {
    marginBottom: spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  cell: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
  videoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  linkTextCol: {
    flex: 1,
    minWidth: 0,
  },
  linkHost: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  linkUrl: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  fileName: {
    flex: 1,
    ...typography.body,
    color: colors.onSurface,
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  imageFull: {},
  imageDlBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});
