/**
 * Contract tests for GlobalAnnouncementCard — home feed global announcement surface.
 */
const fs = require('fs');
const path = require('path');

const componentPath = path.join(__dirname, '..', 'GlobalAnnouncementCard.tsx');
const source = fs.readFileSync(componentPath, 'utf8');

describe('GlobalAnnouncementCard contract', () => {
  it('exports GlobalAnnouncementCard and props type', () => {
    expect(source).toContain('export function GlobalAnnouncementCard');
    expect(source).toContain('export interface GlobalAnnouncementCardProps');
  });

  it('uses a subtle globe watermark for visual hierarchy', () => {
    expect(source).toContain('globe-outline');
    expect(source).toMatch(/opacity:\s*0\.09/);
  });
});
