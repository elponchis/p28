/**
 * Story 1.7: Contract tests for language screen.
 * Verifies language selector uses useUpdateProfileMutation with preferredLanguage when user changes language.
 * No direct Supabase/adapter imports.
 */
const fs = require('fs');
const path = require('path');

const languagePath = path.join(__dirname, '..', 'language.tsx');
const languageSource = fs.readFileSync(languagePath, 'utf8');

describe('LanguageScreen contract', () => {
  it('uses useUpdateProfileMutation for persisting language choice', () => {
    expect(languageSource).toMatch(/useUpdateProfileMutation/);
  });

  it('passes preferredLanguage in update payload', () => {
    expect(languageSource).toMatch(/preferredLanguage:\s*next/);
  });

  it('uses getUserFacingError from @/lib/api for error handling', () => {
    expect(languageSource).toMatch(/getUserFacingError/);
    expect(languageSource).toMatch(/from\s+['"]@\/lib\/api['"]/);
  });

  it('does not import from Supabase or adapters', () => {
    expect(languageSource).not.toMatch(/@supabase/);
    expect(languageSource).not.toMatch(/lib\/api\/adapters/);
  });

  it('exports a default component', () => {
    expect(languageSource).toMatch(/export\s+default\s+function\s+LanguageScreen/);
  });
});
