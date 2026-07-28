import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 4000;

export interface GlobalAnnouncementFormSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  onSubmit: (payload: { title: string; description: string }) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export function GlobalAnnouncementFormSheet({
  visible,
  onRequestClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}: GlobalAnnouncementFormSheetProps) {
  const insets = useSafeAreaInsets();
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDescription('');
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle || !trimmedDesc) return;
    onSubmit({ title: trimmedTitle, description: trimmedDesc });
  }, [title, description, onSubmit]);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

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
              <Text style={styles.sheetTitle}>{t('home.globalAnnouncementSheetTitle')}</Text>
              <Pressable
                onPress={onRequestClose}
                hitSlop={12}
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={26} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom:
                    spacing.majorSectionGap * 2 +
                    spacing.xl +
                    Math.max(insets.bottom, Platform.OS === 'ios' ? spacing.xxl : spacing.xl),
                },
              ]}
            >
              <Text style={styles.label}>{t('home.globalAnnouncementTitleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('home.globalAnnouncementTitlePlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                maxLength={TITLE_MAX}
                accessibilityLabel={t('home.globalAnnouncementTitleLabel')}
                accessibilityHint={t('home.globalAnnouncementTitlePlaceholder')}
              />

              <Text style={styles.label}>{t('home.globalAnnouncementDescriptionLabel')}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('home.globalAnnouncementDescriptionPlaceholder')}
                placeholderTextColor={colors.onSurfaceVariant}
                multiline
                textAlignVertical="top"
                maxLength={DESCRIPTION_MAX}
                accessibilityLabel={t('home.globalAnnouncementDescriptionLabel')}
                accessibilityHint={t('home.globalAnnouncementDescriptionPlaceholder')}
              />

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Button
                title={t('home.globalAnnouncementPublish')}
                onPress={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                accessibilityLabel={t('home.globalAnnouncementPublish')}
                accessibilityHint={t('home.globalAnnouncementPublishHint')}
              />
              {isSubmitting ? (
                <ActivityIndicator style={styles.spinner} color={colors.primary} />
              ) : null}
            </ScrollView>
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
    backgroundColor: 'rgba(28, 28, 28, 0.3)',
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  sheetInner: {
    paddingHorizontal: spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    color: colors.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  scrollContent: {
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceContainerLow,
  },
  inputMultiline: {
    minHeight: 120,
    paddingTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginVertical: spacing.sm,
  },
  spinner: {
    marginTop: spacing.md,
  },
});
