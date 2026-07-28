/**
 * Shared layout for simple tab screens: title, separator, and optional subtitle or children.
 * DRY for index, messages, groups.
 */
import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, typography } from '@/theme/tokens';

export interface TabPlaceholderScreenProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function TabPlaceholderScreen({ title, subtitle, children }: TabPlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(250)} style={styles.animatedContent}>
        <RNText style={styles.title}>{title}</RNText>
        <View style={[styles.separator, { backgroundColor: colors.surfaceHighlight }]} />
        {subtitle ? <RNText style={styles.subtitle}>{subtitle}</RNText> : null}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
  },
  animatedContent: { alignItems: 'center', justifyContent: 'center' },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  separator: {
    marginVertical: spacing.lg,
    height: 1,
    width: '80%',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
