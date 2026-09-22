import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { getLocale } from '@/lib/i18n';
import { showsSectionEyebrow } from '@/lib/sectionEyebrow';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

/** Between the rule and the eyebrow under it. Off the spacing scale, from the type spec. */
const RULE_TO_EYEBROW = 10;
/** 0.12em at 11px. Letter spacing is absolute in React Native, so the em is resolved here. */
const EYEBROW_TRACKING = 11 * 0.12;

export interface SectionHeaderProps {
  title: string;
  /** Optional action label shown as a tappable link on the right */
  actionLabel?: string;
  onAction?: () => void;
  /** How many more there are than the section shows. Hidden when zero. */
  badge?: number;
  /**
   * A short English word set over the title — NEWS, GROUPS — which also switches the header to
   * the editorial treatment: a rule across the top of the column and a serif title under it.
   * Home passes one for every section; the other screens keep the plain header.
   */
  eyebrow?: string;
}

/**
 * The rule and the small label that open an editorial section. Exported for the one heading that
 * is not a `SectionHeader` — the week card's, which lives inside its own card and so sets `rule`
 * to false: the card already has an edge of its own, and a second line under it reads as a
 * mistake rather than a section break.
 */
export function SectionEyebrow({
  label,
  rule = true,
  style,
}: {
  label: string;
  rule?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const showLabel = showsSectionEyebrow(getLocale());
  if (!rule && !showLabel) return null;

  return (
    <View style={style}>
      {rule ? <View style={[styles.rule, showLabel ? null : styles.ruleAlone]} /> : null}
      {/* With no rule above it there is nothing to stand clear of, so the label starts the block. */}
      {showLabel ? (
        <Text style={[styles.eyebrow, rule ? null : styles.eyebrowNoRule]}>{label}</Text>
      ) : null}
    </View>
  );
}

/** The serif title of an editorial section, for headings built outside this component. */
export const editorialSectionTitle = {
  fontFamily: fontFamily.serif,
  fontSize: 20,
  color: colors.onSurface,
  lineHeight: 28,
} as const;

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  badge,
  eyebrow,
}: SectionHeaderProps) {
  const row = (
    <View style={[styles.row, eyebrow ? styles.editorialRow : null]}>
      <Text style={[styles.title, eyebrow ? styles.editorialTitle : null]}>{title}</Text>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <View style={styles.spacer} />
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!eyebrow) return row;

  return (
    <View style={styles.editorialBlock}>
      <SectionEyebrow label={eyebrow} />
      {row}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    /**
     * A "see all" link is a touch taller than the title beside it, so a header that has one used
     * to sit half a pixel lower than one that does not — enough to show as a step between two
     * columns of sections. A fixed height puts every title on the same line.
     */
    minHeight: 28,
  },
  spacer: {
    flex: 1,
  },

  /** The block carries the top margin in editorial mode, so the rule is what the gap measures to. */
  editorialBlock: {
    marginTop: spacing.lg,
  },
  /** A flat bar across the column — square ends, the full width of the section. */
  rule: {
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 0,
    alignSelf: 'stretch',
  },
  eyebrow: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    letterSpacing: EYEBROW_TRACKING,
    color: colors.secondary,
    marginTop: RULE_TO_EYEBROW,
    marginBottom: spacing.xxs,
  },
  /** No label under it, so the rule keeps the same breathing room the label would have had. */
  ruleAlone: {
    marginBottom: RULE_TO_EYEBROW,
  },
  eyebrowNoRule: {
    marginTop: 0,
  },
  editorialRow: {
    marginTop: 0,
    // The title and "see all" sit on one line of type, not centred against each other.
    alignItems: 'baseline',
    /**
     * Exactly the title's line, so the row is the same height whether or not a "see all" sits in
     * it. Baseline alignment puts the link's descender below the title's, which grew the row by
     * two pixels and left those sections with 18 under the title where the others had 16.
     */
    height: 28,
  },
  editorialTitle: editorialSectionTitle,

  /** How many more wait behind "see all". */
  badge: {
    minWidth: 20,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 1,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    color: colors.onAccent,
  },
  title: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 19,
    fontWeight: '600',
    color: colors.onSurface,
    // Fills the row's height exactly, so the title's top edge is the row's top edge and the gap
    // above it is the one the screen asked for rather than that minus half a line.
    lineHeight: 28,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  actionPressed: { opacity: 0.5 },
  actionText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.accent,
  },
});
