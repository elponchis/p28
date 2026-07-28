/**
 * Design tokens — The Sanctuary Editorial (single source of truth).
 *
 * Creative North Star: "The Digital Hearth"
 * Aesthetic: High-end editorial — warm, spacious, deeply personal.
 * Palette: "Spirit and Earth" — deep authoritative blues + warm illuminating golds.
 * Typography: Noto Serif (headlines) + Plus Jakarta Sans (body).
 * Depth: Tonal layering, NO 1px borders, ambient shadows only.
 */

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
// Colors — "Spirit and Earth" duality
// ---------------------------------------------------------------------------

export const colors = {
  // Surface hierarchy (nested sheets of heavy-stock paper)
  background: '#f9f9ff', // base surface
  surface: '#f9f9ff', // alias for background
  surfaceContainerLowest: '#ffffff', // floating elements
  surfaceContainerLow: '#f0f3ff', // cards on surface
  surfaceContainer: '#e7eefe', // card backgrounds
  surfaceContainerHigh: '#e2e8f8', // recessed sections
  surfaceContainerHighest: '#dce3f2', // input backgrounds

  /** Native splash + app icon background (keep in sync with app.json splash / adaptiveIcon) */
  brandSplashBackground: '#327db6',

  // Primary — deep authoritative blue
  primary: '#002046',
  primaryContainer: '#1b365d',
  primaryFixed: '#d6e3ff', // input focus background
  onPrimary: '#ffffff',
  /** Muted text on `primaryContainer` surfaces (e.g. Sacred Gatherings dark cards). */
  onPrimaryContainer: '#87a0cd',

  // Secondary — warm illuminating gold
  secondary: '#775a19',
  secondaryContainer: '#fed488',
  onSecondaryContainer: '#785a1a',

  // Text / on-surface
  onSurface: '#151c27',
  onSurfaceVariant: '#44474e',
  outlineVariant: '#c4c6cf',

  // Ghost border (accessibility fallback ONLY — 15% opacity)
  ghostBorder: 'rgba(196, 198, 207, 0.15)',

  // Glassmorphism
  glass: {
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceStrong: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(255, 255, 255, 0.5)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
  },

  // Semantic (muted, desaturated)
  success: '#4a7c5c',
  warning: '#8a6d2b',
  error: '#ba1a1a',
  info: '#002046',

  // Focus ring
  focusRing: 'rgba(0, 32, 70, 0.25)',

  /** Recurring meeting card divider (body is white; join row uses secondaryContainer) */
  recurringMeetingCardDivider: 'rgba(0, 32, 70, 0.12)',

  // ---------------------------------------------------------------------------
  // Backward-compat aliases (map old names → new values during migration)
  // ---------------------------------------------------------------------------
  textPrimary: '#151c27',
  textSecondary: '#44474e',
  ink700: '#44474e',
  ink300: '#c4c6cf',
  ink500: '#6b6f7a',
  brandSoft: '#d6e3ff',
  surfaceHighlight: '#f0f3ff',
  surface100: '#e7eefe',
  cardDefault: '#ffffff',
  cardAlt: '#f0f3ff',
  cardHighlight: '#f9f9ff',
  primaryDark: '#1b365d',
  primaryLight: '#d6e3ff',
  accent: '#002046',
  accentSoft: '#d6e3ff',
  lavender: '#002046',
  lavenderSoft: '#d6e3ff',
  blue: '#002046',
  blueSoft: '#d6e3ff',
  peach: '#fed488',
  greenSoft: '#e2e8f8',
  amberSoft: '#fed488',
  shadow: '#151c27',
  borderSubtle: 'rgba(196, 198, 207, 0.15)',
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
  cardPadding: 20,
  cardPaddingTop: 16,
  cardPaddingBottom: 24,
  cardGap: 16,
  sectionGap: 44, // scale 8 = 2.75rem between feed items
  majorSectionGap: 88, // 5.5rem between major sections
} as const;

// ---------------------------------------------------------------------------
// Radius (nothing sharper than sm/4px — prioritize lg and xl)
// ---------------------------------------------------------------------------

export const radius = {
  sm: 4,
  md: 8,
  button: 9999, // pill shape — "Soft-Touch CTA"
  card: 24, // xl = 1.5rem
  /** Stitch “Sacred Gatherings” cards — 2rem corners */
  sacredGatheringCard: 32,
  chip: 9999, // pill
  lg: 16,
  xl: 24,
  input: 12, // md = 0.75rem
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
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0 as const, height: 4 },
  },
  floating: {
    shadowOpacity: 0.06,
    shadowRadius: 30,
    shadowOffset: { width: 0 as const, height: 8 },
  },
  card: {
    shadowOpacity: 0.04,
    shadowRadius: 24,
    shadowOffset: { width: 0 as const, height: 4 },
  },
} as const;

// ---------------------------------------------------------------------------
// Avatar sizes
// ---------------------------------------------------------------------------

export const avatarSizes = { sm: 28, md: 36, lg: 48, xl: 72, xxl: 100 } as const;

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
} as const;

export default tokens;
