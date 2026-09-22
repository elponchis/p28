/**
 * The announcement card is a fixed height, so anything that will not fit its one line has to
 * announce itself with "see all" rather than pushing the card taller.
 */
import { ANNOUNCEMENT_PREVIEW_CHARS, isAnnouncementTruncated } from '@/lib/announcementPreview';

describe('isAnnouncementTruncated', () => {
  it('leaves a short one-liner alone', () => {
    expect(isAnnouncementTruncated('Hello everyone', 'Hello & Welcome')).toBe(false);
  });

  it('flags a description longer than the line holds', () => {
    expect(isAnnouncementTruncated('제목', '가'.repeat(ANNOUNCEMENT_PREVIEW_CHARS + 1))).toBe(true);
  });

  it('does not flag one exactly at the limit', () => {
    expect(isAnnouncementTruncated('제목', '가'.repeat(ANNOUNCEMENT_PREVIEW_CHARS))).toBe(false);
  });

  it('flags anything with a line break, however short', () => {
    expect(isAnnouncementTruncated('제목', '첫 줄\n둘째 줄')).toBe(true);
    expect(isAnnouncementTruncated('제목\n계속', '짧음')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isAnnouncementTruncated('  제목  ', `  ${'가'.repeat(10)}  `)).toBe(false);
  });
});
