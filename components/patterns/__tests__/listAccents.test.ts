/**
 * Three list accents borrowed from a reference design: an unread dot on the messages list, a tag
 * chip naming the group on home's Latest updates, and quiet right-aligned counts in the sidebar's
 * open chats. Source contracts, so the layouts they rely on do not quietly regress.
 */
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('unread dot on the messages list', () => {
  const source = read('app/(tabs)/messages/index.tsx');

  it('draws a dot only for unread chats, without moving the row', () => {
    expect(source).toMatch(/\{unread \? \(\s*<View\s+style=\{styles\.unreadDot\}/);
    expect(source).toMatch(/unreadDot: \{\s*position: 'absolute'/);
    expect(source).toMatch(/unreadDot: \{[^}]*backgroundColor: colors\.secondary/);
  });

  it('keeps the existing unread count badge', () => {
    expect(source).toMatch(/styles\.unreadBadge/);
  });
});

describe('group tag chip on Latest updates', () => {
  const home = read('app/(tabs)/index.tsx');
  const row = read('components/patterns/LatestAnnouncementRow.tsx');

  it('passes the group name to the row as a chip instead of a text label above it', () => {
    expect(home).toMatch(/tagLabel=\{item\.groupName\}/);
    expect(home).not.toMatch(/latestUpdateGroupLabel/);
  });

  it('renders the chip only when a tag is given, so other screens stay as they were', () => {
    expect(row).toMatch(/\{tagLabel \? <TagChip label=\{tagLabel\} \/> : null\}/);
  });
});

describe('open chats counts in the sidebar', () => {
  const source = read('components/messages/OpenChatsList.tsx');

  it('shows counts as quiet right-aligned text rather than a red badge', () => {
    expect(source).not.toMatch(/openChatBadge/);
    expect(source).not.toMatch(/colors\.error/);
    expect(source.match(/style=\{styles\.openChatCount\}/g)).toHaveLength(2);
    expect(source).toMatch(/openChatCount: \{[^}]*textAlign: 'right'/);
  });
});
