/**
 * 오늘의 묵상 card contracts: the passage sits on its own banner, shared answers read as one list
 * tagged by prompt, authors manage their own shares, and only leaders get the passage's controls.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'DailyDevotionCard.tsx'), 'utf8');
const settings = fs.readFileSync(
  path.join(__dirname, '..', '..', '..', 'app', 'group', 'devotion-settings.tsx'),
  'utf8'
);

describe('DailyDevotionCard', () => {
  it('puts the passage on the banner, not in the body', () => {
    expect(source).toMatch(/styles\.bannerPassage/);
    expect(source).toMatch(/banner: \{\s*backgroundColor: colors\.primaryContainer/);
  });

  it('lists the shared answers as one thread list, newest first', () => {
    expect(source).toMatch(/threadDevotionShares\(shares\)/);
    expect(source).toMatch(/const visibleThreads = threads\.slice\(0, visibleCount\)/);
    expect(source).toMatch(/setVisibleCount\(\(n\) => n \+ VISIBLE_SHARES_STEP\)/);
  });

  it('tags each answer with the prompt it answers', () => {
    expect(source).toMatch(/share\.question \? \(\s*<View style=\{styles\.questionTag\}>/);
  });

  it('keeps a draft per prompt on the device', () => {
    expect(source).toMatch(/devotionDraftKey\(devotion\.id, question\)/);
    expect(source).toMatch(/AsyncStorage\.setItem\(draftKey, draft\)/);
    expect(source).toMatch(/AsyncStorage\.removeItem\(draftKey\)/);
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
