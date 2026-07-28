---
title: 'App-wide Spacious & Calm Redesign'
slug: 'app-wide-spacious-calm-redesign'
created: '2026-02-13'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Expo (React Native)', 'Expo Router', 'react-native-reanimated', 'react-native-safe-area-context']
files_to_modify: ['theme/tokens.ts', 'constants/Colors.ts', 'components/primitives/Card.tsx', 'components/primitives/Button.tsx', 'components/primitives/Input.tsx', 'components/primitives/Avatar.tsx', 'components/primitives/ListItem.tsx', 'components/primitives/Badge.tsx', 'components/EditScreenInfo.tsx', 'components/Themed.tsx', 'app/(tabs)/_layout.tsx', 'app/(tabs)/index.tsx', 'app/(tabs)/profile.tsx', 'app/(tabs)/groups.tsx', 'app/(tabs)/messages.tsx', 'app/auth/sign-in.tsx', 'app/auth/sign-up.tsx', 'app/auth/onboarding.tsx', 'app/profile/edit.tsx', 'app/modal.tsx']
code_patterns: ['Design tokens in theme/tokens.ts; primitives consume tokens only; no hard-coded hex values', 'constants/Colors used by tab layout and Themed.tsx; align tint with tokens.primary', 'use useSafeAreaInsets from react-native-safe-area-context for screen top padding (auth/onboarding)']
test_patterns: ['Jest (ts-jest); co-located __tests__; snapshot updates if primitives change; manual QA for animations']
---

# Tech-Spec: App-wide Spacious & Calm Redesign

**Created:** 2026-02-13

## Overview

### Problem Statement

The app currently uses the Warm & Soft theme and feels dated. Users expect a modern, inviting UI comparable to popular apps like Calm and Headspace.

### Solution

Overhaul the design system to a Spacious & Calm aesthetic inspired by the UX design directions. Update tokens (colors, spacing, typography, radius, shadows), align all primitives and screens to the new system, and add subtle animations that enhance the experience without being distracting.

### Scope

**In Scope:**
- Full token/system change in `theme/tokens.ts` (Spacious & Calm–inspired palette)
- All screens updated: Home, Profile, Groups, Messages, sign-in, sign-up, onboarding, profile/edit
- Placeholder screens (Groups, Messages) restyled to match the new theme
- Subtle animations (e.g., screen transitions, card entry, button feedback) that feel polished and modern
- Color palette chosen to work well together (primary, accent, neutrals)

**Out of Scope:**
- New features or flows
- Major structural or navigation changes
- Heavy or complex animation systems

## Context for Development

### Codebase Patterns

