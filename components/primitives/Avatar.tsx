import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { avatarFallbackInitial } from '@/lib/avatarFallbackInitial';
import { colors, typography, avatarSizes } from '@/theme/tokens';

export interface AvatarProps {
  source?: ImageSourcePropType | null;
  fallbackText?: string;
  size?: keyof typeof avatarSizes;
  /** When true, renders a 1.5pt white ring for stacked/grouped avatar contexts. */
  ringed?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Avatar({
  source,
  fallbackText,
  size = 'md',
  ringed = false,
  accessibilityLabel,
  accessibilityHint,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const uri = source && typeof source === 'object' && 'uri' in source ? source.uri : undefined;
  useEffect(() => {
    setImageError(false);
  }, [uri]);
  const showImage = Boolean(source && !imageError);

  const dim = avatarSizes[size];
  const containerStyle = [
    styles.container,
    { width: dim, height: dim, borderRadius: dim / 2 },
    ringed && styles.ring,
  ];
  const fontSize = dim * 0.38;
  const textStyle = [styles.fallbackText, { fontSize, lineHeight: fontSize * 1.2 }];

  if (showImage) {
    return (
      <Image
        source={source}
        style={containerStyle}
        contentFit="cover"
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onError={() => setImageError(true)}
      />
    );
  }

  const initial = avatarFallbackInitial(fallbackText);
  return (
    <View
      style={[containerStyle, styles.fallback]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {initial ? <Text style={textStyle}>{initial}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallback: {},
  ring: {
    borderWidth: 1.5,
    borderColor: colors.surfaceContainerLowest,
  },
  fallbackText: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
});
