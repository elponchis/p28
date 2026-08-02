import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface DesktopContentContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Caps + centers content inside a full-width desktop branch (see `useDesktopFullWidth`),
 * for form-like screens that shouldn't stretch edge-to-edge. No-op on phones/narrow web,
 * since `width: '100%'` never exceeds `maxWidth` there.
 */
export function DesktopContentContainer({
  children,
  maxWidth = 600,
  style,
}: DesktopContentContainerProps) {
  return <View style={[styles.container, { maxWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
});
