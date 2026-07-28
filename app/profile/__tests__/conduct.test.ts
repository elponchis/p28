/**
 * Story 1.8: Contract tests for conduct guidelines screen.
 * Verifies the screen uses i18n conduct keys and does not import backend adapters.
 */
const fs = require('fs');
const path = require('path');

const conductPath = path.join(__dirname, '..', 'conduct.tsx');
const conductSource = fs.readFileSync(conductPath, 'utf8');

describe('ConductScreen contract', () => {
  it('uses conduct i18n keys for title and sections', () => {
    expect(conductSource).toMatch(/t\('conduct\.title'\)/);
    expect(conductSource).toMatch(/t\('conduct\.respectTitle'\)/);
    expect(conductSource).toMatch(/t\('conduct\.safetyTitle'\)/);
  });

  it('does not import from Supabase or adapters', () => {
    expect(conductSource).not.toMatch(/@supabase/);
    expect(conductSource).not.toMatch(/lib\/api\/adapters/);
  });

  it('exports a default ConductScreen component', () => {
    expect(conductSource).toContain('export default function ConductScreen');
  });
});
