#!/usr/bin/env node
/**
 * fill-verses.mjs — fills verses/daily-verses.json with 개역한글 text.
 *
 *   node scripts/fill-verses.mjs
 *
 * Reads the references in verses/daily-verses.refs.json, fetches each chapter once from
 * 대한성서공회 (version=HAN, the 개역한글판), and writes the verse text out verbatim. Pages are
 * cached under verses/.cache so a re-run costs nothing.
 *
 * The text is never typed from memory — what the page says is what goes in the file, minus
 * markup, footnote markers and the popup bodies the site hides inside the verse.
 *
 * No dependencies. Node 18+.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSES_DIR = path.join(ROOT, 'verses');
const CACHE_DIR = path.join(VERSES_DIR, '.cache');
const REFS = path.join(VERSES_DIR, 'daily-verses.refs.json');
const OUT = path.join(VERSES_DIR, 'daily-verses.json');

const VERSION = 'HAN'; // 개역한글. Do not change — the whole licence rests on it.
const BOOK_LIST_URL = 'https://www.bskorea.or.kr/bible/js/bible.list.js';
const chapterUrl = (book, chap) =>
  `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=${VERSION}&book=${book}&chap=${chap}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- book codes: read them from the site, never guess ---------- */

async function bookCodes() {
  const cached = path.join(CACHE_DIR, 'bible.list.js');
  let js;
  if (fs.existsSync(cached)) {
    js = fs.readFileSync(cached, 'utf8');
  } else {
    const res = await fetch(BOOK_LIST_URL);
    if (!res.ok) throw new Error(`book list -> HTTP ${res.status}`);
    js = await res.text();
    fs.writeFileSync(cached, js);
  }
  // szHANBook[0] = new Array("창세기", "gen", "1", …);
  const codes = new Map();
  for (const m of js.matchAll(/szHANBook\[(\d+)\]\s*=\s*new Array\("([^"]+)",\s*"([^"]+)"/g)) {
    codes.set(Number(m[1]) + 1, { name: m[2], code: m[3] });
  }
  if (codes.size !== 66) throw new Error(`expected 66 books in the site's list, found ${codes.size}`);
  return codes;
}

/* ---------- one chapter ---------- */

async function chapterHtml(book, chap) {
  const file = path.join(CACHE_DIR, `${book}-${chap}.html`);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const res = await fetch(chapterUrl(book, chap));
  if (!res.ok) throw new Error(`${book} ${chap} -> HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  const buf = Buffer.from(await res.arrayBuffer());
  const charset = /charset=([\w-]+)/i.exec(type)?.[1] ?? 'utf-8';
  const html = new TextDecoder(charset).decode(buf);
  if (!/[가-힣]/.test(html)) throw new Error(`${book} ${chap}: no Korean after decoding as ${charset}`);
  fs.writeFileSync(file, html);
  await sleep(300);
  return html;
}

/**
 * The page writes each verse as `<span class="number">N&nbsp;</span>` followed by the text, up to
 * the next verse or line break. Footnotes ride along inside the verse — a `1)` marker and a
 * hidden `<div>` holding the note — so both come out before the text does.
 */
function parseChapter(html) {
  // Footnote popups go first: they sit inside a verse and carry a `</div>` of their own, which
  // would otherwise look like the end of the verse list.
  const body = html
    .slice(html.indexOf('chapNum'))
    .replace(/<div[^>]*class=["']?D\d[^>]*>[\s\S]*?<\/div>/gi, '');
  const verses = new Map();
  // A verse runs to the next one, a line break, or the `</div>` that closes the chapter — the
  // last verse of a chapter has no verse or break after it, only the page's own markup.
  const re =
    /<span class="number">\s*(\d+)(?:&nbsp;|\s)*<\/span>([\s\S]*?)(?=<span class="number">|<br\s*\/?>|<\/div>)/g;
  for (const m of body.matchAll(re)) {
    const text = m[2]
      .replace(/<a\b[^>]*class=comment[\s\S]*?<\/a>/gi, '') // the "1)" marker
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) verses.set(Number(m[1]), text);
  }
  return verses;
}

/* ---------- run ---------- */

const refs = JSON.parse(fs.readFileSync(REFS, 'utf8'));
fs.mkdirSync(CACHE_DIR, { recursive: true });

const books = await bookCodes();
const chapters = new Map();
for (const v of refs.verses) {
  const book = books.get(v.book);
  if (!book) throw new Error(`no site code for book number ${v.book} (${v.bookName})`);
  chapters.set(`${book.code}-${v.chapter}`, { code: book.code, chapter: v.chapter });
}
console.log(`${refs.verses.length} verses across ${chapters.size} chapters`);

const parsed = new Map();
let fetched = 0;
for (const [key, { code, chapter }] of chapters) {
  parsed.set(key, parseChapter(await chapterHtml(code, chapter)));
  if (++fetched % 20 === 0) console.log(`  ${fetched}/${chapters.size} chapters`);
}

const filled = refs.verses.map((v) => {
  const code = books.get(v.book).code;
  const text = parsed.get(`${code}-${v.chapter}`)?.get(v.verse) ?? '';
  return { ...v, text };
});

/* ---------- checks: every one has to pass ---------- */

const problems = [];
const say = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) problems.push(label);
};

say(filled.length === 183, `count is 183 (got ${filled.length})`);

const empty = filled.filter((v) => !v.text.trim());
say(empty.length === 0, `no empty text (${empty.length} empty: ${empty.map((v) => v.ref).join(', ')})`);

const john146 = parsed.get('jhn-14')?.get(6) ?? '';
say(john146.includes('가라사대'), `요한복음 14:6 is 개역한글 — "가라사대" present (${john146.slice(0, 40)}…)`);

const dayOne = filled[0];
say(
  dayOne.ref === '시편 2:8' && dayOne.text.includes('열방'),
  `day 1 is 시편 2:8 containing 열방 (${dayOne.text.slice(0, 40)}…)`
);

const broken = filled.filter((v) => v.text.includes('�'));
say(broken.length === 0, `no replacement characters (${broken.length})`);

const odd = filled.filter((v) => v.text.length < 10 || v.text.length > 300);
console.log(
  odd.length === 0
    ? 'PASS  every verse is 10–300 characters'
    : `WARN  ${odd.length} verse(s) outside 10–300 characters — check the parse:\n` +
        odd.map((v) => `        day ${v.day} ${v.ref} (${v.text.length}) ${v.text}`).join('\n')
);

if (problems.length > 0) {
  console.error(`\n${problems.length} check(s) failed; nothing written.`);
  process.exit(1);
}

fs.writeFileSync(
  OUT,
  JSON.stringify({ version: refs.version, attribution: refs.attribution, count: filled.length, verses: filled }, null, 2) + '\n'
);
console.log(`\nwrote ${path.relative(ROOT, OUT)}`);

console.log('\n--- samples, verbatim ---');
for (const day of [1, 2, 3, 20, 50, 80, 100, 130, 160, 183]) {
  const v = filled[day - 1];
  console.log(`${String(day).padStart(3)}  ${v.ref}  ${v.text}`);
}
