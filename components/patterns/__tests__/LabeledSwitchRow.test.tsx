/**
 * Contract tests for LabeledSwitchRow — shared switch styling for settings and sheets.
 */
const fs = require('fs');
const path = require('path');

const componentPath = path.join(__dirname, '..', 'LabeledSwitchRow.tsx');
const source = fs.readFileSync(componentPath, 'utf8');

describe('LabeledSwitchRow contract', () => {
  it('exports LabeledSwitchRow and props type', () => {
    expect(source).toContain('export function LabeledSwitchRow');
    expect(source).toContain('export interface LabeledSwitchRowProps');
  });

  it('uses visible off-track tokens (matches group event RSVP switch)', () => {
    expect(source).toContain('surfaceContainerHigh');
    expect(source).toContain('ios_backgroundColor');
    expect(source).toContain('surfaceContainerLowest');
  });

  it('supports settings and sheet layout variants', () => {
    expect(source).toContain("'settings'");
    expect(source).toContain("'sheet'");
    expect(source).toMatch(/variant\?:\s*'settings'\s*\|\s*'sheet'/);
  });
});
