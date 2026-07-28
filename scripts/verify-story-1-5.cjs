/**
 * Story 1.5 verification: data contract has profile methods (getProfile, updateProfile,
 * uploadProfileImage), and no @supabase or lib/api/adapters in app/, components/, contexts/, hooks/.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const contractsDir = path.join(root, 'lib', 'api', 'contracts');

function check(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('OK:', message);
}

// Data contract has profile methods
const dataContractPath = path.join(contractsDir, 'data.ts');
check(fs.existsSync(dataContractPath), 'lib/api/contracts/data.ts exists');
const dataContent = fs.readFileSync(dataContractPath, 'utf8');
for (const method of ['getProfile', 'updateProfile', 'uploadProfileImage']) {
  check(dataContent.includes(method), `DataContract defines ${method}`);
}

// DTO has Profile and ProfileUpdates
const dtoPath = path.join(contractsDir, 'dto.ts');
check(fs.existsSync(dtoPath), 'lib/api/contracts/dto.ts exists');
const dtoContent = fs.readFileSync(dtoPath, 'utf8');
check(
  dtoContent.includes('Profile') && dtoContent.includes('ProfileUpdates'),
  'dto defines Profile and ProfileUpdates'
);

// No backend SDK or adapter imports in app/, components/, contexts/, hooks/
const forbidden = [
  '@supabase/supabase-js',
  'lib/api/adapters',
  "from '@/lib/api/adapters'",
  'from "../lib/api/adapters"',
  'from "../../lib/api/adapters"',
];
const dirsToCheck = [
  path.join(root, 'app'),
  path.join(root, 'components'),
  path.join(root, 'contexts'),
  path.join(root, 'hooks'),
];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
      scanDir(full);
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
    const content = fs.readFileSync(full, 'utf8');
    for (const f of forbidden) {
      check(!content.includes(f), `No ${f} in ${path.relative(root, full)}`);
    }
  }
}

for (const dir of dirsToCheck) {
  scanDir(dir);
}

console.log('\nStory 1.5 verification passed.');
process.exit(0);
