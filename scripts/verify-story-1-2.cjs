/**
 * Story 1.2 verification: design tokens in single theme source, primitives use them,
 * 44pt min touch, no backend/router in primitives.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const themeDir = path.join(root, 'theme');
const primitivesDir = path.join(root, 'components', 'primitives');

function check(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('OK:', message);
}

// Theme: single source with tokens
const tokensPath = path.join(themeDir, 'tokens.ts');
check(fs.existsSync(tokensPath), 'theme/tokens.ts exists');
const tokensContent = fs.readFileSync(tokensPath, 'utf8');
// Spacious & Calm: background #fafafa, textPrimary #1a1a1a, primary #2C7CB5
check(tokensContent.includes('colors') && (tokensContent.includes('#fafafa') || tokensContent.includes('#1a1a1a') || tokensContent.includes('#2C7CB5')), 'tokens export colors (Spacious & Calm or equivalent)');
check(tokensContent.includes('spacing') && tokensContent.includes('radius'), 'tokens export spacing and radius');
check(tokensContent.includes('typography'), 'tokens export typography');
check(tokensContent.includes('44') && (tokensContent.includes('minTouchTarget') || tokensContent.includes('touch')), 'tokens define 44pt min touch target');
check(tokensContent.includes('WCAG') || tokensContent.includes('contrast'), 'tokens document WCAG/contrast (code review)');
check(tokensContent.includes('success') && tokensContent.includes('error'), 'tokens export semantic colors (success, error)');
check(tokensContent.includes('avatarSizes'), 'tokens export avatarSizes');

// Primitives exist
const primitives = ['Button', 'Card', 'Input', 'ListItem', 'Avatar', 'Badge'];
for (const name of primitives) {
  const file = path.join(primitivesDir, `${name}.tsx`);
  check(fs.existsSync(file), `components/primitives/${name}.tsx exists`);
}

// Primitives: no backend or router
const forbidden = ['lib/api', '@supabase', 'expo-router'];
function noForbiddenInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) continue;
    if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    for (const f of forbidden) {
      check(!content.includes(f), `No ${f} in ${path.relative(root, full)}`);
    }
  }
}
noForbiddenInDir(primitivesDir);

// Primitives use theme (import from @/theme or theme/tokens)
for (const name of primitives) {
  const content = fs.readFileSync(path.join(primitivesDir, `${name}.tsx`), 'utf8');
  check(content.includes('theme') || content.includes('@/theme'), `Primitive ${name} uses theme`);
}

console.log('OK: Story 1.2 verification passed.');
process.exit(0);
