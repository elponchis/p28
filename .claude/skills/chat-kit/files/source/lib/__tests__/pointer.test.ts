/**
 * Two chat affordances hang off this one answer — the hover toolbar and selectable message text —
 * and both were wrong on a phone browser when it was `Platform.OS === 'web'` alone.
 */
// react-native does not load under this jest setup, and only Platform.OS is needed from it.
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

type MatchMediaWindow = { matchMedia?: (query: string) => { matches: boolean } };

function loadWithPointer(pointer: 'fine' | 'coarse' | 'no-window') {
  jest.resetModules();
  const globals = globalThis as { window?: MatchMediaWindow };
  const hadWindow = 'window' in globals;
  const previous = globals.window;

  if (pointer === 'no-window') {
    delete globals.window;
  } else {
    globals.window = {
      matchMedia: (query: string) => ({ matches: query === `(pointer: ${pointer})` }),
    };
  }

  // react-native resolves to react-native-web here, so Platform.OS is 'web'.
  const { isDesktopWebPointer } = require('@/lib/pointer') as {
    isDesktopWebPointer: () => boolean;
  };
  const result = isDesktopWebPointer();

  if (hadWindow) globals.window = previous;
  else delete globals.window;
  return result;
}

describe('isDesktopWebPointer', () => {
  it('is true for a browser driven by a mouse', () => {
    expect(loadWithPointer('fine')).toBe(true);
  });

  it('is false on a touch screen, which cannot hover and long-presses to select', () => {
    expect(loadWithPointer('coarse')).toBe(false);
  });

  it('is false where there is no window at all, such as a static export', () => {
    expect(loadWithPointer('no-window')).toBe(false);
  });

  it('answers the same way twice without asking the browser again', () => {
    jest.resetModules();
    const globals = globalThis as { window?: MatchMediaWindow };
    const previous = globals.window;
    let asked = 0;
    globals.window = {
      matchMedia: () => {
        asked += 1;
        return { matches: true };
      },
    };

    const { isDesktopWebPointer } = require('@/lib/pointer') as {
      isDesktopWebPointer: () => boolean;
    };
    expect(isDesktopWebPointer()).toBe(true);
    expect(isDesktopWebPointer()).toBe(true);
    expect(asked).toBe(1);

    globals.window = previous;
  });
});
