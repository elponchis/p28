/**
 * Design tokens — the P2:8 Blue Ocean theme (single source of truth).
 *
 * Creative North Star: "The Digital Hearth"
 * Aesthetic: High-end editorial — warm, spacious, deeply personal.
 * Palette: extracted from the Claude Design canvas — ocean blues + a warm sand amber.
 * Typography: Noto Serif (headlines) + Plus Jakarta Sans (body).
 * Depth: Tonal layering with light hairline borders; shadows kept faint.
 *
 * Blue Ocean theme (2026-09): the palette, type scale, corners and spacing come from the
 * Claude Design canvas (`color`, `space`, `fontSize`, `radius` below). The names the app
 * already imports — `colors`, `spacing`, `radius`, `typography` — are kept and repointed at
 * those values, so screens did not have to change. Fonts are unchanged for now.
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
// Canvas tokens — extracted from the Claude Design artboards (p28-theme).
// Do not hand-edit these values; re-run scripts/extract-tokens.mjs instead.
// Everything below (colors, spacing, radius, typography) is built from them.
// ---------------------------------------------------------------------------

export const color = {
  /** 보조 글자. ground 위에서 대비 5.4:1. */
  muted: '#4E6679',
  /** 테두리·구분선. */
  line: '#DCE6EF',
  /** 본문 글자색이자 가장 어두운 면. */
  ink: '#0B2A45',
  /** 카드·사이드바 바탕. */
  surface: '#FFFFFF',
  /** 기본 동작(버튼, 선택된 탭, 링크). 흰 글씨는 이 위에만. */
  brandDeep: '#1E5C8C',
  /** 옅은 파랑 배경 — 칩, 아바타, 빈 섬네일. */
  brandSoft: '#E3EFF8',
  /** 앰버 옅은 면 — 활성 메뉴, 반응 칩. */
  sandSoft: '#FBEBD2',
  /** 앱 아이콘의 파랑. 로고·큰 강조 면적에만. */
  brand: '#2C7CB5',
  /** 화면 바탕. */
  ground: '#F2F6FA',
  /** 앰버 면 위의 글자. */
  sandInk: '#8A5A12',
  /** 본문보다 한 단계 옅은 글자. */
  inkSoft: '#35506A',
  /** 보조 색조 — 계열 구분용. */
  teal: '#1C6B67',
  /** 중립 칩·아바타. */
  neutralSoft: '#E9EEF3',
  /** 파란 면 위의 보조 글자. */
  onBrandMuted: '#D6E5F0',
  /** 따뜻한 강조. 채움색으로만. */
  sand: '#D98F2B',
  /** 입력창처럼 내려앉은 면. */
  surfaceSunken: '#F8FAFC',
  /** 앰버 면의 테두리. */
  sandLine: '#E7C79A',
  /** teal 계열 옅은 면. */
  tealSoft: '#DCEAE7',
  /** tealSoft 위의 글자. */
  tealInk: '#14534F',
} as const;

/** 4px 그리드. 캔버스에서 실제로 쓰인 값. */
export const space = {
  s0: 0,
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s48: 48,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  label: 14,
  body: 15,
  bodyLarge: 16,
  title: 19,
  verseSm: 21,
  heading: 24,
  verse: 27,
  display: 32,
} as const;

/**
 * The canvas asks for Gowun Batang / IBM Plex Sans KR. Neither is loaded yet, so
 * `fontFamily` below still names the loaded faces — swapping them is its own change.
 */
export const font = {
  /** 말씀 인용과 그룹 이름에만. */
  serif: 'Gowun Batang',
  sans: 'IBM Plex Sans KR',
} as const;

export const fontWeight = { regular: '400', medium: '500', bold: '600' } as const;
export const lineHeight = { tight: 1.35, body: 1.65, verse: 1.6 } as const;

/** 최소 터치 영역. */
export const hitSize = 44;

// ---------------------------------------------------------------------------
// Colors — the canvas palette under the names the app already imports
// ---------------------------------------------------------------------------

