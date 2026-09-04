import { useEffect, useRef } from 'react';
import { Animated, InteractionManager } from 'react-native';
import { USE_NATIVE_DRIVER } from '@/lib/animation';

/**
 * Provides animated values for a bottom sheet that fades in (backdrop + content).
 * Use with Modal (animationType="none") and Animated.View for the backdrop and sheet.
 */
export function useFadeSheetAnimation(visible: boolean) {
  const sheetSlideAnim = useRef(new Animated.Value(300)).current;
  const sheetFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      sheetSlideAnim.setValue(300);
      sheetFadeAnim.setValue(0);
      const task = InteractionManager.runAfterInteractions(() => {
        Animated.parallel([
          Animated.timing(sheetSlideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(sheetFadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start();
      });
      return () => task.cancel();
    } else {
      Animated.parallel([
        Animated.timing(sheetSlideAnim, {
          toValue: 300,
          duration: 240,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(sheetFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    }
  }, [visible, sheetSlideAnim, sheetFadeAnim]);

  return { sheetSlideAnim, sheetFadeAnim };
}
