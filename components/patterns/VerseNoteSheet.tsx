import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/primitives';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import { useSavePersonalVerseNoteMutation } from '@/hooks/useApiQueries';
import type { DailyVerse } from '@/lib/api';
import { isApiError } from '@/lib/api';
import { VERSE_ATTRIBUTION } from '@/lib/dailyVerse';
import { getUserFacingError } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

const BODY_MAX = 2000;

export interface VerseNoteSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  userId: string;
  /** The verse being written about; its reference is stored with the note. */
  verse: DailyVerse | null;
  /** Seoul day the note belongs to. */
  noteDate: string;
  existingBody: string;
}

/** Writes the reader's private note on today's verse. Saving replaces the day's note. */
export function VerseNoteSheet({
  visible,
  onRequestClose,
  userId,
  verse,
  noteDate,
  existingBody,
}: VerseNoteSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useSavePersonalVerseNoteMutation();

  useEffect(() => {
    if (!visible) return;
    setBody(existingBody);
    setError(null);
    // Opening is what loads the note; typing in it should not reset the field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSave = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError(t('home.noteEmptyError'));
      return;
    }
    if (!verse) return;
    try {
      await save.mutateAsync({
        userId,
        input: { noteDate, verseRef: verse.reference, body: trimmed },
      });
      onRequestClose();
    } catch (e) {
      setError(e != null && isApiError(e) ? getUserFacingError(e) : t('common.error'));
    }
  }, [body, verse, save, userId, noteDate, onRequestClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
            pointerEvents="none"
          />
        </Pressable>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetSlideAnim }] }]}>
          <View style={styles.sheetInner}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.sheetTitle}>{t('home.noteSheetTitle')}</Text>
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
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {verse ? (
                <View style={styles.verseBlock}>
                  <Text style={styles.versePassage}>{`“${verse.passage}”`}</Text>
                  <Text style={styles.verseRef}>{`— ${verse.reference}`}</Text>
                  <Text style={styles.verseSource}>{VERSE_ATTRIBUTION}</Text>
                </View>
              ) : null}

              <TextInput
                style={styles.input}
                value={body}
                onChangeText={(v) => {
                  setBody(v);
                  if (error) setError(null);
                }}
                placeholder={t('home.notePlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                textAlignVertical="top"
                maxLength={BODY_MAX}
                accessibilityLabel={t('home.notePlaceholder')}
              />
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(
                    insets.bottom,
                    Platform.OS === 'ios' ? spacing.xxl : spacing.xl
                  ),
                },
              ]}
            >
              {error ? (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}
              <Button
                title={t('home.noteSave')}
                onPress={() => void handleSave()}
                disabled={save.isPending || !verse}
                accessibilityLabel={t('home.noteSave')}
                accessibilityHint={t('home.noteSaveHint')}
              />
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
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
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  verseBlock: {
    gap: spacing.xxs,
  },
  versePassage: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    lineHeight: 30,
    color: colors.onSurface,
  },
  verseRef: {
    fontFamily: fontFamily.serif,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  verseSource: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  input: {
    ...typography.bodyLg,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 140,
  },
  footer: {
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
  },
});