- **Design tokens:** `theme/tokens.ts` is the single source of truth. Current: Warm & Soft (#faf8f5 background, #3d2c29 text, radius.card 12, spacing.md 16). Primitives consume tokens only; no hard-coded hex values in primitives.
- **constants/Colors.ts:** `tintColorLight #2f95dc` (does not match tokens.primary #2C7CB5). Used by `app/(tabs)/_layout.tsx` (tabBarActiveTintColor, headerRight icon) and `Themed.tsx` (useThemeColor). Align tint with tokens.primary.
- **EditScreenInfo:** Uses `Colors.light.tint`, `rgba(0,0,0,0.8)`, `rgba(0,0,0,0.05)`; uses Themed Text/View. Replace with tokens (colors.textPrimary, colors.textSecondary, colors.primary).
- **Themed.tsx:** useThemeColor reads from Colors.light/Colors.dark. Light mode: align Colors.light with tokens (text, background, tint). Dark mode: out of scope; keep as-is or minimal.
- **Card primitive:** Currently shadowRadius 4, shadowOffset { height: 1 }. Spec: shadowRadius 20, shadowOffset { height: 4 }; add `shadow.card` token.
- **Screens:** Auth (sign-in, sign-up, onboarding) use `paddingTop: spacing.xl * 2` (64px) without SafeAreaInsets. Add `useSafeAreaInsets` from `react-native-safe-area-context`; top padding = insets.top + spacing.lg (or similar).
- **Groups/Messages:** Hard-coded `#eee` (separator), `fontSize: 20`, `opacity: 0.7`. Use tokens (colors.surfaceHighlight or colors.textSecondary, typography.h2/h3, colors.textSecondary).
- **modal.tsx:** Hard-coded `#eee`, `fontSize: 20`, `fontWeight: bold`. Use tokens; add to files_to_modify.
- **Tab layout:** tabBarStyle `minHeight: 88, paddingTop: 16, paddingBottom: 8`. Spec: `paddingTop: 20, paddingBottom: 32` (Spacious & Calm).
- **Animations:** react-native-reanimated installed. Use FadeIn, withSpring for press (scale 0.97). No use of Reanimated in app code yet.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `theme/tokens.ts` | Central token update: colors, spacing, radius, typography, shadows |
| `constants/Colors.ts` | Align tab bar tint with new primary |
| `components/primitives/*.tsx` | Card, Button, Input, Avatar, ListItem, Badge – consume tokens |
| `components/Themed.tsx` | Light/dark themed Text/View |
| `app/(tabs)/_layout.tsx` | Tab bar styling |
| `app/(tabs)/index.tsx` | Home screen – example Card usage |
| `app/(tabs)/profile.tsx` | Profile – cards, header, actions |
| `app/(tabs)/groups.tsx` | Groups placeholder – currently hard-coded styles |
| `app/(tabs)/messages.tsx` | Messages placeholder – currently hard-coded styles |
| `app/auth/sign-in.tsx` | Auth – form layout, tokens |
| `app/auth/sign-up.tsx` | Auth – form layout, tokens |
| `app/auth/onboarding.tsx` | Onboarding – form, SelectField, modal styles |
| `app/profile/edit.tsx` | Profile edit – form, read-only blocks |
| `components/EditScreenInfo.tsx` | Edit screen info – replace Colors/rgba with tokens (used on Home, modal) |
| `components/ExternalLink.tsx` | May use Colors; verify and align if needed |
| `components/StyledText.tsx` | MonoText used by EditScreenInfo; verify styling |
| `app/modal.tsx` | Modal screen – replace hard-coded #eee, fontSize with tokens |
| `_bmad-output/planning-artifacts/ux-design-directions.html` | Spacious & Calm reference (Direction 4) |

### Technical Decisions

- **Palette:** Spacious & Calm base (#fafafa background, #1a1a1a text, #2C7CB5 primary); extend with accent if desired (e.g. warm accent for CTAs or highlights).
- **Cards:** 16px radius, 24px padding, margin 20px, soft shadow instead of borders; elevation via shadow.
- **Spacing:** More generous—screen top padding ~48–52px, horizontal 20–24px; card spacing 20px between items.
- **Typography:** Clean, readable; card titles ~17px; hierarchy via weight and size.
- **Animations:** Use react-native-reanimated; FadeIn/FadeOut for screen/list entry, withSpring (or scale 0.97) for press feedback; optional staggered list entry (50ms stagger); duration 200–300ms; avoid blocking interactions.
- **Shadow token:** Add `shadow.card` in tokens: `{ shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } }`; Card primitive uses this (no hardcoded shadow values).
- **Tab bar:** Align tint with primary; increase padding (20px 24px 32px) per Spacious & Calm reference.
- **Dark mode:** Light mode only for this pass; dark tokens and Themed.tsx dark variants can follow later.

## Implementation Plan

**Implementation order:** (1) Tokens → (2) Primitives → (3) Layout (tab bar) → (4) Screens → (5) Animations. This keeps dependency order clear.

### Animations

All animations use `react-native-reanimated`. Duration 200–300ms; non-blocking.

| Animation | Target | API | Details |
| --------- | ------ | --- | ------- |
| **Button press** | Button primitive | `withSpring` or `Animated.View` + scale transform | Scale 0.97 on press in, 1 on press out. Fallback: opacity 0.85. |
| **Screen enter** | Home, Profile, Groups, Messages, auth screens | `FadeIn` | Wrap main content; duration 200–300ms. |
| **Card/list stagger** | Optional—lists of cards | `FadeIn` + `delay` | 50ms stagger per item; defer if scope creep. |

**Implementation tasks:** See Tasks 4 (Button), 17 (FadeIn), 18 (stagger—optional).

### Tasks

- [ ] **Task 1: Update design tokens in theme/tokens.ts**
  - File: `theme/tokens.ts`
  - Action: Replace Warm & Soft tokens with Spacious & Calm. Set `colors.background` = `#fafafa`, `colors.textPrimary` = `#1a1a1a`, `colors.textSecondary` = `rgba(26, 26, 26, 0.8)`. Keep `colors.primary` = `#2C7CB5`, `colors.surface` = `#ffffff`, `colors.surfaceHighlight` = `#e8eef5`. Add `radius.card` = 16, `radius.button` = 12. Add `spacing.screenHorizontal` = 20, `spacing.cardPadding` = 24, `spacing.cardGap` = 20. Add `shadow.card` = `{ shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } }`. Add `typography.cardTitle` = `{ fontSize: 17, fontWeight: '600' }`. Update comment header to "Spacious & Calm".
  - Notes: Preserve success, warning, error, accent, avatarSizes, minTouchTarget.

- [ ] **Task 2: Align constants/Colors.ts with tokens**
  - File: `constants/Colors.ts`
  - Action: Set `tintColorLight` = `#2C7CB5` (match tokens.primary). Set `Colors.light.text` = `#1a1a1a`, `Colors.light.background` = `#fafafa`.
  - Notes: Dark mode unchanged for this pass.

- [ ] **Task 3: Update Card primitive**
  - File: `components/primitives/Card.tsx`
  - Action: Use `radius.card` (16), `spacing.cardPadding` (24), `shadow.card` from tokens. Replace hardcoded shadow with `shadow.card` (shadowColor, shadowOffset, shadowOpacity, shadowRadius from token).
  - Notes: elevation 2 for Android.

- [ ] **Task 4: Update Button primitive with press animation**
  - File: `components/primitives/Button.tsx`
  - Action: Wrap Pressable in Animated from react-native-reanimated. Add `withSpring` scale transform (1 → 0.97) on press in/out. Duration ~200ms. Fallback: keep opacity 0.85 if Reanimated proves tricky.
  - Notes: Ensure minTouchTarget and accessibility preserved.

- [ ] **Task 5: Update Input primitive**
  - File: `components/primitives/Input.tsx`
  - Action: Use `radius.button` from tokens. Ensure border radius and padding align with Spacious & Calm (slightly more padding if spacing.cardPadding suggests).
  - Notes: Primitive already consumes tokens; verify no hardcoded values.

- [ ] **Task 6: Verify Avatar, ListItem, Badge primitives**
  - Files: `components/primitives/Avatar.tsx`, `ListItem.tsx`, `Badge.tsx`
  - Action: Ensure all use tokens only. ListItem `radius.chip` if used; Badge uses colors. No changes if already compliant.
  - Notes: Avatar fallback uses colors.primary; verify contrast.

- [ ] **Task 7: Update tab layout**
  - File: `app/(tabs)/_layout.tsx`
  - Action: Set `tabBarStyle` = `{ minHeight: 88, paddingTop: 20, paddingBottom: 32 }`. `tabBarActiveTintColor` and header icon already use Colors; will pick up Task 2.
  - Notes: tabBarLabelStyle can add marginTop/marginBottom for spacing.

- [ ] **Task 8: Update Themed.tsx**
  - File: `components/Themed.tsx`
  - Action: Align `Colors.light` usage (handled by Task 2). If useThemeColor needs explicit token import for tint, add fallback to tokens.primary.
  - Notes: Dark mode out of scope; keep existing dark values.

- [ ] **Task 9: Update EditScreenInfo**
  - File: `components/EditScreenInfo.tsx`
  - Action: Replace `Colors.light.tint` with `colors.primary` from tokens. Replace `rgba(0,0,0,0.8)` with `colors.textSecondary`, `rgba(0,0,0,0.05)` with `colors.surfaceHighlight`. Import tokens. Remove Themed lightColor/darkColor overrides; use tokens directly for light mode.
  - Notes: MonoText and ExternalLink: verify ExternalLink uses tokens or Colors; align if needed.

- [ ] **Task 10: Add SafeAreaInsets to auth screens**
  - Files: `app/auth/sign-in.tsx`, `app/auth/sign-up.tsx`, `app/auth/onboarding.tsx`
  - Action: Import `useSafeAreaInsets` from `react-native-safe-area-context`. Set scroll/content `paddingTop` = `insets.top + spacing.lg` (or `insets.top + spacing.xl`).
  - Notes: Replace current `paddingTop: spacing.xl * 2` with insets-aware value.

- [ ] **Task 11: Update Home screen**
  - File: `app/(tabs)/index.tsx`
  - Action: Use tokens for container, title, separator. Add horizontal padding `spacing.screenHorizontal`. Card margin `spacing.cardGap`. Optionally wrap content in FadeIn (entering) from Reanimated.
  - Notes: EditScreenInfo will inherit token updates from Task 9.

- [ ] **Task 12: Update Profile screen**
  - File: `app/(tabs)/profile.tsx`
  - Action: Replace card styles: use `radius.card`, `spacing.cardPadding`, `spacing.cardGap`, `shadow.card`. Use `typography.cardTitle` for card titles. Ensure background, text colors from tokens.
  - Notes: noticeCard and card share same token-based styling.

- [ ] **Task 13: Update Groups placeholder**
  - File: `app/(tabs)/groups.tsx`
  - Action: Replace `#eee` with `colors.surfaceHighlight`. Replace `fontSize: 20, fontWeight: bold` with `typography.h2`. Replace `opacity: 0.7` with `colors.textSecondary`. Use `colors.background` for container. Add horizontal padding `spacing.screenHorizontal`.
  - Notes: Center layout; use tokens throughout.

- [ ] **Task 14: Update Messages placeholder**
  - File: `app/(tabs)/messages.tsx`
  - Action: Same as Task 13—replace hardcoded styles with tokens.
  - Notes: Match Groups styling for consistency.

- [ ] **Task 15: Update Profile edit screen**
  - File: `app/profile/edit.tsx`
  - Action: Use tokens for container, readOnlyBlock (radius.card, spacing.cardPadding, colors), label, form rows. Ensure background and text from tokens.
  - Notes: Input and Button inherit from primitives.

- [ ] **Task 16: Update modal screen**
  - File: `app/modal.tsx`
  - Action: Replace `#eee` with `colors.surfaceHighlight`. Replace `fontSize: 20, fontWeight: bold` with `typography.h2`. Use `colors.background` for container. Add tokens import.
  - Notes: EditScreenInfo used here; inherits Task 9.

- [ ] **Task 17: Add FadeIn to key screens**
  - Files: `app/(tabs)/index.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/groups.tsx`, `app/(tabs)/messages.tsx`, `app/auth/sign-in.tsx`, `app/auth/sign-up.tsx`, `app/auth/onboarding.tsx`
  - Action: Wrap main content in `FadeIn` from react-native-reanimated (duration 200–300ms). Use `entering={FadeIn.duration(250)}` on Animated.View or equivalent.
  - Notes: Part of dedicated Animations section; implement after screen layout updates.

- [ ] **Task 18: Add optional card stagger (lists)**
  - Files: Any screen with a list of cards (e.g. Profile sections, future Home cards)
  - Action: Apply `FadeIn.delay(index * 50)` to each list item. Defer if scope creep.
  - Notes: Optional; low priority.

### Acceptance Criteria

- [ ] **AC1:** Given the app is launched, when the user views any screen, then the background is #fafafa, text is #1a1a1a, and primary accent is #2C7CB5 throughout (Spacious & Calm palette).
- [ ] **AC2:** Given the user is on the Home, Profile, Groups, or Messages tab, when the screen renders, then cards have 16px radius, 24px padding, and soft shadow (0 4px 20px rgba(0,0,0,0.06)); no hard-coded hex values in primitives.
- [ ] **AC3:** Given the user is on sign-in, sign-up, or onboarding, when the screen renders, then top padding respects SafeAreaInsets (content not clipped by notch).
- [ ] **AC4:** Given the user taps a primary or secondary Button, when the press occurs, then the button shows subtle feedback (scale 0.97 or opacity change).
- [ ] **AC5:** Given the user views the tab bar, when comparing to the Spacious & Calm reference, then the tab bar has paddingTop 20px, paddingBottom 32px, and active tint #2C7CB5.
- [ ] **AC6:** Given the user views EditScreenInfo (Home or modal), when the component renders, then it uses tokens (primary, textSecondary, surfaceHighlight)—no Colors.light.tint or rgba overrides.
- [ ] **AC7:** Given the user views Groups or Messages placeholder, when the screen renders, then there are no hard-coded #eee or opacity: 0.7; typography and colors come from tokens.
- [ ] **AC8:** Given the user views Profile or Profile edit, when cards and read-only blocks render, then they use radius.card, spacing.cardPadding, and shadow.card from tokens.
- [ ] **AC9:** Given WCAG 2.1 AA contrast requirements, when primary (#2C7CB5) and text (#1a1a1a) are used on background (#fafafa) and surface (#ffffff), then contrast ratios meet 4.5:1 for normal text.
- [ ] **AC10:** Given the user navigates between tabs and auth screens, when screens render, then no visual regressions (no missing styles, no white flashes, consistent spacing).
- [ ] **AC11:** Given the user opens Home, Profile, Groups, Messages, or an auth screen, when the screen first renders, then content fades in over 200–300ms (FadeIn animation).

## Additional Context

### Dependencies

- react-native-reanimated: already in package.json
- react-native-safe-area-context: already in package.json (Expo ships it)
- No new npm packages required

### Testing Strategy

- **Unit:** Existing Jest tests for lib/api; primitives may need snapshot updates if structure changes.
- **Manual:** Launch app on iOS simulator; verify all screens (Home, Profile, Groups, Messages, sign-in, sign-up, onboarding, profile/edit, modal) render with new theme. Verify SafeAreaInsets on device with notch. Verify button press feedback. Verify tab bar styling.
- **Regression:** Compare before/after screenshots for layout and color consistency.

### Notes

- Calm/Headspace inspiration: young, modern, calm, inviting; subtle micro-interactions.
- WCAG 2.1 AA contrast must be maintained.
- Task 17 (FadeIn) is optional; implement only if time permits.
- Dark mode: out of scope; keep Themed.tsx dark values as-is.
