import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Badge } from '@/components/primitives/Badge';
import { COUNTRIES } from '@/constants/countries';
import type { Group } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

function getCountryDisplayName(code: string): string {
  const found = COUNTRIES.find((c) => c.code === code);
  return found?.name ?? code;
}

function getLanguageDisplayName(code: string): string {
  const map: Record<string, string> = {
    en: t('language.english'),
    ko: t('language.korean'),
    km: t('language.khmer'),
  };
  return map[code] ?? code;
}

function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(count);
}

export type GroupCardVariant = 'featured' | 'standard' | 'compact';

export interface GroupCardProps {
  group: Group;
  isMember?: boolean;
  variant?: GroupCardVariant;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
}

export function GroupCard({
  group,
  isMember,
  variant = 'standard',
  onJoin,
  onLeave,
}: GroupCardProps) {
  const { push } = useRouter();
  const typeLabel = group.type === 'forum' ? t('groups.forum') : t('groups.ministry');

  const handlePress = () => {
    push(`/group/${group.id}`);
  };

  if (variant === 'featured') {
    return (
      <FeaturedCard
        group={group}
        isMember={isMember}
        typeLabel={typeLabel}
        onPress={handlePress}
        onJoin={onJoin}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <CompactCard group={group} isMember={isMember} typeLabel={typeLabel} onPress={handlePress} />
    );
  }

  return (
    <StandardCard group={group} isMember={isMember} typeLabel={typeLabel} onPress={handlePress} />
  );
}

interface InnerCardProps {
  group: Group;
  isMember?: boolean;
  typeLabel: string;
  onPress: () => void;
  onJoin?: (groupId: string) => void;
}

function FeaturedCard({ group, isMember, typeLabel, onPress, onJoin }: InnerCardProps) {
  const featuredLabel =
    group.type === 'ministry' ? t('groups.featuredMinistry') : t('groups.featuredForum');

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${featuredLabel}, ${group.name}`}
      accessibilityHint={t('groups.opensGroupDetails')}
    >
      <View style={featuredStyles.card}>
        {group.bannerImageUrl ? (
          <Image
            source={{ uri: group.bannerImageUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[StyleSheet.absoluteFillObject, featuredStyles.placeholderBg]} />
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,32,70,0.85)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0.25 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={featuredStyles.content}>
          <Badge label={featuredLabel.toUpperCase()} variant="accent" />

          <View style={featuredStyles.bottom}>
            <Text style={featuredStyles.title} numberOfLines={2}>
              {group.name}
            </Text>
            {group.description ? (
              <Text style={featuredStyles.description} numberOfLines={2}>
                {group.description}
              </Text>
            ) : null}

            <View style={featuredStyles.actions}>
              {!isMember && onJoin ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onJoin(group.id);
                  }}
                  style={({ pressed }) => [featuredStyles.joinButton, pressed && { opacity: 0.8 }]}
                  accessibilityLabel={t('groups.joinGroup')}
                  accessibilityHint={t('groups.joinsGroupHint')}
                >
                  <Text style={featuredStyles.joinText}>{t('groups.joinGroup')}</Text>
                </Pressable>
              ) : isMember ? (
                <View style={featuredStyles.joinedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={featuredStyles.joinedText}>{t('groups.joined')}</Text>
                </View>
              ) : null}

              {group.memberCount != null ? (
                <View style={featuredStyles.memberRow}>
                  <Ionicons name="people" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={featuredStyles.memberText}>
                    {formatMemberCount(group.memberCount)} {t('groups.members')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function StandardCard({ group, isMember, typeLabel, onPress }: Omit<InnerCardProps, 'onJoin'>) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${group.name}, ${typeLabel}${isMember ? `, ${t('groups.joined')}` : ''}`}
      accessibilityHint={t('groups.opensGroupDetails')}
    >
      <View style={standardStyles.card}>
        {group.bannerImageUrl ? (
          <Image
            source={{ uri: group.bannerImageUrl }}
            style={standardStyles.image}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[standardStyles.image, standardStyles.imagePlaceholder]}>
            <Ionicons name="people-outline" size={28} color={colors.ink300} />
          </View>
        )}

        <View style={standardStyles.content}>
          <View style={standardStyles.titleRow}>
            <Text style={standardStyles.title} numberOfLines={1}>
              {group.name}
            </Text>
            {isMember ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            ) : null}
          </View>
          {group.description ? (
            <Text style={standardStyles.description} numberOfLines={2}>
              {group.description}
            </Text>
          ) : null}

          <View style={standardStyles.footer}>
            <Text style={standardStyles.typeLabel}>{typeLabel.toUpperCase()}</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onSurfaceVariant} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CompactCard({ group, isMember, typeLabel, onPress }: Omit<InnerCardProps, 'onJoin'>) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${group.name}, ${typeLabel}`}
      accessibilityHint={t('groups.opensGroupDetails')}
    >
      <View style={compactStyles.card}>
        {group.bannerImageUrl ? (
          <Image
            source={{ uri: group.bannerImageUrl }}
            style={compactStyles.image}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[compactStyles.image, compactStyles.imagePlaceholder]}>
            <Ionicons name="people-outline" size={24} color={colors.ink300} />
          </View>
        )}

        <View style={compactStyles.content}>
          <Text style={compactStyles.title} numberOfLines={1}>
            {group.name}
          </Text>
          {group.description ? (
            <Text style={compactStyles.description} numberOfLines={2}>
              {group.description}
            </Text>
          ) : null}

          <View style={compactStyles.meta}>
            {group.memberCount != null ? (
              <View style={compactStyles.metaItem}>
                <Ionicons name="people-outline" size={14} color={colors.onSurfaceVariant} />
                <Text style={compactStyles.metaText}>{formatMemberCount(group.memberCount)}</Text>
              </View>
            ) : null}
            <View style={compactStyles.metaItem}>
              <Ionicons name="location-outline" size={14} color={colors.onSurfaceVariant} />
              <Text style={compactStyles.metaText} numberOfLines={1}>
                {getCountryDisplayName(group.country)}
              </Text>
            </View>
          </View>
        </View>

        {isMember ? (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={colors.success}
            style={compactStyles.joinedIcon}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const FEATURED_HEIGHT = 360;

const featuredStyles = StyleSheet.create({
  card: {
    height: FEATURED_HEIGHT,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.primaryContainer,
  },
  placeholderBg: {
    backgroundColor: colors.primaryContainer,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  bottom: {
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 36,
    letterSpacing: -0.2,
    color: '#ffffff',
  },
  description: {
    ...typography.bodyMd,
    color: 'rgba(255,255,255,0.8)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  joinButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.onPrimary,
    borderRadius: radius.button,
  },
  joinText: {
    ...typography.buttonLabel,
    color: colors.primary,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.button,
  },
  joinedText: {
    ...typography.labelMd,
    color: '#ffffff',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberText: {
    ...typography.labelMd,
    color: 'rgba(255,255,255,0.8)',
  },
});

const standardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.titleLg,
    color: colors.onSurface,
    flex: 1,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  typeLabel: {
    ...typography.labelMd,
    color: colors.secondary,
    letterSpacing: 0.6,
  },
});

const compactStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  imagePlaceholder: {
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  metaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  joinedIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});
