import { showsSectionEyebrow } from '@/lib/sectionEyebrow';

describe('showsSectionEyebrow', () => {
  it('keeps the label where the title is not in English', () => {
    expect(showsSectionEyebrow('ko')).toBe(true);
    expect(showsSectionEyebrow('km')).toBe(true);
  });

  it('drops the label in English, where it would repeat the title', () => {
    expect(showsSectionEyebrow('en')).toBe(false);
  });
});
