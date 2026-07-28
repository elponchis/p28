/**
 * Story 1.4: Contract tests for sign-up screen.
 * Sign-up checks email via auth.checkEmailAvailable (does not call auth.signUp), then uses
 * PendingSignUpContext and redirects to onboarding.
 * Verifies screen uses getUserFacingError and PendingSignUpContext; no direct Supabase/adapter imports.
 */
const fs = require('fs');
const path = require('path');

const signUpPath = path.join(__dirname, '..', 'sign-up.tsx');
const signUpSource = fs.readFileSync(signUpPath, 'utf8');

describe('SignUpScreen contract', () => {
  it('uses PendingSignUpContext, checks email via auth.checkEmailAvailable, and redirects to onboarding (no auth.signUp)', () => {
    expect(signUpSource).toMatch(/usePendingSignUp|PendingSignUpContext/);
    expect(signUpSource).toMatch(/setPendingSignUp\s*\(/);
    expect(signUpSource).toMatch(/auth\.checkEmailAvailable\s*\(/);
    expect(signUpSource).toMatch(/auth\/onboarding/);
    expect(signUpSource).not.toMatch(/auth\.signUp\s*\(/);
  });

  it('uses getUserFacingError from @/lib/errors for error display', () => {
    expect(signUpSource).toMatch(/getUserFacingError/);
    expect(signUpSource).toMatch(/@\/lib\/errors/);
  });

  it('does not import from Supabase or adapters', () => {
    expect(signUpSource).not.toMatch(/@supabase/);
    expect(signUpSource).not.toMatch(/lib\/api\/adapters/);
  });

  it('exports a default component', () => {
    expect(signUpSource).toMatch(/export\s+default\s+function\s+SignUpScreen/);
  });
});
