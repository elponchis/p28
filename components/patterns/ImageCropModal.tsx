import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import { cropImageRegion, getImageSize, type CroppedImage } from '@/lib/cropImage';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export interface ImageCropModalProps {
  visible: boolean;
  /** Image to crop. Nothing renders until this is set. */
  sourceUri: string | null;
  /** Target width / height, e.g. 1 for an avatar or 16/9 for a banner. */
  aspect: number;
  /** Circular mask, for avatars. */
  circular?: boolean;
  onCancel: () => void;
  onConfirm: (cropped: CroppedImage) => void;
}

/**
 * Lets someone choose which part of an image survives the crop.
 *
 * Native pickers already do this — `allowsEditing` opens the OS crop UI — but
 * expo-image-picker's web build supports neither that nor `aspect`, so on web the
 * choice was made for the uploader: a centre crop, with a face near the top edge
 * as likely to be cut as kept. Drag to move, zoom to fill.
 *
 * Web only, since it works by drawing to a canvas; callers should not open it on
 * native, where the OS already asked.
 */
export function ImageCropModal({
  visible,
  sourceUri,
  aspect,
  circular,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const frameWidth = Math.min(320, Math.max(200, windowWidth - spacing.lg * 4));
  const frameHeight = frameWidth / aspect;

  const [source, setSource] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // PanResponder closes over state, so the gesture reads these instead.
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const gestureStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible || !sourceUri) return;
    let cancelled = false;
    setSource(null);
    setFailed(false);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    void getImageSize(sourceUri).then((size) => {
      if (cancelled) return;
      if (!size) setFailed(true);
      else setSource(size);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, sourceUri]);

  // Scale that makes the image just cover the frame; zoom multiplies it.
  const baseScale = useMemo(() => {
    if (!source) return 1;
    return Math.max(frameWidth / source.width, frameHeight / source.height);
  }, [source, frameWidth, frameHeight]);

  const displayed = useMemo(() => {
    if (!source) return { width: frameWidth, height: frameHeight };
    return {
      width: source.width * baseScale * zoom,
      height: source.height * baseScale * zoom,
    };
  }, [source, baseScale, zoom, frameWidth, frameHeight]);

  // Never let the frame show past the edge of the image.
  const clamp = useCallback(
    (next: { x: number; y: number }) => {
      const maxX = Math.max(0, (displayed.width - frameWidth) / 2);
      const maxY = Math.max(0, (displayed.height - frameHeight) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [displayed, frameWidth, frameHeight]
  );

  useEffect(() => {
    setOffset((prev) => clamp(prev));
  }, [clamp]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureStart.current = offsetRef.current;
        },
        onPanResponderMove: (_evt, gesture) => {
          setOffset(
            clamp({
              x: gestureStart.current.x + gesture.dx,
              y: gestureStart.current.y + gesture.dy,
            })
          );
        },
      }),
    [clamp]
  );

  const handleConfirm = useCallback(async () => {
    if (!sourceUri || !source || busy) return;
    setBusy(true);
    try {
      const effective = baseScale * zoom;
      // Frame in source pixels, centred on wherever the drag left it.
      const sw = frameWidth / effective;
      const sh = frameHeight / effective;
      const centerX = source.width / 2 - offset.x / effective;
      const centerY = source.height / 2 - offset.y / effective;
      const cropped = await cropImageRegion(sourceUri, {
        sx: centerX - sw / 2,
        sy: centerY - sh / 2,
        sw,
        sh,
      });
      if (cropped) onConfirm(cropped);
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [sourceUri, source, busy, baseScale, zoom, frameWidth, frameHeight, offset, onConfirm]);

  return (
    <Modal
      visible={visible && !!sourceUri}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('profile.cropTitle')}</Text>

          <View
            style={[
              styles.frame,
              { width: frameWidth, height: frameHeight },
              circular && { borderRadius: frameWidth / 2 },
            ]}
            {...panResponder.panHandlers}
          >
            {sourceUri && source ? (
              <Image
                source={{ uri: sourceUri }}
                style={{
                  width: displayed.width,
                  height: displayed.height,
                  transform: [{ translateX: offset.x }, { translateY: offset.y }],
                }}
                resizeMode="cover"
              />
            ) : failed ? (
              <Text style={styles.failedText}>{t('profile.cropUnavailable')}</Text>
            ) : (
              <ActivityIndicator color={colors.onPrimary} />
            )}
          </View>

          <Text style={styles.hint}>{t('profile.cropHint')}</Text>

          <View style={styles.zoomRow}>
            <Pressable
              onPress={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              style={[styles.zoomButton, zoom <= MIN_ZOOM && styles.zoomButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.cropZoomOut')}
            >
              <Ionicons name="remove" size={22} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.zoomLabel}>{`${Math.round(zoom * 100)}%`}</Text>
            <Pressable
              onPress={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              style={[styles.zoomButton, zoom >= MAX_ZOOM && styles.zoomButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.cropZoomIn')}
            >
              <Ionicons name="add" size={22} color={colors.onSurface} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={onCancel}
              disabled={busy}
              fullWidth
              accessibilityLabel={t('common.cancel')}
            />
            <Button
              title={busy ? t('common.loading') : t('common.done')}
              onPress={handleConfirm}
              disabled={busy || !source}
              fullWidth
              accessibilityLabel={t('common.done')}
              accessibilityHint={t('profile.cropConfirmHint')}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  frame: {
    overflow: 'hidden',
    backgroundColor: '#000',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedText: {
    ...typography.caption,
    color: colors.onPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHighest,
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomLabel: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    minWidth: 48,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
});
