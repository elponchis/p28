import { Platform } from 'react-native';

import { colors } from '@/theme/tokens';

/**
 * The soft lift the group screen's cards sit on.
 *
 * It lived inside app/group/[id]/index.tsx until those cards were pulled out into components the
 * full lists share. Moved, not invented — this project does not add new shadows.
 */
export const editorialShadow = {
  shadowColor: colors.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 30,
  shadowOffset: { width: 0, height: 15 },
  ...Platform.select({ android: { elevation: 3 } }),
};
