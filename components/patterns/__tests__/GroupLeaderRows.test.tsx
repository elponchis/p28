/**
 * Contract tests for GroupLeaderRows — horizontal Ministry leaders strip (Stitch).
 */
const fs = require('fs');
const path = require('path');

const componentPath = path.join(__dirname, '..', 'GroupLeaderRows.tsx');
const source = fs.readFileSync(componentPath, 'utf8');

describe('GroupLeaderRows contract', () => {
  it('exports row list with item type', () => {
    expect(source).toContain('export function GroupLeaderRows');
    expect(source).toContain('export interface GroupLeaderRowsItem');
  });

  it('uses horizontal scroll and edge-to-edge bleed option', () => {
    expect(source).toContain('horizontal');
    expect(source).toContain('edgeToEdge');
    expect(source).toContain('bleedWrap');
  });

  it('stacks avatar above name and role (column layout)', () => {
    expect(source).toContain('styles.column');
    expect(source).toMatch(/size=\{?['"]lg['"]\}?/);
  });

  it('does not use white card or ambient shadow on the strip', () => {
    expect(source).not.toContain('surfaceContainerLowest');
    expect(source).not.toContain('shadow.ambient');
  });
});
