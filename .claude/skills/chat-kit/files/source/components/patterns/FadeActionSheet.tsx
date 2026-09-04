import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface FadeActionSheetOption {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/** Use with sheets that open ImagePicker / DocumentPicker — RN Modal must finish dismissing first. */
export const FADE_SHEET_PICKER_DEFER_MS = Platform.OS === 'ios' ? 420 : 280;

export interface FadeActionSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  options: FadeActionSheetOption[];
  /**
   * Milliseconds to wait after close before invoking option `onPress`.
   * Native pickers often fail silently if the sheet modal is still dismissing; `InteractionManager` is unreliable here because sheet close uses native-driver animations.
   */
  deferOptionPressMs?: number;
}

export function FadeActionSheet({
  visible,
  onRequestClose,
  options,
  deferOptionPressMs = 0,
}: FadeActionSheetProps) {
  const { sheetSlideAnim, sheetFadeAnim } = useFadeSheetAnimation(visible);
  const deferredRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (deferredRef.current) {
        clearTimeout(deferredRef.current);
        deferredRef.current = null;
      }
    },
    []
  );

  const handleOptionPress = useCallback(
    (opt: FadeActionSheetOption) => {
      if (deferredRef.current) {
        clearTimeout(deferredRef.current);
        deferredRef.current = null;
      }
      onRequestClose();
      if (deferOptionPressMs > 0) {
        deferredRef.current = setTimeout(() => {
          deferredRef.current = null;
          opt.onPress();
        }, deferOptionPressMs);
      } else {
        opt.onPress();
      }
    },
    [deferOptionPressMs, onRequestClose]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      {/* Do not wrap the sheet in the same Pressable as the dimmed area — RN can deliver taps to the parent and skip row handlers. */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onRequestClose}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
            pointerEvents="none"
          />
        </Pressable>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: sheetSlideAnim }] }]}
          pointerEvents="box-none"
        >
          <View style={styles.sheetInner}>
            <View style={styles.handle} />
            {options.map((opt, idx) => (
              <Pressable
                key={idx}
                style={[styles.option, opt.destructive && styles.optionDestructive]}
                onPress={() => handleOptionPress(opt)}
                accessibilityLabel={opt.accessibilityLabel ?? opt.label}
                accessibilityHint={opt.accessibilityHint}
                accessibilityRole="button"
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={opt.destructive ? colors.error : colors.textPrimary}
                />
                <Text style={[styles.optionText, opt.destructive && styles.optionTextDestructive]}>
                  {opt.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.ink300} />
              </Pressable>
            ))}
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
    backgroundColor: 'rgba(28, 28, 28, 0.3)',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  sheetInner: {},
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  optionDestructive: {},
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  optionTextDestructive: {
    color: colors.error,
  },
});
