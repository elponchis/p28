/**
 * Story 1.4: Contract tests for sign-in screen.
 * Verifies screen uses only api.auth and getUserFacingError; no direct Supabase/adapter imports.
 * Full component tests (form submit calls api.auth, error display) require React Native Testing Library.
 */
const fs = require('fs');
const path = require('path');

const signInPath = path.join(__dirname, '..', 'sign-in.tsx');
const signInSource = fs.readFileSync(signInPath, 'utf8');

describe('SignInScreen contract', () => {
  it('uses auth from @/lib/api for sign-in', () => {
    expect(signInSource).toMatch(/from\s+['"]@\/lib\/api['"]/);
    expect(signInSource).toMatch(/auth\.signIn\s*\(/);
  });

  it('uses getUserFacingError from @/lib/errors for error display', () => {
    expect(signInSource).toMatch(/getUserFacingError/);
    expect(signInSource).toMatch(/@\/lib\/errors/);
  });

  it('does not import from Supabase or adapters', () => {
    expect(signInSource).not.toMatch(/@supabase/);
    expect(signInSource).not.toMatch(/lib\/api\/adapters/);
  });

  it('exports a default component', () => {
    expect(signInSource).toMatch(/export\s+default\s+function\s+SignInScreen/);
  });
});
