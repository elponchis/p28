import React from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { GlobalAnnouncement } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface GlobalAnnouncementReaderSheetProps {
  /** The announcement to read; null keeps the sheet closed. */
  announcement: GlobalAnnouncement | null;
  onRequestClose: () => void;
}

/** The whole of a platform-wide announcement, which the card only shows a line of. */
export function GlobalAnnouncementReaderSheet({
  announcement,
  onRequestClose,
}: GlobalAnnouncementReaderSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(!!announcement);

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
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetSlideAnim }] }]}>
          <View style={[styles.sheetInner, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.handle} />
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  sheetInner: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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
