/**
 * 오늘의 묵상 card contracts: shares open per prompt, authors manage their own shares, and only
 * leaders get the passage's edit and delete controls.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'DailyDevotionCard.tsx'), 'utf8');
const settings = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'app', 'group', 'devotion-settings.tsx'),
  'utf8'
);

describe('DailyDevotionCard', () => {
  it('lists shares in one collapsible section per prompt', () => {
    expect(source).toMatch(/groupThreadsByQuestion\(threadDevotionShares\(shares\)\)/);
    expect(source).toMatch(/sections\.map\(\(\{ question: q, threads, count \}\)/);
    expect(source).toMatch(/const open = openQuestions\.has\(q\)/);
  });

  it('gives edit and delete only to the author of a share', () => {
    expect(source).toMatch(/const isMine = share\.userId === userId/);
    expect(source).toMatch(/\{isMine \? \(\s*<>\s*<Pressable\s+onPress=\{startEdit\}/);
  });

  it('gives passage edit and delete only to leaders', () => {
    expect(source).toMatch(
      /\{canManage && devotion \? \(\s*<View style=\{styles\.leaderActions\}>/
    );
  });

  it('lets leaders delete today’s passage from the settings screen', () => {
    expect(settings).toMatch(
      /\{hasToday \? \(\s*<Button\s+title=\{t\('devotion\.deleteDevotion'\)\}/
    );
  });
});
