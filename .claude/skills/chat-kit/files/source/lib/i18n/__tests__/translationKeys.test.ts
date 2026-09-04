/**
 * Every `t('namespace.key')` in the app has to resolve.
 *
 * `t()` falls back to returning the key itself when it finds nothing, so a typo or a key that
 * was never written does not throw, does not fail a typecheck, and does not look broken in
 * review — it ships and renders `profile.cropTitle` to a user. Seven such keys were live before
 * this test existed, found only by accident while moving a namespace around.
 *
 * The sweep is deliberately dumb: it reads the source, pulls out string literals passed to t(),
 * and checks them against the English dictionary. Dynamic keys (template literals, variables)
 * are invisible to it, which is fine — the ones that rot are the hard-coded ones.
 */
import fs from 'fs';
import path from 'path';

import { en } from '@/lib/i18n/locales/en';

const ROOTS = ['app', 'components', 'hooks', 'lib'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
/** The i18n tests deliberately pass unknown keys to prove the fallback works. */
const SKIP_DIRECTORIES = new Set(['__tests__', 'node_modules', 'locales']);

const T_CALL = /\bt\(\s*['"]([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)['"]/g;

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      sourceFiles(path.join(dir, entry.name), found);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

function resolves(namespace: string, key: string): boolean {
  const section = (en as unknown as Record<string, unknown>)[namespace];
  if (!section || typeof section !== 'object') return false;
  return typeof (section as Record<string, unknown>)[key] === 'string';
}

describe('translation keys', () => {
  const files = ROOTS.flatMap((root) =>
    fs.existsSync(root) ? sourceFiles(root) : []
  );

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('every t() key used in the app exists in the English dictionary', () => {
    const missing: string[] = [];
    let checked = 0;

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(T_CALL)) {
        const [, namespace, key] = match;
        checked += 1;
        if (!resolves(namespace, key)) {
          missing.push(`${namespace}.${key}  (${file})`);
        }
      }
    }

    expect(checked).toBeGreaterThan(500);
    // Listed rather than counted: the point of failing is knowing which string is raw.
    expect(missing).toEqual([]);
  });
});
