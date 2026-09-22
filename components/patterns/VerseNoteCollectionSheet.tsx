import React, { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { PersonalVerseNote } from '@/lib/api';
import { formatVerseNoteDate } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export interface VerseNoteCollectionSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  /** Newest first. */
  notes: PersonalVerseNote[];
}

/**
 * 나의 묵상집 — every note the reader has written, a day and a verse per line. Picking one opens
 * it in place, so the list and the note it came from never lose each other.
 */
export function VerseNoteCollectionSheet({
  visible,
  onRequestClose,
  notes,
}: VerseNoteCollectionSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);
  const [open, setOpen] = useState<PersonalVerseNote | null>(null);

  useEffect(() => {
    if (!visible) setOpen(null);
  }, [visible]);

  return (
    <Modal
      visible={visible}
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
              {open ? (
                <Pressable
                  onPress={() => setOpen(null)}
                  hitSlop={12}
                  accessibilityLabel={t('home.noteCollection')}
                  accessibilityRole="button"
                >
                  <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
                </Pressable>
              ) : null}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>
                  {open ? formatVerseNoteDate(open.noteDate) : t('home.noteCollection')}
                </Text>
                {open ? <Text style={styles.headerVerse}>{open.verseRef}</Text> : null}
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
              {open ? (
                <Text style={styles.body}>{open.body}</Text>
              ) : notes.length === 0 ? (
                <Text style={styles.empty}>{t('home.noteCollectionEmpty')}</Text>
              ) : (
                notes.map((note) => (
                  <Pressable
                    key={note.id}
                    onPress={() => setOpen(note)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatVerseNoteDate(note.noteDate)} ${note.verseRef}`}
                    accessibilityHint={t('home.noteOpenHint')}
                  >
                    <Text style={styles.rowDate}>{formatVerseNoteDate(note.noteDate)}</Text>
                    <Text style={styles.rowRef} numberOfLines={1}>
                      {note.verseRef}
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.onSurfaceVariant} />
                  </Pressable>
                ))
              )}
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
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  headerVerse: {
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  rowDate: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    color: colors.onSurface,
  },
  rowRef: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    ...typography.bodyLg,
    color: colors.onSurface,
    lineHeight: 24,
  },
  empty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
