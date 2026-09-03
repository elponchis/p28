import { Platform } from 'react-native';

/**
 * Whether Animated may hand a timing off to the native driver.
 *
 * react-native-web has no native animated module, so asking for it there logs
 *   "Animated: `useNativeDriver` is not supported because the native animated module is missing"
 * on every animation and falls back to JS anyway. Same result, minus the warning — and the
 * transforms and opacities these animations drive are exactly what the JS driver handles well.
 */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
