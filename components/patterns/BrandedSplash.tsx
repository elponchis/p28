import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, spacing } from '@/theme/tokens';

export interface BrandedSplashProps {
  onComplete: () => void;
}

const SPLASH_LOGO = require('../../assets/images/splash-icon.png');

const ANIMATION_MS = 520;

export function BrandedSplash({ onComplete }: BrandedSplashProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; Reanimated shared values stable
  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    const config = { duration: ANIMATION_MS, easing };
    opacity.value = withTiming(1, config);
    scale.value = withTiming(1, config);
    // Avoid runOnJS from a worklet here (can be fragile on some runtimes). Match animation duration on JS.
    const doneTimer = setTimeout(() => {
      onCompleteRef.current();
    }, ANIMATION_MS + 80);
    return () => clearTimeout(doneTimer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.root} accessibilityLabel="Loading" accessibilityHint="App is starting">
      <Animated.View style={[styles.logoWrap, logoAnimatedStyle]}>
        <Image
          source={SPLASH_LOGO}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="P28"
        />
      </Animated.View>
    </View>
  );
}

const LOGO_MAX = spacing.xxl * 9; // 360 — within adaptive icon safe zone on screen

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandSplashBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: '66%',
    maxWidth: LOGO_MAX,
    aspectRatio: 1,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
