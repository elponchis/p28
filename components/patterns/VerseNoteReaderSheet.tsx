import React from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { PersonalVerseNote } from '@/lib/api';
import { formatVerseNoteDate } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface VerseNoteReaderSheetProps {
  /** The note to read; null keeps the sheet closed. */
  note: PersonalVerseNote | null;
  onRequestClose: () => void;
}

/** Reads back one note from 나의 묵상집 — the day, the verse it was written on, and the words. */
export function VerseNoteReaderSheet({ note, onRequestClose }: VerseNoteReaderSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(!!note);

  return (
    <Modal
      visible={!!note}
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
              <View style={styles.headerText}>
                <Text style={styles.date}>{note ? formatVerseNoteDate(note.noteDate) : ''}</Text>
                <Text style={styles.verseRef}>{note?.verseRef ?? ''}</Text>
              </View>
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
              <Text style={styles.body}>{note?.body ?? ''}</Text>
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
    maxHeight: '80%',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  date: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  verseRef: {
    fontFamily: fontFamily.serif,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  body: {
    ...typography.bodyLg,
    color: colors.onSurface,
    lineHeight: 24,
  },
});
