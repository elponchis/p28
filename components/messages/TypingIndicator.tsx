/**
 * The "someone is typing" bubble.
 *
 * Three dots that rise and fall in sequence, in a bubble shaped like an incoming message so it
 * reads as a message about to arrive rather than as a status line. KakaoTalk puts it at the
 * bottom of the thread, which is where the next message will land.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/primitives';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const DOT_COUNT = 3;
const DOT_DURATION_MS = 320;
/** Offset between neighbouring dots, so the motion reads as a wave rather than a blink. */
const DOT_STAGGER_MS = 140;

function useDotAnimation(index: number): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * DOT_STAGGER_MS),
        Animated.timing(value, {
          toValue: 1,
          duration: DOT_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: DOT_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        // Holds the dot down until the others have had their turn, keeping the cycle even.
        Animated.delay((DOT_COUNT - 1 - index) * DOT_STAGGER_MS),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [index, value]);

  return value;
}

function TypingDot({ index }: { index: number }) {
  const progress = useDotAnimation(index);
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          ],
        },
      ]}
    />
  );
}

export interface TypingIndicatorProps {
  /** Display names of everyone currently typing. Empty renders nothing. */
  names: string[];
  /** Avatar for the single-typist case; a group shows the count instead. */
  avatarUrl?: string;
}

export function TypingIndicator({ names, avatarUrl }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? t('messages.typingOne', { name: names[0] })
      : t('messages.typingMany', { count: String(names.length) });

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={label}>
      {names.length === 1 ? (
        <Avatar source={avatarUrl ? { uri: avatarUrl } : null} fallbackText={names[0]} size="md" />
      ) : (
        <View style={styles.avatarSpacer} />
      )}
      <View style={styles.column}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.bubble}>
          {Array.from({ length: DOT_COUNT }, (_, i) => (
            <TypingDot key={i} index={i} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  avatarSpacer: {
    width: 36,
  },
  column: {
    gap: 2,
  },
  label: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: colors.onSurfaceVariant,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceContainerLowest,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onSurfaceVariant,
  },
});