export const colors = {
  // Surface hierarchy (nested sheets of heavy-stock paper)
  background: color.ground, // base surface
  surface: color.ground, // alias for background
  surfaceContainerLowest: color.surface, // floating elements
  surfaceContainerLow: color.surfaceSunken, // cards on surface
  surfaceContainer: color.brandSoft, // card backgrounds
  surfaceContainerHigh: color.neutralSoft, // recessed sections
  surfaceContainerHighest: color.line, // input backgrounds

  /** Native splash + app icon background (keep in sync with app.json splash / adaptiveIcon) */
  brandSplashBackground: color.brand,

  // Primary — the blue the app icon is cut from
  primary: color.brandDeep,
  primaryContainer: color.brandDeep,
  primaryFixed: color.brandSoft, // input focus background
  onPrimary: color.surface,
  /** Muted text on `primaryContainer` surfaces (e.g. Sacred Gatherings dark cards). */
  onPrimaryContainer: color.onBrandMuted,

  // Secondary — warm amber, fills only
  secondary: color.sandInk,
  secondaryContainer: color.sandSoft,
  onSecondaryContainer: color.sandInk,

  // Text / on-surface
  onSurface: color.ink,
  /** Secondary text. At least 5.3:1 on every surface, including surfaceContainerHighest. */
  onSurfaceVariant: color.inkSoft,
  /**
   * Meta text — timestamps, counts, previews. At least 4.5:1 on white, background,
   * surfaceContainerLow/Container/High; not for text on surfaceContainerHighest.
   */
  textMuted: color.muted,
  /** Light hairline border for chips, dividers and outlined surfaces. */
  outlineVariant: color.line,

  /** Hairline for separators on tinted surfaces (sidebar rails, list dividers). */
  ghostBorder: 'rgba(11, 42, 69, 0.08)',

  // List accents
  /** Unread marker at the left of a list row. */
  unreadIndicator: color.brandDeep,
  /** Outlined tag chip naming where an item belongs. */
  chipBackground: color.surface,
  chipBorder: color.line,
  chipText: color.muted,
  chipAccent: color.sandInk,

  // Glassmorphism
  glass: {
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceStrong: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(255, 255, 255, 0.5)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
  },

  // Semantic (muted, desaturated)
  success: color.teal,
  warning: color.sandInk,
  /** Not in the canvas palette — destructive states keep their own red. */
  error: '#ba1a1a',
  info: color.brandDeep,

  // Focus ring
  focusRing: 'rgba(30, 92, 140, 0.25)',

  /** Recurring meeting card divider (body is white; join row uses secondaryContainer) */
  recurringMeetingCardDivider: 'rgba(11, 42, 69, 0.12)',

  // ---------------------------------------------------------------------------
  // Backward-compat aliases (map old names → new values during migration)
  // ---------------------------------------------------------------------------
  textPrimary: color.ink,
  textSecondary: color.inkSoft,
  ink700: color.inkSoft,
  ink300: color.line,
  ink500: color.muted,
  brandSoft: color.brandSoft,
  surfaceHighlight: color.surfaceSunken,
  surface100: color.brandSoft,
  cardDefault: color.surface,
  cardAlt: color.surfaceSunken,
  cardHighlight: color.ground,
  primaryDark: color.ink,
  primaryLight: color.brandSoft,
  accent: color.brandDeep,
  accentSoft: color.brandSoft,
  lavender: color.brandDeep,
  lavenderSoft: color.brandSoft,
  blue: color.brandDeep,
  blueSoft: color.brandSoft,
  peach: color.sandSoft,
  greenSoft: color.tealSoft,
  amberSoft: color.sandSoft,
  shadow: color.ink,
  borderSubtle: 'rgba(11, 42, 69, 0.08)',
} as const;

// ---------------------------------------------------------------------------
// Spacing (generous, editorial breathing room)
// ---------------------------------------------------------------------------

export const spacing = {
  xxs: space.s4,
  xs: space.s8,
  sm: space.s12,
  md: space.s16,
  lg: space.s24,
  xl: space.s32,
  xxl: space.s48,
  screenHorizontal: space.s20,
  cardPadding: space.s16,
  cardPaddingTop: space.s16,
  cardPaddingBottom: space.s24,
  cardGap: space.s16,
  sectionGap: space.s32, // between feed items
  majorSectionGap: space.s48, // between major sections
} as const;

// ---------------------------------------------------------------------------
// Radius (nothing sharper than sm/4px — prioritize lg and xl)
// ---------------------------------------------------------------------------

export const radius = {
  /** Canvas names */
  xs: 8,
  control: 10,
  field: 12,
  card: 16,
  feature: 18,
  pill: 999,

  // Names the app already imports, mapped onto the same scale
  sm: 8,
  md: 8,
  button: 999, // pill shape — "Soft-Touch CTA"
  sacredGatheringCard: 18,
  chip: 999,
  lg: 12,
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
    fontSize: fontSize.display,
    fontWeight: '400' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  headlineLg: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.display,
    fontWeight: '400' as const,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  headlineMd: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.verse,
    fontWeight: '400' as const,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  headlineSm: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.heading,
    fontWeight: '400' as const,
    lineHeight: 32,
    letterSpacing: -0.1,
  },

  // Sans — Plus Jakarta Sans (body, labels, buttons)
  titleLg: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.title,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  titleMd: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodyLarge,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodyLg: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.bodyLarge,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.label,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelLg: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.label,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  labelMd: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.caption,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  labelSm: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  buttonLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.label,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },

  // ---------------------------------------------------------------------------
  // Backward-compat aliases (old names → new editorial styles)
  // ---------------------------------------------------------------------------
  h1: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.display,
    fontWeight: '400' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.heading,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.title,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
  },
  title: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.title,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.body,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.body,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.small,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.caption,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.small,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.bodyLarge,
    fontWeight: '500' as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Shadow — Tonal layering preferred; ambient shadow for floating elements only
// ---------------------------------------------------------------------------

export const shadow = {
  ambient: {
    shadowColor: color.ink,
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
    fontSize: fontSize.caption,
  },
  unreadDot: {
    size: spacing.xs,
  },
  count: {
    fontSize: fontSize.caption,
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
  color,
  space,
  fontSize,
  font,
  fontWeight,
  lineHeight,
  hitSize,
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
