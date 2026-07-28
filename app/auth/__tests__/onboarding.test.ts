/**
 * Story: Onboarding screen contract test.
 * Ensures screen uses only facade (api.data) and has no direct Supabase/adapter imports.
 */
const fs = require('fs');
const path = require('path');

const onboardingPath = path.join(__dirname, '..', 'onboarding.tsx');
const onboardingSource = fs.readFileSync(onboardingPath, 'utf8');

describe('OnboardingScreen contract', () => {
  it('uses api/auth from @/lib/api and useCreateProfileMutation for profile creation', () => {
    expect(onboardingSource).toMatch(/from\s+['"]@\/lib\/api['"]/);
    expect(onboardingSource).toMatch(/useCreateProfileMutation/);
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
