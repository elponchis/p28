import { friendDisplayName, friendRows } from '@/lib/friendsList';
import type { Profile } from '@/lib/api';

const profile = (userId: string, extra: Partial<Profile> = {}): Profile => ({ userId, ...extra });

describe('friendRows', () => {
  it('builds a row for every friend before any profile has loaded', () => {
    // The crash: ids arrive, profiles do not yet, and a row with no profile was read as if it had one.
    const rows = friendRows(['a', 'b'], new Map());
    expect(rows).toEqual([
      { userId: 'a', profile: undefined },
      { userId: 'b', profile: undefined },
    ]);
  });

  it('fills in the profiles that have arrived and leaves the rest waiting', () => {
    const map = new Map([['a', profile('a', { displayName: 'Daniel' })]]);
    const rows = friendRows(['a', 'b'], map);
    expect(rows[0].profile?.displayName).toBe('Daniel');
    expect(rows[1].profile).toBeUndefined();
  });

  it('keeps the order it was given', () => {
    const rows = friendRows(['c', 'a', 'b'], new Map());
    expect(rows.map((r) => r.userId)).toEqual(['c', 'a', 'b']);
  });
});

describe('friendDisplayName', () => {
  it('prefers the display name', () => {
    expect(friendDisplayName(profile('a', { displayName: 'Js', firstName: 'J' }))).toBe('Js');
  });

  it('falls back to the full name', () => {
    expect(friendDisplayName(profile('a', { firstName: 'Vann', lastName: 'Vireakroth' }))).toBe(
      'Vann Vireakroth'
    );
  });

  it('says loading when the profile has not arrived', () => {
    const loading = friendDisplayName(undefined);
    expect(loading.length).toBeGreaterThan(0);
  });

  it('does not say loading for a profile that arrived without a name', () => {
    const nameless = friendDisplayName(profile('a'));
    expect(nameless.length).toBeGreaterThan(0);
    expect(nameless).not.toBe(friendDisplayName(undefined));
  });
});
