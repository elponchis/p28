/**
 * The Blue Ocean theme repoints every app color, size and gap at the canvas tokens. Lighter
 * greys are where contrast quietly breaks, so each text token is pinned to the surfaces it is
 * allowed on, and every scale value is checked to be one the canvas actually uses.
 */
import {
  color,
  colors,
  fontSize,
  listAccents,
  radius,
  space,
  spacing,
  typography,
} from '@/theme/tokens';

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
    expect(colors.ink300).toBe(colors.outlineVariant);
    expect(colors.borderSubtle).toBe(colors.ghostBorder);
    expect(colors.chipBorder).toBe(colors.outlineVariant);
    expect(colors.chipText).toBe(colors.textMuted);
    // Blue Ocean puts every primary action, the unread dot included, on brandDeep.
    expect(colors.unreadIndicator).toBe(colors.primary);
    expect(colors.chipAccent).toBe(colors.secondary);
  });
});

describe('Blue Ocean palette', () => {
  it('builds the app colors out of the canvas tokens', () => {
    expect(colors.primary).toBe(color.brandDeep);
    expect(colors.onSurface).toBe(color.ink);
    expect(colors.secondaryContainer).toBe(color.sandSoft);
    expect(colors.background).toBe(color.ground);
    expect(colors.outlineVariant).toBe(color.line);
  });

  it('keeps white legible on the blue that carries white text', () => {
    expect(contrast(colors.onPrimary, color.brandDeep)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.onPrimaryContainer, color.brandDeep)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps amber a fill, read with its own ink', () => {
    expect(contrast(color.sandInk, color.sandSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('holds spacing, radius and type to the canvas scales', () => {
    const scale = Object.values(space);
    for (const value of Object.values(spacing)) expect(scale).toContain(value);
    const radii = [8, 10, 12, 16, 18, 999];
    for (const value of Object.values(radius)) expect(radii).toContain(value);
    const sizes = Object.values(fontSize);
    for (const style of Object.values(typography)) expect(sizes).toContain(style.fontSize);
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
