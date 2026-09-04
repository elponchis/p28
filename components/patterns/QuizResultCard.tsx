import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';
import { USE_NATIVE_DRIVER } from '@/lib/animation';

export interface QuizResultCardProps {
  /** Points earned on the auto-scored questions. */
  score: number;
  /** Points available from those questions. Nothing renders when this is 0. */
  scoreMax: number;
  /** Questions answered correctly / auto-scored question count, for the sub-line. */
  correctCount: number;
  questionCount: number;
  /** Some questions are written and awaiting the instructor. */
  hasUngradedWritten?: boolean;
}

type Tier = 'perfect' | 'good' | 'partial';

const TIER_COPY: Record<
  Tier,
  { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  perfect: {
    title: 'submissions.resultPerfect',
    subtitle: 'submissions.resultPerfectHint',
    icon: 'trophy',
  },
  good: {
    title: 'submissions.resultGood',
    subtitle: 'submissions.resultGoodHint',
    icon: 'checkmark-circle',
  },
  partial: {
    title: 'submissions.resultPartial',
    subtitle: 'submissions.resultPartialHint',
    icon: 'refresh-circle',
  },
};

/**
 * The score reveal after a quiz is submitted.
 *
 * A bare "3/8" told a student almost nothing, so this states the outcome in words,
 * animates in so the result registers as an event rather than as text that was
 * always there, and shows proportion at a glance in the bar.
 *
 * A low score is gold, never red: this is a church study group, and a first attempt
 * that went badly should read as "go again", not as a failure notice.
 */
export function QuizResultCard({
  score,
  scoreMax,
  correctCount,
  questionCount,
  hasUngradedWritten,
}: QuizResultCardProps) {
  const ratio = scoreMax > 0 ? score / scoreMax : 0;
  const tier: Tier = ratio === 1 ? 'perfect' : ratio >= 0.7 ? 'good' : 'partial';
  const accent = tier === 'partial' ? colors.secondary : colors.success;

  const pop = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pop.setValue(0);
    fill.setValue(0);
    Animated.sequence([
      Animated.spring(pop, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(fill, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [pop, fill, score, scoreMax]);

  // Only a perfect score gets the repeating flourish — otherwise it reads as decoration
  // rather than as praise.
  useEffect(() => {
    if (tier !== 'perfect') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      { iterations: 3 }
    );
    loop.start();
    return () => loop.stop();
  }, [tier, shine]);

  const copy = TIER_COPY[tier];
  const barWidth = useMemo(
    () =>
      fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.round(ratio * 100)}%`] }),
    [fill, ratio]
  );

  if (scoreMax <= 0) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        { borderColor: accent },
        {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${t(copy.title)} ${score} / ${scoreMax}`}
    >
      <View style={styles.headerRow}>
        <Animated.View
          style={{
            transform: [
              { scale: shine.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
            ],
          }}
        >
          <Ionicons name={copy.icon} size={30} color={accent} />
        </Animated.View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: accent }]}>{t(copy.title)}</Text>
          <Text style={styles.subtitle}>{t(copy.subtitle)}</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: accent }]}>{score}</Text>
        <Text style={styles.scoreMax}>/ {scoreMax}</Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: accent }]} />
      </View>

      <Text style={styles.detail}>
        {t('submissions.resultCorrectCount', { correct: correctCount, total: questionCount })}
      </Text>

      {hasUngradedWritten ? (
        <View style={styles.pendingRow}>
          <Ionicons name="time-outline" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.pendingText}>{t('submissions.resultWrittenPending')}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  score: {
    fontFamily: fontFamily.serif,
    fontSize: 40,
    lineHeight: 46,
  },
  scoreMax: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  track: {
    height: 8,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.chip,
  },
  detail: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  pendingText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    flex: 1,
    minWidth: 0,
  },
});
