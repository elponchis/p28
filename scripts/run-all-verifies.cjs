/**
 * Runs all scripts/verify-story-*.cjs in sorted order.
 * Add new verify scripts without updating package.json.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptsDir = __dirname;
const files = fs
  .readdirSync(scriptsDir)
  .filter((f) => f.startsWith('verify-story-') && f.endsWith('.cjs'))
  .sort();

if (files.length === 0) {
  console.log('No verify-story-*.cjs scripts found.');
  process.exit(0);
}

for (const file of files) {
  const filePath = path.join(scriptsDir, file);
  const result = spawnSync(process.execPath, [filePath], {
    stdio: 'inherit',
    cwd: path.join(scriptsDir, '..'),
  });
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

console.log('\nAll story verifications passed.');
process.exit(0);
