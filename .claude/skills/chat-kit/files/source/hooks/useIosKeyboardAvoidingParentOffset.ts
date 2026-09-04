import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Dimensions, Platform, View } from 'react-native';

/**
 * iOS KeyboardAvoidingView (behavior="padding") uses onLayout `frame` in **parent** coordinates.
 * `keyboardVerticalOffset` must be the **window Y** of that parent’s top edge — not the bottom of
 * a sibling above the KeyboardAvoidingView (that double-counts and adds extra bottom padding).
 */
export function useIosKeyboardAvoidingParentOffset() {
  const parentRef = useRef<React.ElementRef<typeof View>>(null);
  const [iosOffset, setIosOffset] = useState(0);

  const measure = useCallback(() => {
    if (Platform.OS !== 'ios') return;
    parentRef.current?.measureInWindow((_x, y) => {
      setIosOffset(Math.round(y));
    });
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', measure);
    return () => sub.remove();
  }, [measure]);

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(measure);
    }, [measure])
  );

  const parentContainerProps = {
    ref: parentRef,
    collapsable: false as const,
    onLayout: measure,
  };

  return {
    iosKeyboardVerticalOffset: Platform.OS === 'ios' ? iosOffset : 0,
    parentContainerProps,
  };
}
