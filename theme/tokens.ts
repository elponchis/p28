/**
 * Design tokens — The Sanctuary Editorial (single source of truth).
 *
 * Creative North Star: "The Digital Hearth"
 * Aesthetic: High-end editorial — warm, spacious, deeply personal.
 * Palette: "Spirit and Earth" — deep authoritative blues + warm illuminating golds.
 * Typography: Noto Serif (headlines) + Plus Jakarta Sans (body).
 * Depth: Tonal layering with light hairline borders; shadows kept faint.
 *
 * List styling (2026-09): one quieter secondary grey for meta text, a lighter muted grey for
 * timestamps and counts, visible light borders, tighter card corners and list padding. Navy,
 * amber and the lavender-grey surfaces are unchanged; so are the fonts.
 */

import { palette } from './palette.generated';

// ---------------------------------------------------------------------------
// Font families (loaded via expo-google-fonts in app/_layout.tsx)
// ---------------------------------------------------------------------------

export const fontFamily = {
  serif: 'NotoSerif',
  serifItalic: 'NotoSerif-Italic',
  serifBold: 'NotoSerif-Bold',
  sans: 'PlusJakartaSans',
  sansMedium: 'PlusJakartaSans-Medium',
  sansSemiBold: 'PlusJakartaSans-SemiBold',
  sansBold: 'PlusJakartaSans-Bold',
} as const;

// ---------------------------------------------------------------------------
// Colors — each role points at the Blue Ocean palette
// ---------------------------------------------------------------------------

export const colors = {
  // Surface hierarchy (nested sheets of heavy-stock paper)
  background: palette.ground, // base surface
  surface: palette.surface, // alias for background
  surfaceContainerLowest: palette.surface, // floating elements
  surfaceContainerLow: palette.surfaceSunken, // cards on surface
  surfaceContainer: palette.ground, // card backgrounds
  surfaceContainerHigh: palette.neutralSoft, // recessed sections
  surfaceContainerHighest: palette.brandSoft, // input backgrounds

  /** Native splash + app icon background (keep in sync with app.json splash / adaptiveIcon) */
  brandSplashBackground: palette.brand,

  // Primary — the blue the app icon is cut from
  primary: palette.brandDeep,
  /**
   * Filled blue surfaces that carry white text: own chat bubbles, the devotion banner, group
   * card covers, filled buttons. Deep on purpose — `primaryFixed` is the pale blue fill.
   */
  primaryContainer: palette.brandDeep,
  primaryFixed: palette.brandSoft, // input focus background
  onPrimary: palette.surface,
  /** Muted text on `primaryContainer` surfaces (e.g. Sacred Gatherings dark cards). */
  onPrimaryContainer: palette.onBrandMuted,

  // Secondary — warm amber, fills only
  secondary: palette.sand,
  secondaryContainer: palette.sandSoft,
  onSecondaryContainer: palette.sandInk,

  // Text / on-surface
  onSurface: palette.ink,
  /** Secondary text. At least 5.3:1 on every surface, including surfaceContainerHighest. */
  onSurfaceVariant: palette.muted,
  /**
   * Meta text — timestamps, counts, previews. The canvas has one grey at this level, so this
   * and `onSurfaceVariant` are the same colour now.
   */
  textMuted: palette.muted,
  /** Light hairline border for chips, dividers and outlined surfaces. */
  outlineVariant: palette.line,

  /** Hairline for separators on tinted surfaces (sidebar rails, list dividers). */
  ghostBorder: palette.line,

  // List accents
  /** Unread marker at the left of a list row. */
  unreadIndicator: palette.brandDeep,
  /** Outlined tag chip naming where an item belongs. */
  chipBackground: palette.surface,
  chipBorder: palette.line,
  chipText: palette.muted,
  chipAccent: palette.sand,

  // Glassmorphism
  glass: {
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceStrong: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(255, 255, 255, 0.5)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
  },

  // Semantic (muted, desaturated)
  success: palette.teal,
  warning: palette.sandInk,
  /** Kept — the canvas palette has no red. */
  error: '#ba1a1a',
  info: palette.brandDeep,

  // Focus ring
  focusRing: 'rgba(30, 92, 140, 0.25)',

  /** Recurring meeting card divider (body is white; join row uses secondaryContainer) */
  recurringMeetingCardDivider: palette.line,

  // ---------------------------------------------------------------------------
  // Backward-compat aliases (map old names → new values during migration)
  // ---------------------------------------------------------------------------
  textPrimary: palette.ink,
  textSecondary: palette.muted,
  ink700: palette.muted,
  /** Placeholders, disabled icons, chevrons, the inactive tab tint. */
  ink300: palette.inkSoft,
  ink500: palette.muted,
  brandSoft: palette.brandSoft,
  surfaceHighlight: palette.surfaceSunken,
  surface100: palette.ground,
  cardDefault: palette.surface,
  cardAlt: palette.surfaceSunken,
  cardHighlight: palette.ground,
  primaryDark: palette.brandDeep,
  primaryLight: palette.brandSoft,
  accent: palette.brandDeep,
  accentSoft: palette.brandSoft,
  lavender: palette.brandDeep,
  lavenderSoft: palette.brandSoft,
  blue: palette.brandDeep,
  blueSoft: palette.brandSoft,
  peach: palette.sandSoft,
  greenSoft: palette.tealSoft,
  amberSoft: palette.sandSoft,
  /** Kept — a shadow is not a palette colour. */
  shadow: '#151c27',
  borderSubtle: palette.line,
} as const;

