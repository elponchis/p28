# Code Review: 1-2-design-tokens-and-core-primitives

**Story file:** `_bmad-output/implementation-artifacts/1-2-design-tokens-and-core-primitives.md`  
**Git vs story:** No git repository — skipped file-list comparison.  
**Issues found:** 1 High, 5 Medium, 2 Low

---

## HIGH

1. **WCAG 2.1 AA contrast verification claimed but not evidenced**  
   Task: "Verify contrast: 4.5:1 normal text, 3:1 large text; primary #2C7CB5 and #C77B38 on backgrounds."  
   There is no automated contrast check, no doc with ratios, and no test. The AC says "contrast meets WCAG 2.1 AA where applicable."  
   **Action:** Add a short comment or doc (e.g. in `theme/tokens.ts` or README) stating that primary/accent on background/surface were chosen for WCAG AA, or add a small verify-step that asserts contrast ratios.

---

## MEDIUM

2. **Button label uses hard-coded typography**  
   `components/primitives/Button.tsx` line 50–52: `fontSize: 16`, `fontWeight: '600'` are hard-coded.  
   Dev Notes: "No hard-coded hex or magic numbers in primitives." Theme has `typography.label` / `typography.body`.  
   **Action:** Use theme typography for the button label (e.g. `...typography.label` or a dedicated token).

3. **Card uses hard-coded shadow color**  
   `components/primitives/Card.tsx` line 19: `shadowColor: '#000'`.  
   Primitives must use tokens only; no hex in primitives.  
   **Action:** Add a neutral shadow color to `theme/tokens.ts` (e.g. `shadow: '#000000'` or `colors.shadow`) and use it in Card.

4. **ListItem subtitle magic number**  
   `components/primitives/ListItem.tsx` line 73: `marginTop: 2`.  
   Spacing scale is 4, 8, 16, 24, 32.  
   **Action:** Use `spacing.xs` (4) or another spacing token instead of 2.

5. **Avatar sizes not from theme**  
   `components/primitives/Avatar.tsx` line 5: `sizes = { sm: 32, md: 40, lg: 56 }`.  
   Story: "Avatar: placeholder and image; size from tokens/spacing."  
   **Action:** Derive sizes from theme spacing (e.g. spacing.md, spacing.lg, spacing.xl) or add an `avatarSizes` (or similar) object to tokens and use it in Avatar.

6. **No real unit tests for tokens or primitives**  
   Story: "Add tests for token export and primitive rendering (e.g. Button variants, Card with children)."  
   Only `scripts/verify-story-1-2.cjs` exists (file existence + string checks). No Jest (or similar) tests that import tokens or render Button/Card.  
   **Action:** Add at least one test that imports tokens and asserts exports, and one that renders a primitive (or document that verify script is the chosen approach for this story).

---

## LOW

7. **Avatar has no accessibilityLabel**  
   Interactive or meaningful avatars should have an accessibility label (e.g. "Profile photo" or "Avatar for [name]").  
   **Action:** Add optional `accessibilityLabel` (and optionally `accessibilityHint`) to Avatar and pass them to Image/View.

8. **Home screen magic numbers**  
   `app/(tabs)/index.tsx`: `marginVertical: 30`, `marginBottom: 8`.  
   **Action:** Use `spacing.lg` (24) or `spacing.xl` (32) for 30, and `spacing.sm` (8) for 8.

---

**Total: 8 findings (1 High, 5 Medium, 2 Low).**
