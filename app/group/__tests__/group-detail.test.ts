/**
 * Story 2.6: Contract tests for group detail screen (inline discussions).
 * Verifies discussion section for members shows inline discussions list and Add discussion button.
 */
const fs = require('fs');
const path = require('path');

const groupDetailPath = path.join(__dirname, '..', '[id]', 'index.tsx');
const groupDetailSource = fs.readFileSync(groupDetailPath, 'utf8');

describe('GroupDetailScreen discussion contract', () => {
  it('shows inline discussions section when member', () => {
    expect(groupDetailSource).toMatch(/isMember\s+\?/);
    expect(groupDetailSource).toMatch(/useDiscussionsQuery/);
    expect(groupDetailSource).toMatch(/t\(['"]groups\.discussions['"]\)/);
  });

  it('uses i18n keys for discussion UI', () => {
    expect(groupDetailSource).toMatch(/t\(['"]groups\.discussions['"]\)/);
    expect(groupDetailSource).toMatch(/t\(['"]discussions\.addDiscussion['"]\)/);
  });

  it('has Create Discussion navigation with groupId', () => {
    expect(groupDetailSource).toMatch(/handleCreateDiscussion/);
    expect(groupDetailSource).toMatch(/group\/discussion\/create\?groupId=/);
  });

  it('does not use legacy group discussions or realtime on group detail', () => {
    expect(groupDetailSource).not.toMatch(/useGroupDiscussionsQuery/);
    expect(groupDetailSource).not.toMatch(/useCreateGroupDiscussionMutation/);
    expect(groupDetailSource).not.toMatch(/api\.realtime\.subscribe/);
  });

  it('does not import from Supabase or adapters directly', () => {
    expect(groupDetailSource).not.toMatch(/from\s+['"]@supabase/);
    expect(groupDetailSource).not.toMatch(/lib\/api\/adapters/);
  });

  it('navigates latest announcement card to announcement detail', () => {
    expect(groupDetailSource).toMatch(/handleOpenLatestAnnouncementDetail/);
    expect(groupDetailSource).toMatch(/\/group\/announcement\/\$\{latestPublished\.id\}/);
  });
});
