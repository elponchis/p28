import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme/tokens';

export interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  size?: number;
  color?: string;
  /** Custom container style */
  style?: ViewStyle;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

const springConfig = { damping: 22, stiffness: 340 };

export function IconButton({
  name,
  onPress,
  size = 20,
  color = colors.onSurface,
  style: styleProp,
  accessibilityLabel,
  accessibilityHint,
}: IconButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={[styles.container, styleProp, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withSpring(0.92, springConfig))}
        onPressOut={() => scale.set(withSpring(1, springConfig))}
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <Ionicons name={name} size={size} color={color} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  pressable: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
