import React from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { GlobalAnnouncement } from '@/lib/api';
import { t } from '@/lib/i18n';
import { cardBase, colors, fontFamily, spacing, typography } from '@/theme/tokens';

export interface GlobalAnnouncementReaderSheetProps {
  /** The announcement to read; null keeps the sheet closed. */
  announcement: GlobalAnnouncement | null;
  onRequestClose: () => void;
}

/**
 * The whole of a platform-wide announcement, which the card only shows a line of.
 *
 * A dialog in the middle rather than a sheet from the bottom: on a desktop window the sheet
 * arrived at the far edge of a tall screen, so reading a few lines meant looking away from where
 * the card was.
 */
export function GlobalAnnouncementReaderSheet({
  announcement,
  onRequestClose,
}: GlobalAnnouncementReaderSheetProps) {
  const { sheetFadeAnim } = useFadeSheetAnimation(!!announcement);

  return (
    <Modal
      visible={!!announcement}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
            pointerEvents="none"
          />
        </Pressable>
        <Animated.View style={[styles.dialog, { opacity: sheetFadeAnim }]}>
          <View>
            <View style={styles.headerRow}>
              <Text style={styles.eyebrow}>{t('home.globalAnnouncementLabel')}</Text>
              <Pressable
                onPress={onRequestClose}
                hitSlop={12}
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={26} color={colors.onSurface} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.title}>{announcement?.title ?? ''}</Text>
              <Text style={styles.description}>{announcement?.description ?? ''}</Text>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenHorizontal,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dialog: {
    ...cardBase,
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.secondary,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 19,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
  },
});
