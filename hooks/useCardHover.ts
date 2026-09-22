import { useMemo, useState } from 'react';

import { isDesktopWebPointer } from '@/lib/pointer';

export interface CardHoverState {
  /** True only while a mouse is over the card. Always false on touch. */
  hovered: boolean;
  /** Spread onto the card's Pressable. Empty where there is no hover to report. */
  hoverProps: object;
}

/**
 * Tracks whether a mouse is over a card, so the card can darken its edge.
 *
 * A browser on a phone is still `Platform.OS === 'web'`, and there a tap is delivered as a hover
 * that never ends — the card would stay highlighted after the finger left. `isDesktopWebPointer`
 * keeps the listeners off in that case, which also keeps a re-render per touch off the list.
 */
export function useCardHover(): CardHoverState {
  const [hovered, setHovered] = useState(false);
  const supported = isDesktopWebPointer();

  const hoverProps = useMemo(
    () =>
      supported
        ? ({
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
          } as object)
        : {},
    [supported]
  );

  return { hovered: supported && hovered, hoverProps };
}
