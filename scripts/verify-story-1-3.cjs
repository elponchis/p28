/**
 * Story 1.3 verification: contracts exist, facade exports auth/data/realtime,
 * no @supabase or lib/api/adapters in app/, components/, contexts/, or hooks.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const libApi = path.join(root, 'lib', 'api');
const contractsDir = path.join(libApi, 'contracts');
const adaptersSupabase = path.join(libApi, 'adapters', 'supabase');

function check(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('OK:', message);
}

// Contracts exist
const contractFiles = ['auth.ts', 'data.ts', 'realtime.ts', 'errors.ts', 'dto.ts'];
for (const name of contractFiles) {
  const file = path.join(contractsDir, name);
  check(fs.existsSync(file), `lib/api/contracts/${name} exists`);
}

// Contract auth has required methods
const authContent = fs.readFileSync(path.join(contractsDir, 'auth.ts'), 'utf8');
for (const method of ['signIn', 'signUp', 'signOut', 'getSession', 'getCurrentUser', 'onAuthStateChange']) {
  check(authContent.includes(method), `contract auth defines ${method}`);
}
check(authContent.includes('ApiError'), 'contract auth references ApiError');

// Contract realtime: subscribe, unsubscribe
const realtimeContent = fs.readFileSync(path.join(contractsDir, 'realtime.ts'), 'utf8');
check(realtimeContent.includes('subscribe') && realtimeContent.includes('unsubscribe'), 'contract realtime defines subscribe/unsubscribe');

// errors.ts: ApiError shape
const errorsContent = fs.readFileSync(path.join(contractsDir, 'errors.ts'), 'utf8');
check(errorsContent.includes('message') && (errorsContent.includes('code') || errorsContent.includes('code?')), 'contract errors defines ApiError shape');

// dto.ts: camelCase DTOs (User, Session)
const dtoContent = fs.readFileSync(path.join(contractsDir, 'dto.ts'), 'utf8');
check(dtoContent.includes('User') && dtoContent.includes('Session'), 'contract dto defines User and Session');

// Facade exists and exports auth, data, realtime
const facadePath = path.join(libApi, 'index.ts');
check(fs.existsSync(facadePath), 'lib/api/index.ts (facade) exists');
const facadeContent = fs.readFileSync(facadePath, 'utf8');
check(facadeContent.includes('auth') && facadeContent.includes('data') && facadeContent.includes('realtime'), 'facade exports auth, data, realtime');

// Adapter directory exists
check(fs.existsSync(adaptersSupabase), 'lib/api/adapters/supabase/ exists');
check(fs.existsSync(path.join(adaptersSupabase, 'index.ts')), 'lib/api/adapters/supabase/index.ts exists');

// .env.example exists with placeholders
const envExample = path.join(root, '.env.example');
check(fs.existsSync(envExample), '.env.example exists');
const envContent = fs.readFileSync(envExample, 'utf8');
check(envContent.includes('SUPABASE_URL') && envContent.includes('SUPABASE_ANON_KEY'), '.env.example has SUPABASE_URL and SUPABASE_ANON_KEY');

// No backend SDK or adapter imports in app/, components/, contexts/
const forbidden = ['@supabase/supabase-js', 'lib/api/adapters', "from '@/lib/api/adapters'", 'from "../lib/api/adapters"', 'from "../../lib/api/adapters"'];
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

// Facade re-exports contract types (strict: export type and ApiError)
check(facadeContent.includes('export type') && facadeContent.includes('ApiError'), 'facade re-exports contract types including ApiError');

console.log('\nStory 1.3 verification passed.');
process.exit(0);
