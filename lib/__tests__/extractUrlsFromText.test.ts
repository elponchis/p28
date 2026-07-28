import { extractUrlsFromText } from '@/lib/extractUrlsFromText';

describe('extractUrlsFromText', () => {
  it('returns empty array for empty or whitespace', () => {
    expect(extractUrlsFromText('')).toEqual([]);
    expect(extractUrlsFromText('   ')).toEqual([]);
    expect(extractUrlsFromText(null)).toEqual([]);
    expect(extractUrlsFromText(undefined)).toEqual([]);
  });

  it('extracts http and https URLs in order', () => {
    const text = 'See https://example.com/a and http://test.org/b?q=1';
    expect(extractUrlsFromText(text)).toEqual(['https://example.com/a', 'http://test.org/b?q=1']);
  });

  it('dedupes identical URLs', () => {
    expect(extractUrlsFromText('https://x.com https://x.com')).toEqual(['https://x.com']);
  });
});
