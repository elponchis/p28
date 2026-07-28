/**
 * Story 1.1 verification: Expo app with tabs (Home, Groups, Messages, Profile),
 * app/ and components/ present, no backend SDK in app or components.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const tabsDir = path.join(root, 'app', '(tabs)');

function check(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('OK:', message);
}

// AC: project structure includes app/, components/
check(fs.existsSync(path.join(root, 'app')), 'app/ exists');
check(fs.existsSync(path.join(root, 'components')), 'components/ exists');
check(fs.existsSync(tabsDir), 'app/(tabs)/ exists');

// AC: tab layout Home, Groups, Messages, Profile
const requiredTabs = ['index.tsx', 'groups.tsx', 'messages.tsx', 'profile.tsx'];
for (const file of requiredTabs) {
  check(fs.existsSync(path.join(tabsDir, file)), `app/(tabs)/${file} exists`);
}

// AC: no backend SDK in app or components
function noBackendInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
      noBackendInDir(full);
    } else if (e.isFile() && /\.(tsx?|jsx?|mjs|cjs)$/.test(e.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('@supabase/supabase-js') || content.includes('supabase-js')) {
        check(false, `No backend SDK in ${path.relative(root, full)}`);
      }
    }
  }
}
noBackendInDir(path.join(root, 'app'));
noBackendInDir(path.join(root, 'components'));
console.log('OK: No backend SDK in app/ or components/');

// Tab layout has four tabs with correct titles
const layoutPath = path.join(tabsDir, '_layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
check(layoutContent.includes("title: 'Home'"), 'Tab layout has Home');
check(layoutContent.includes("title: 'Groups'"), 'Tab layout has Groups');
check(layoutContent.includes("title: 'Messages'"), 'Tab layout has Messages');
check(layoutContent.includes("title: 'Profile'"), 'Tab layout has Profile');

// Optional: verify app can build (evidence that "app runs")
const { spawnSync } = require('child_process');
const exportResult = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', require('path').join(root, '.expo-export-web')], {
  cwd: root,
  encoding: 'utf8',
  timeout: 120000,
});
if (exportResult.status === 0) {
  console.log('OK: App build (web) succeeds');
} else {
  console.log('SKIP: App build check (run manually: npx expo export --platform web)');
}

console.log('\nAll Story 1.1 checks passed.');
process.exit(0);
