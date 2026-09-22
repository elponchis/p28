import React, { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import type { PersonalVerseNote } from '@/lib/api';
import { formatVerseNoteDate } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

/** A day in the list, fixed so five of them make a predictable window. */
const ROW_HEIGHT = 46;
const VISIBLE_ROWS = 5;

/** react-native-web turns  into data-* attributes; React Native's types omit it. */
const alwaysShowScrollbar = { dataSet: { scroll: 'always' } } as unknown as ScrollViewProps;

export interface VerseNoteCollectionSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  /** Newest first. */
  notes: PersonalVerseNote[];
}

/**
 * 나의 묵상기록 — every note the reader has written, opened in the middle of the screen like a
 * journal rather than sliding up from the bottom. Picking a day turns to that page; the arrow
 * turns back.
 */
export function VerseNoteCollectionSheet({
  visible,
  onRequestClose,
  notes,
}: VerseNoteCollectionSheetProps) {
  const { sheetFadeAnim } = useFadeSheetAnimation(visible);
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

        <Animated.View style={[styles.dialog, { opacity: sheetFadeAnim }]}>
          <View style={styles.header}>
            {open ? (
              <Pressable
                onPress={() => setOpen(null)}
                hitSlop={12}
                accessibilityLabel={t('home.noteCollection')}
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            ) : null}
            <Text style={styles.headerTitle}>{t('home.noteCollection')}</Text>
            <Pressable
              onPress={onRequestClose}
              hitSlop={12}
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView
            style={[styles.scroll, open ? null : styles.scrollList]}
            showsVerticalScrollIndicator
            // Keeps the bar beside the list on web instead of only while scrolling.
            {...alwaysShowScrollbar}
            contentContainerStyle={styles.scrollContent}
          >
            {open ? (
              // One page of the journal: the day, what it was written on, and the words.
              <View style={styles.page}>
                <Text style={styles.pageDate}>{formatVerseNoteDate(open.noteDate)}</Text>
                <Text style={styles.pageVerse}>{open.verseRef}</Text>
                <View style={styles.pageRule} />
                <Text style={styles.pageBody}>{open.body}</Text>
              </View>
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
  /** A page held in the middle of the screen, not a drawer pulled up from the edge. */
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.serif,
    fontSize: 19,
    color: colors.onSurface,
  },
  scroll: {
    flexGrow: 0,
  },
  /** Five days at a time; the rest are a scroll away rather than a longer window. */
  scrollList: {
    maxHeight: ROW_HEIGHT * VISIBLE_ROWS,
  },
  scrollContent: {
    paddingBottom: spacing.xs,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  rowDate: {
    fontFamily: fontFamily.serif,
    fontSize: 15,
    color: colors.onSurface,
  },
  rowRef: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.sans,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  pressed: {
    opacity: 0.7,
  },
  page: {
    gap: spacing.xxs,
  },
  pageDate: {
    fontFamily: fontFamily.serifBold,
    fontSize: 21,
    color: colors.onSurface,
  },
  pageVerse: {
    fontFamily: fontFamily.serif,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  pageRule: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  pageBody: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    lineHeight: 28,
    color: colors.onSurface,
  },
  empty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.md,
  },
});
