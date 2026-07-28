import { avatarFallbackInitial } from '@/lib/avatarFallbackInitial';

describe('avatarFallbackInitial', () => {
  it('returns uppercased first letter', () => {
    expect(avatarFallbackInitial('alice')).toBe('A');
    expect(avatarFallbackInitial('Bob')).toBe('B');
  });

  it('skips leading non-letters to the first letter', () => {
    expect(avatarFallbackInitial(`'O'Brien`)).toBe('O');
  });

  it('returns empty string for missing or blank name (no question mark)', () => {
    expect(avatarFallbackInitial('')).toBe('');
    expect(avatarFallbackInitial('   ')).toBe('');
    expect(avatarFallbackInitial(undefined)).toBe('');
    expect(avatarFallbackInitial(null)).toBe('');
  });

  it('uses first letter when digits precede the name', () => {
    expect(avatarFallbackInitial('3d studio')).toBe('D');
  });

  it('uses first character when the string has no letters at all', () => {
    expect(avatarFallbackInitial('123')).toBe('1');
  });

  it('uses first letter from a UUID-style string (stacked avatar userId fallback)', () => {
    expect(avatarFallbackInitial('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe('A');
  });
});
