# Design System Document: The Sanctuary Editorial

## 1. Overview & Creative North Star

### Creative North Star: "The Digital Hearth"

This design system moves away from the rigid, utilitarian "app" aesthetic and toward a high-end editorial experience. It is designed to feel like an open invitation—warm, spacious, and deeply personal. We achieve this by rejecting the "standard" mobile grid in favor of **intentional asymmetry** and **tonal depth**.

By leveraging a sophisticated "High-End Editorial" approach, we use overlapping elements and generous negative space to evoke a sense of peace. The interface should feel less like a software tool and more like a beautifully curated community journal.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a "Spirit and Earth" duality: deep, authoritative blues (`primary`) balanced by warm, illuminating golds (`secondary`).

### The "No-Line" Rule

**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be created exclusively through background color shifts.

- _Example:_ A `surface-container-low` (#f0f3ff) card sitting on a `surface` (#f9f9ff) background.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers—like stacked sheets of heavy-stock paper. Use the surface-container tiers to create a "nested" depth that guides the eye without structural clutter:

- **Base:** `surface` (#f9f9ff)

- **Floating Elements:** `surface-container-lowest` (#ffffff)

- **Recessed Sections:** `surface-container-high` (#e2e8f8)

### The "Glass & Gradient" Rule

To avoid a flat, "corporate" feel, use **Glassmorphism** for floating headers or navigation bars. Use a semi-transparent `surface-container-lowest` with a `backdrop-blur` of 20px.

- **Signature Textures:** Apply subtle linear gradients (e.g., `primary` #002046 to `primary-container` #1b365d) on Hero backgrounds to provide a sense of "visual soul" and depth.

---

## 3. Typography: The Editorial Voice

We use a high-contrast scale to create an authoritative yet welcoming rhythm.

- **Display & Headlines (Noto Serif):** This is our "Friendly Serif." It should be used with generous leading. Headlines should often be placed with intentional asymmetry—slightly offset or overlapping a background image—to break the "template" look.

- _Headline-LG:_ 2rem. Use for welcoming statements and section headers.

- **Body & Labels (Plus Jakarta Sans):** Our "Clean Sans-Serif." It provides high legibility for long-form scripture or community updates.

- _Body-MD:_ 0.875rem. The workhorse for community stories.

- **Labels:** Use `label-md` for metadata (dates, categories), always set in `on-surface-variant` (#44474e) to maintain a soft hierarchy.

---

## 4. Elevation & Depth

We eschew traditional drop shadows for **Tonal Layering**.

### The Layering Principle

Depth is achieved by stacking color tokens. To create a "lifted" card:

1. Place a `surface-container-lowest` (#ffffff) object on a `surface-container` (#e7eefe) background.

2. Apply a `xl` (1.5rem) corner radius.

### Ambient Shadows

If a floating effect is required (e.g., a "Give" button), use an **Ambient Shadow**:

- **Color:** Use a 6% opacity version of `on-surface` (#151c27).

- **Blur:** Minimum 30px to mimic natural light, never a harsh "drop."

### The "Ghost Border" Fallback

If accessibility requires a container definition in high-glare environments, use a **Ghost Border**: `outline-variant` (#c4c6cf) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components & Signature UI

### Buttons (The "Soft-Touch" CTA)

- **Primary:** `primary` background with `on-primary` text. Use `full` (9999px) roundedness for a pill shape that feels approachable.

- **Secondary:** `secondary-container` (#fed488) background with `on-secondary-container` (#785a1a) text. This provides the "gentle gold" warmth for secondary actions like "Join a Group."

### Cards & Feed Items

- **Rule:** Forbid divider lines.

- **Execution:** Separate list items using the **Spacing Scale** `8` (2.75rem) or by alternating background tones between `surface-container-low` and `surface-container-lowest`.

- **Layout:** Use asymmetrical padding (e.g., more padding on the bottom than the top) to give the content "room to breathe."

### Input Fields

- **Style:** Minimalist. No bottom line. Use a `surface-container-highest` (#dce3f2) background with `md` (0.75rem) corners.

- **Focus State:** Shift the background to `primary-fixed` (#d6e3ff) to provide a soft, glowing blue indicator.

### Signature Component: The "Reflection Plate"

A bespoke component for scripture or quotes: A wide `surface-container-lowest` card with a subtle `secondary` (#775a19) vertical accent on the left, using `display-sm` typography to make the text feel like a centerpiece.

---

## 6. Do’s and Don’ts

### Do:

- **Use White Space as a Feature:** Use the `16` (5.5rem) spacing token between major sections to evoke peace.

- **Layer Images:** Let images of the community slightly overlap the edge of their containers (using `xl` corners) to create a custom, scrapbook-editorial feel.

- **Tint Your Greys:** Always use the provided blue-tinted surface tokens rather than pure #000000 or neutral greys.

### Don't:

- **Don't use 1px dividers.** It makes the app look like a legacy corporate tool.

- **Don't use "High" shadows.** They create visual anxiety. Stick to tonal shifts.

- **Don't center-align everything.** Use left-aligned headlines with right-aligned body text occasionally to create sophisticated, modern asymmetry.

- **Don't use harsh corners.** Nothing in this system should be sharper than the `sm` (0.25rem) token; prioritize `lg` and `xl` for a welcoming touch.
