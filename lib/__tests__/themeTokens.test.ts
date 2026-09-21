/**
 * The list-style theme pass lightened the greys and borders. Lighter greys are where contrast
 * quietly breaks, so each text token is pinned to the surfaces it is allowed on.
 */
import { colors, listAccents, radius, spacing } from '@/theme/tokens';
import { palette } from '@/theme/palette.generated';

/** WCAG contrast ratio for two #rrggbb colors. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const allSurfaces = [
  colors.surfaceContainerLowest,
  colors.background,
  colors.surfaceContainerLow,
  colors.surfaceContainer,
  colors.surfaceContainerHigh,
  colors.surfaceContainerHighest,
];

describe('theme text contrast', () => {
  it('keeps body and secondary text at 4.5:1 or better on every surface', () => {
    for (const surface of allSurfaces) {
      expect(contrast(colors.onSurface, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.onSurfaceVariant, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps muted meta text at 4.5:1 on the surfaces lists sit on', () => {
    for (const surface of allSurfaces.slice(0, 5)) {
      expect(contrast(colors.textMuted, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the chip label readable on the chip', () => {
    expect(contrast(colors.chipText, colors.chipBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it('draws borders light but still visible on white', () => {
    expect(contrast(colors.outlineVariant, colors.surfaceContainerLowest)).toBeGreaterThan(1.2);
    expect(contrast(colors.outlineVariant, colors.surfaceContainerLowest)).toBeLessThan(1.6);
  });
});

describe('theme aliases stay in step', () => {
  it('points the legacy names at the new values', () => {
    expect(colors.textSecondary).toBe(colors.onSurfaceVariant);
    expect(colors.ink700).toBe(colors.onSurfaceVariant);
    expect(colors.ink500).toBe(colors.textMuted);
    // Blue Ocean splits these: ink300 is now a foreground grey (placeholders, chevrons,
    // the inactive tab tint), while outlineVariant stays the hairline border.
    expect(colors.ink300).not.toBe(colors.outlineVariant);
    expect(colors.borderSubtle).toBe(colors.ghostBorder);
    expect(colors.chipBorder).toBe(colors.outlineVariant);
    expect(colors.chipText).toBe(colors.textMuted);
    // The unread dot has to read as blue, and `primary` is ink here, so it follows `accent`.
    expect(colors.unreadIndicator).toBe(colors.accent);
    expect(colors.chipAccent).toBe(colors.secondary);
  });
});

describe('Blue Ocean roles', () => {
  it('reads every role out of the generated palette', () => {
    const named = new Set<string>(Object.values(palette));
    const roles = [
      colors.primary,
      colors.onPrimary,
      colors.primaryContainer,
      colors.background,
      colors.surfaceContainerLowest,
      colors.onSurface,
      colors.onSurfaceVariant,
      colors.outlineVariant,
      colors.secondaryContainer,
      colors.onSecondaryContainer,
    ];
    for (const value of roles) expect(named).toContain(value);
  });

  it('keeps white legible on the blue that carries it', () => {
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onPrimary, colors.primaryContainer)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onPrimaryContainer, colors.primaryContainer)).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it('reads amber with its own ink, never with grey', () => {
    expect(contrast(colors.onSecondaryContainer, colors.secondaryContainer)).toBeGreaterThanOrEqual(
      4.5
    );
  });
});

describe('list accent shapes', () => {
  it('builds the chip, dot and count from the spacing and radius scales', () => {
    expect(listAccents.chip.borderRadius).toBe(radius.chip);
    expect(listAccents.chip.paddingHorizontal).toBe(spacing.xs);
    expect(listAccents.unreadDot.size).toBe(spacing.xs);
    expect(listAccents.count.minWidth).toBe(spacing.md + spacing.xxs);
  });
});
