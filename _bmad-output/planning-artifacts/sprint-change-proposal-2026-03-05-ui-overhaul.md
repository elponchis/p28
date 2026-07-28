# Sprint Change Proposal — Full UI/UX Overhaul (Glassmorphism + Light Pastel Blue)

**Date:** 2026-03-05  
**Project:** p28-v2  
**Change Scope:** Moderate — Backlog reorganization and design system overhaul  
**Mode:** Batch

---

## 1. Issue Summary

### Problem Statement

The app needs a full UI/UX redesign to invoke **bliss and calm** for a church platform. The current design uses a Minimal Monochrome aesthetic (muted lavender-blue #8B9BB8, warm off-whites) that does not match the desired emotional response. The user wants a **light pastel blue** primary color with a **glassmorphism feel**, inspired by the PharmaNova pharmacy app design.

### Trigger

Product decision to overhaul the visual design system to:
- Replace primary color with light pastel blue
- Introduce glassmorphism (frosted glass, semi-transparent surfaces, backdrop blur)
- Create a calm, blissful church-platform aesthetic
- Align spacing, padding, and component styling with the inspiration design

### Evidence

- User provided PharmaNova screenshot as inspiration (teal/turquoise primary, glassmorphic cards, floating tab bar, generous spacing)
- Current `theme/tokens.ts`: Minimal Monochrome (#8B9BB8, #F7F6F3)
- Current `constants/Colors.ts`: Same palette
- UX spec (2026-02-11): Warm & Soft baseline (#2C7CB5, #faf8f5) — never fully implemented; current codebase uses different tokens

---

## 2. Deep Design Analysis (PharmaNova Inspiration)

### 2.1 High-Level Design Characteristics

| Element | PharmaNova | Target for p28-v2 (Church) |
|--------|------------|----------------------------|
| Primary color | Teal/turquoise (#2EC4B6) | Light pastel blue (e.g. #A8C5E0, #B8D4E8) |
| Background | Light gradient, subtle blurred patterns | Very light pastel blue-grey or off-white with soft gradients |
| Surfaces | Semi-transparent, frosted glass | Glassmorphism: rgba(255,255,255,0.7–0.85) + backdrop blur |
| Border radius | Large (8–12px+), rounded corners | Consistent large radius (12–16px cards, 8–12px buttons) |
| Spacing | Generous (24–32px vertical, 16–24px horizontal) | Same — calm, spacious feel |
| Typography | Clear hierarchy, sans-serif | Same; friendly, legible |
| Shadows | Subtle elevation on floating elements | Soft shadows for depth |

### 2.2 Extrapolated Components and UI Elements

| Component | Description | Current Implementation | Changes Needed |
|-----------|-------------|------------------------|----------------|
| **FloatingTabBar** | Rounded pill, floats above content, shadow | `FloatingTabBar.tsx` | Glassmorphism: semi-transparent bg, backdrop blur, light pastel blue active state |
| **Card** | Container for content blocks | `Card.tsx` | Glassmorphism: rgba surface, blur, subtle border; larger radius |
| **GroupCard** | Group/forum/ministry card | `GroupCard.tsx` | Apply glassmorphic Card; pastel blue accents for badges/buttons |
| **Button** | Primary (filled), Secondary (outlined) | `Button.tsx` | Primary: light pastel blue; Secondary: light fill or outline; 44pt min height |
| **Input / Search** | Text field with icons | `Input.tsx` | Rounded, light grey or glassmorphic bg; leading/trailing icons |
| **Avatar** | Profile image or initial | `Avatar.tsx` | Same structure; ensure contrast on glassmorphic surfaces |
| **Badge** | Status or category label | `Badge.tsx` | Pastel blue for primary; soft neutrals for neutral |
| **SectionHeader** | Section title | `SectionHeader.tsx` | Typography hierarchy; pastel blue accent where appropriate |
| **EmptyState** | Empty list placeholder | `EmptyState.tsx` | Calm imagery; pastel accents |
| **AddSheet** | Bottom sheet for add/create | `AddSheet.tsx` | Glassmorphic panel; rounded top corners |
| **ListItem** | Row with avatar, title, meta | `ListItem.tsx` | Glassmorphic or light surface; 44pt touch target |
| **IconButton** | Icon-only button | `IconButton.tsx` | Outline or soft fill; pastel blue when active |

### 2.3 Spacing and Layout (Extrapolated)

| Token | PharmaNova (est.) | Recommended for p28-v2 |
|-------|-------------------|------------------------|
| Screen horizontal padding | 16–24px | 20px (align with `spacing.screenHorizontal`) |
| Section vertical gap | 24–32px | 24–32px |
| Card internal padding | 16–20px | 16px |
| Card gap (between cards) | 12–16px | 12px |
| Button padding (vertical) | 12–16px | 12–14px |
| Button padding (horizontal) | 20–24px | 20px |
| Touch target min | 44pt | 44pt (unchanged) |

### 2.4 Glassmorphism Implementation

**React Native considerations:**
- `BlurView` from `expo-blur` for backdrop blur on iOS/Android
- Semi-transparent backgrounds: `rgba(255, 255, 255, 0.75)` or `rgba(248, 250, 252, 0.9)` for light pastel
- Subtle 1px border: `rgba(255, 255, 255, 0.4)` or `rgba(0, 0, 0, 0.04)` for definition
- Shadow: soft, diffuse (shadowRadius 20–24, shadowOpacity 0.06–0.08)

**Token additions:**
```ts
// theme/tokens.ts additions
glass: {
  surface: 'rgba(255, 255, 255, 0.8)',
  surfaceStrong: 'rgba(255, 255, 255, 0.95)',
  border: 'rgba(255, 255, 255, 0.5)',
  blurAmount: 10,
},
```

---

## 3. Impact Analysis

### Epic Impact

| Epic | Impact |
|------|--------|
| Epic 1 (App foundation) | **High** — Story 1.2 (Design tokens and core primitives) is the primary change; all primitives and tokens |
| Epic 2 (Groups) | **Moderate** — GroupCard, Groups tab, group detail screens |
| Epic 3 (Discovery) | **Moderate** — Browse, search, join/leave UI |
| Epic 4 (Home, events) | **Moderate** — Home feed, EventCard, AnnouncementCard |
| Epic 5 (Messaging) | **Moderate** — Message list, thread UI |
| Epic 6 (Push) | **Low** — Notification UI only |
| Epic 7 (Leader tools) | **Moderate** — Compose, audience selector |

### Story Impact

- **Story 1.2 (Design tokens and core primitives):** Update acceptance criteria to include light pastel blue primary, glassmorphism tokens, and new spacing/radius values.
- **All stories using UI:** Will consume updated tokens and primitives; no story removal or addition.

### Artifact Conflicts

| Artifact | Conflict | Action |
|----------|----------|--------|
| **UX Design Specification** | Design direction, color system, design tokens | Update Visual Design Foundation, Design Direction, Design Tokens |
| **Architecture** | Design system section | Note design system evolution; no structural changes |
| **theme/tokens.ts** | Full palette and token set | Replace with new palette and glassmorphism tokens |
| **constants/Colors.ts** | Tint and background | Align with new primary |
| **All components** | Use current tokens | Refactor to use new tokens; add glassmorphism where specified |

### Technical Impact

- **Dependencies:** Add `expo-blur` for BlurView (if not present)
- **Theme:** Single source of truth in `theme/tokens.ts`; all components import from there
- **No schema or API changes**

---

## 4. Recommended Approach

**Selected approach:** Direct Adjustment

**Rationale:**
- Visual-only change; no data model or API impact
- Design tokens and primitives are the leverage point; update once, propagate everywhere
- Effort: Medium (tokens, primitives, patterns, screens)
- Risk: Low
- Timeline: 1 sprint for core tokens + primitives + key screens; follow-on for remaining screens

---

## 5. Detailed Change Proposals (Batch)

### 5.1 theme/tokens.ts

**OLD (excerpt):**
```ts
primary: '#8B9BB8',
background: '#F7F6F3',
surface: '#FFFFFF',
```

**NEW:**
```ts
// Primary — light pastel blue (bliss and calm)
primary: '#A8C5E0',
primaryDark: '#8FB4D9',
primaryLight: '#C5DAF0',
onPrimary: '#FFFFFF',

// Background — very light, calming
background: '#F5F8FC',
backgroundAlt: '#EEF4FA',

// Surfaces
surface: '#FFFFFF',
surfaceHighlight: '#F8FAFD',

// Glassmorphism
glass: {
  surface: 'rgba(255, 255, 255, 0.8)',
  surfaceStrong: 'rgba(255, 255, 255, 0.95)',
  border: 'rgba(255, 255, 255, 0.5)',
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
},

// Radius — larger for calm, rounded feel
radius: {
  sm: 8,
  button: 12,
  card: 16,
  chip: 999,
  lg: 12,
  xl: 20,
},

// Spacing — generous for calm
spacing: {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  screenHorizontal: 20,
  cardPadding: 16,
  cardGap: 12,
  sectionGap: 28,
},
```

**Rationale:** Light pastel blue (#A8C5E0) invokes calm; glassmorphism tokens enable frosted surfaces; larger radius and spacing support blissful, spacious feel.

---

### 5.2 constants/Colors.ts

**OLD:**
```ts
const tintColor = '#8B9BB8';
```

**NEW:**
```ts
const tintColor = '#A8C5E0'; // Light pastel blue
```

**Rationale:** Tab bar and global tint align with new primary.

---

### 5.3 UX Design Specification

**Section: Visual Design Foundation → Color System**

**OLD:** Primary #2C7CB5 (Warm & Soft) or current Minimal Monochrome

**NEW:**
- **Primary:** Light pastel blue (#A8C5E0) for primary actions and key UI—invokes bliss and calm.
- **Complementary accent:** Soft lavender or warm white for secondary highlights; avoid harsh contrast.
- **Background:** Very light pastel blue-grey (#F5F8FC) or off-white with subtle gradient.
- **Glassmorphism:** Semi-transparent surfaces (rgba 0.75–0.95) with backdrop blur for cards, tab bar, sheets.

**Section: Design Direction Decision**

**OLD:** Direction 1 — Warm & Soft

**NEW:** Direction — **Calm & Glass** (light pastel blue, glassmorphism, generous spacing, church platform bliss)

**Section: Design Tokens**

Update to match `theme/tokens.ts` changes above.

---

### 5.4 FloatingTabBar.tsx

**Changes:**
- Replace `backgroundColor: colors.surface` with glassmorphism: `BlurView` + `backgroundColor: colors.glass.surface` (or equivalent)
- Active tab: `colors.primary` (light pastel blue)
- Ensure `expo-blur` is installed; wrap pill in `BlurView` with `blurType="light"` (iOS) / `BlurView` (Android)

**Rationale:** Floating tab bar is a key glassmorphism surface; matches PharmaNova inspiration.

---

### 5.5 Card.tsx (Primitive)

**Changes:**
- Add optional `variant="glass"` prop
- When `variant="glass"`: use `BlurView` or semi-transparent background + border; when default: keep solid surface
- Increase `borderRadius` to `radius.card` (16)
- Softer shadow for elevation

**Rationale:** Cards (GroupCard, EventCard, etc.) are primary content containers; glassmorphism creates calm, layered feel.

---

### 5.6 GroupCard.tsx

**Changes:**
- Use Card with `variant="glass"` or apply glassmorphic styles
- Primary button: `colors.primary` (light pastel blue)
- Badge: use `primary` variant for ministry, `neutral` for forum
- Ensure contrast on glassmorphic background

**Rationale:** Group cards are high-visibility; glassmorphism + pastel blue supports church platform aesthetic.

---

### 5.7 Button.tsx

**Changes:**
- Primary: `backgroundColor: colors.primary` (light pastel blue), `color: colors.onPrimary`
- Secondary: outline or soft fill with `colors.primaryLight` or `colors.brandSoft`
- Border radius: `radius.button` (12)
- Min height: 48 (44pt+)

**Rationale:** Buttons are primary CTAs; pastel blue conveys calm and trust.

---

### 5.8 Input.tsx

**Changes:**
- Background: light grey or glassmorphic (`colors.surfaceHighlight` or glass)
- Border radius: 12
- Leading/trailing icon support for search (magnifying glass, filter)

**Rationale:** Search and form inputs should feel soft and integrated.

---

### 5.9 Auth Screens (AuthFormLayout, authScreenStyles)

**Changes:**
- Background: soft gradient or light pastel
- Buttons: primary pastel blue
- Optional: hero image/graphic placeholder for serene church imagery

**Rationale:** First impression; bliss and calm from first screen.

---

### 5.10 Additional Components

| Component | Change |
|----------|--------|
| **Badge** | Primary variant: light pastel blue |
| **Avatar** | Ensure contrast on glass surfaces |
| **SectionHeader** | Pastel blue accent for key sections |
| **EmptyState** | Calm illustration or icon; pastel accents |
| **AddSheet** | Glassmorphic panel; rounded top corners |
| **ListItem** | Light surface or glass; 44pt touch target |
| **IconButton** | Pastel blue when active |

---

## 6. Implementation Handoff

### Scope Classification

**Moderate** — Backlog reorganization and design system overhaul. Development team implements; PO/SM may need to sequence stories (e.g. 1.2 first, then UI-heavy stories).

### Handoff To

**Development team** for direct implementation.

### Deliverables

1. **theme/tokens.ts** — New color palette, glassmorphism tokens, spacing, radius
2. **constants/Colors.ts** — Updated tint
3. **expo-blur** — Add dependency if not present
4. **Primitives** — Card (glass variant), Button, Input, Badge, Avatar, IconButton, ListItem
5. **Patterns** — FloatingTabBar, GroupCard, SectionHeader, EmptyState, AddSheet, OrgStructureRow
6. **Screens** — Auth, Groups, Home, Profile, etc. (consume updated tokens)
7. **UX Design Specification** — Updated design direction and tokens

### Success Criteria

- Primary color is light pastel blue (#A8C5E0 or approved variant)
- FloatingTabBar and key cards use glassmorphism (frosted, semi-transparent)
- Spacing and radius feel generous and calm
- All interactive elements meet 44pt touch target and WCAG 2.1 AA contrast
- User testing confirms "bliss and calm" emotional response

### Suggested Implementation Order

1. Update `theme/tokens.ts` and `constants/Colors.ts`
2. Add `expo-blur`; implement BlurView in FloatingTabBar and Card
3. Update Button, Input, Badge, Avatar primitives
4. Update GroupCard, SectionHeader, EmptyState, AddSheet patterns
5. Update auth screens, Groups tab, Home, Profile
6. Update UX Design Specification document

---

## 7. Checklist Summary

| Section | Status |
|---------|--------|
| 1.1 Triggering story | N/A — design initiative |
| 1.2 Core problem | Done — full UI/UX redesign for bliss/calm |
| 1.3 Evidence | Done — PharmaNova inspiration, user requirements |
| 2.1 Epic impact | Done — Epic 1 high; 2–7 moderate/low |
| 2.2 Epic-level changes | Done — Story 1.2 update; no new epics |
| 3.1 PRD | Done — No conflict; emotional goals align |
| 3.2 Architecture | Done — Design system evolution |
| 3.3 UX | Done — Major update to Visual Design Foundation |
| 3.4 Other artifacts | Done — tokens, Colors, all components |
| 4.1 Direct Adjustment | Viable |
| 4.2 Rollback | Not viable |
| 4.3 MVP Review | Not needed |
| 4.4 Selected path | Direct Adjustment |
| 5.x Proposal components | Done |
| 6.x Final review | Pending user approval |

---

## 8. Appendix: Color Palette Reference

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #A8C5E0 | Primary actions, active states, links |
| primaryDark | #8FB4D9 | Hover/pressed primary |
| primaryLight | #C5DAF0 | Soft fills, secondary accents |
| background | #F5F8FC | Screen background |
| surface | #FFFFFF | Solid cards, panels |
| glass.surface | rgba(255,255,255,0.8) | Frosted cards, tab bar |
| textPrimary | #1C1C1C | Main text |
| textSecondary | #5A5850 | Secondary text |

*Contrast: Verify primary on white meets WCAG 2.1 AA for large text (3:1). Primary #A8C5E0 on white may need darkening for body text; use primaryDark or darker variant for small text.*
