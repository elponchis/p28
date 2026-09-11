/**
 * Reactions on your own chat messages (KAN-31): badges must not cover the time beside the bubble,
 * and the text on the dark own-bubble badge must be readable.
 */
import fs from 'fs';
import path from 'path';
import { colors } from '@/theme/tokens';

const source = fs.readFileSync(path.join(__dirname, '..', 'MessageRow.tsx'), 'utf8');

/** WCAG relative luminance contrast ratio for two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('MessageRow reactions on own messages', () => {
  it('hangs the badge row from the bubble side, not over the time on the left', () => {
    expect(source).toMatch(/styles\.reactionBadges, isOwnMessage && styles\.reactionBadgesOwn/);
    expect(source).toMatch(/reactionBadgesOwn: \{\s*alignSelf: 'flex-end'/);
  });

  it('uses a readable color for counts and the who-reacted button on the dark badge', () => {
    expect(source.match(/isOwnMessage && styles\.reactionCountOwnBubble/g)).toHaveLength(2);
    expect(source).toMatch(/reactionCountOwnBubble: \{\s*color: colors\.onPrimaryContainer/);
    // The old grey on the own-bubble badge is what made it look empty.
    expect(contrast(colors.onSurfaceVariant, colors.primaryContainer)).toBeLessThan(2);
    expect(contrast(colors.onPrimaryContainer, colors.primaryContainer)).toBeGreaterThanOrEqual(
      4.5
    );
  });
});