// ---------------------------------------------------------------------------
// Spacing (generous, editorial breathing room)
// ---------------------------------------------------------------------------

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  screenHorizontal: 20,
  cardPadding: 16,
  cardPaddingTop: 16,
  cardPaddingBottom: 24,
  cardGap: 16,
  sectionGap: 44, // scale 8 = 2.75rem between feed items
  majorSectionGap: 88, // 5.5rem between major sections
} as const;

// ---------------------------------------------------------------------------
// Radius — the canvas corners: 8 · 10 · 12 · 16 · 18 · pill
// ---------------------------------------------------------------------------

export const radius = {
  sm: 8,
  md: 10,
  button: 999, // pill shape — "Soft-Touch CTA"
  card: 16,
  /** Stitch “Sacred Gatherings” cards — the canvas's widest corner */
  sacredGatheringCard: 18,
  chip: 999, // pill
  lg: 16,
  xl: 18,
  input: 12,
} as const;

// ---------------------------------------------------------------------------
// Typography — Editorial Voice
// ---------------------------------------------------------------------------

export const typography = {
  // Serif — Noto Serif (display & headlines)
  displayLg: {
    fontFamily: fontFamily.serif,
    fontSize: 36,
    fontWeight: '400' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  headlineLg: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '400' as const,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  headlineMd: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    fontWeight: '400' as const,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  headlineSm: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '400' as const,
    lineHeight: 32,
    letterSpacing: -0.1,
  },

  // Sans — Plus Jakarta Sans (body, labels, buttons)
  titleLg: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  titleMd: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodyLg: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelLg: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  labelSm: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  buttonLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },

  // ---------------------------------------------------------------------------
  // Backward-compat aliases (old names → new editorial styles)
  // ---------------------------------------------------------------------------
  h1: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  title: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 16,
    fontWeight: '500' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Shadow — Tonal layering preferred; ambient shadow for floating elements only
// ---------------------------------------------------------------------------

export const shadow = {
  ambient: {
    shadowColor: '#151c27',
    shadowOpacity: 0.06,
    shadowRadius: 30,
    shadowOffset: { width: 0 as const, height: 4 },
  },
  // Backward-compat aliases
  cardSoft: {
    shadowOpacity: 0.02,
    shadowRadius: 24,
    shadowOffset: { width: 0 as const, height: 4 },
  },
  floating: {
    shadowOpacity: 0.06,
    shadowRadius: 30,
    shadowOffset: { width: 0 as const, height: 8 },
  },
  card: {
    shadowOpacity: 0.02,
    shadowRadius: 24,
    shadowOffset: { width: 0 as const, height: 4 },
  },
} as const;

// ---------------------------------------------------------------------------
// Avatar sizes
// ---------------------------------------------------------------------------

export const avatarSizes = { sm: 28, md: 36, lg: 48, xl: 72, xxl: 100 } as const;

// ---------------------------------------------------------------------------
// List accents — shapes shared by the tag chip, unread dot and sidebar counts
// ---------------------------------------------------------------------------

export const listAccents = {
  chip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderWidth: 1,
    borderRadius: radius.chip,
    fontSize: 12,
  },
  unreadDot: {
    size: spacing.xs,
  },
  count: {
    fontSize: 11,
    minWidth: spacing.md + spacing.xxs,
  },
} as const;

// ---------------------------------------------------------------------------
// Auth / form screens
// ---------------------------------------------------------------------------

export const minTouchTarget = 44;

export const authScreen = {
  inputStyle: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
  } as const,
  ctaMinHeight: 48,
} as const;

// ---------------------------------------------------------------------------
// Breakpoints (web only — the app is otherwise a single phone-width layout)
// ---------------------------------------------------------------------------

/** Viewport width (px) above which web treats the layout as desktop, not phone-in-browser. Keep in sync with app/+html.tsx. */
export const breakpoints = {
  desktop: 640,
  /** Viewport width (px) above which the (tabs) branch swaps the bottom tab bar for a left sidebar. */
  sidebar: 900,
} as const;

/**
 * Caps + centers (tabs) screen content so it stays readable next to the desktop sidebar
 * instead of stretching full-width. A no-op below this width (phones, narrow web), since
 * `width: '100%'` never exceeds `maxWidth` there. Merge into a screen's existing content
 * wrapper style (e.g. `style={[styles.content, tabScreenContent]}`).
 */
export const tabScreenContent = {
  width: '100%',
  maxWidth: 720,
  alignSelf: 'center',
} as const;

// ---------------------------------------------------------------------------
// Aggregate export
// ---------------------------------------------------------------------------

export const tokens = {
  colors,
  spacing,
  radius,
  typography,
  shadow,
  fontFamily,
  minTouchTarget,
  avatarSizes,
  listAccents,
  breakpoints,
  tabScreenContent,
} as const;

export default tokens;
