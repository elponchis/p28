/**
 * Story: Onboarding screen contract test.
 * Ensures screen uses only facade (api.data) and has no direct Supabase/adapter imports.
 */
const fs = require('fs');
const path = require('path');

const onboardingPath = path.join(__dirname, '..', 'onboarding.tsx');
const onboardingSource = fs.readFileSync(onboardingPath, 'utf8');

describe('OnboardingScreen contract', () => {
  it('uses auth.signUp from @/lib/api with profile metadata; profile row is created by the on_auth_user_created DB trigger', () => {
    expect(onboardingSource).toMatch(/from\s+['"]@\/lib\/api['"]/);
    expect(onboardingSource).toMatch(/auth\.signUp\(/);
    expect(onboardingSource).not.toMatch(/useCreateProfileMutation/);
  });

  it('uses getUserFacingError from @/lib/errors for error display', () => {
    expect(onboardingSource).toMatch(/getUserFacingError/);
    expect(onboardingSource).toMatch(/@\/lib\/errors/);
  });

  it('does not import from Supabase or adapters', () => {
    expect(onboardingSource).not.toMatch(/@supabase/);
    expect(onboardingSource).not.toMatch(/lib\/api\/adapters/);
  });

  it('exports a default component', () => {
    expect(onboardingSource).toMatch(/export\s+default\s+function\s+OnboardingScreen/);
  });
});
