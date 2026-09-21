#!/usr/bin/env node
/**
 * fill-verses.mjs — fills verses/daily-verses.json with the text of all 183 verses in the
 * three languages the app speaks.
 *
 *   node scripts/fill-verses.mjs
 *
 * Sources, one per language:
 *   ko  대한성서공회 · 개역한글판   (version=HAN)
 *   en  eBible.org · World English Bible  (public domain)
 *   km  eBible.org · ព្រះគម្ពីរខ្មែរបកប្រែចាស់ ១៩៥៤
 *
 * The text is never typed from memory — what the page says is what goes in the file, minus
 * markup, footnote markers and the popup bodies a site hides inside a verse. Pages are cached
 * under verses/.cache so a re-run costs nothing, and requests are 300ms apart.
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

/** 개역한글. Do not change — the licence for the Korean text rests on it. */
const KO_VERSION = 'HAN';
const KO_BOOK_LIST = 'https://www.bskorea.or.kr/bible/js/bible.list.js';
const koChapterUrl = (book, chap) =>
  `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=${KO_VERSION}&book=${book}&chap=${chap}`;

/** eBible.org names a chapter file `{BOOK}{chapter}`, padded — GEN01, JHN14, but PSA001. */
const ebibleChapterUrl = (edition, code, pad, chap) =>
  `https://ebible.org/${edition}/${code}${String(chap).padStart(pad, '0')}.htm`;

const ATTRIBUTION = {
  ko: '성경전서 개역한글판 © 대한성서공회',
  en: 'World English Bible (public domain)',
  km: 'ព្រះគម្ពីរខ្មែរបកប្រែចាស់ ១៩៥៤ © The Bible Society in Cambodia',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Named politely so the hosts can see who is asking. */
const USER_AGENT = 'p28-community-app/1.0 (daily verse import; contact via github.com/elponchis/p28)';

async function cachedText(url, file) {
  const full = path.join(CACHE_DIR, file);
  if (fs.existsSync(full)) return fs.readFileSync(full, 'utf8');
  // A page that exists still answers 404 when the host is being asked for a lot of them, so a
  // failure is retried, backing off further each time, before it is believed.
  let res;
  for (let attempt = 1; attempt <= 6; attempt++) {
    res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    if (res.ok) break;
    if (attempt === 6) throw new Error(`${url} -> HTTP ${res.status} after ${attempt} tries`);
    await sleep(attempt * 4000);
  }
  const charset = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1] ?? 'utf-8';
  const text = new TextDecoder(charset).decode(Buffer.from(await res.arrayBuffer()));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
  await sleep(700);
  return text;
}

/* ---------- book codes: read them from each source, never guess ---------- */

/** `szHANBook[0] = new Array("창세기", "gen", …)` — book number (1-based) to 대한성서공회 code. */
async function koBooks() {
  const js = await cachedText(KO_BOOK_LIST, 'bible.list.js');
  const books = new Map();
  for (const m of js.matchAll(/szHANBook\[(\d+)\]\s*=\s*new Array\("([^"]+)",\s*"([^"]+)"/g)) {
    books.set(Number(m[1]) + 1, { name: m[2], code: m[3] });
  }
  if (books.size !== 66) throw new Error(`대한성서공회 list has ${books.size} books, expected 66`);
  return books;
}

/**
 * The book codes and chapter padding an eBible edition actually uses, read off its own contents
 * page. The page also lists front matter and the deuterocanon, so the 66 the app needs are the
 * 39 that run from Genesis to Malachi plus the 27 that start at Matthew.
 */
async function ebibleBooks(edition) {
  const html = await cachedText(`https://ebible.org/${edition}/`, `${edition}/index.html`);
  const listed = [];
  for (const m of html.matchAll(/href=['"]([A-Z0-9]{3})(\d+)\.htm['"]/g)) {
    if (!listed.some((b) => b.code === m[1])) listed.push({ code: m[1], pad: m[2].length });
  }
  const malachi = listed.findIndex((b) => b.code === 'MAL');
  const matthew = listed.findIndex((b) => b.code === 'MAT');
  if (malachi < 0 || matthew < 0) throw new Error(`${edition}: contents page has no MAL/MAT`);
  const canon = [...listed.slice(malachi - 38, malachi + 1), ...listed.slice(matthew, matthew + 27)];
  if (canon.length !== 66) throw new Error(`${edition}: found ${canon.length} books, expected 66`);
  if (canon[0].code !== 'GEN' || canon[65].code !== 'REV' || canon[42].code !== 'JHN') {
    throw new Error(`${edition}: canon starts ${canon[0].code}, ends ${canon[65].code}, 43rd is ${canon[42].code}`);
  }
  return new Map(canon.map((b, i) => [i + 1, b]));
}

/* ---------- parsers, each written against the page it reads ---------- */

/**
 * 대한성서공회: `<span class="number">N</span>` then the verse. Footnote popups sit inside the
 * verse and carry a `</div>` of their own, so they come out first — otherwise the last verse of
 * a chapter runs on into the page's sidebar.
 */
function parseKorean(html) {
  const body = html
    .slice(html.indexOf('chapNum'))
    .replace(/<div[^>]*class=["']?D\d[^>]*>[\s\S]*?<\/div>/gi, '');
  const verses = new Map();
  const re =
    /<span class="number">\s*(\d+)(?:&nbsp;|\s)*<\/span>([\s\S]*?)(?=<span class="number">|<br\s*\/?>|<\/div>)/g;
  for (const m of body.matchAll(re)) {
    const text = clean(m[2].replace(/<a\b[^>]*class=comment[\s\S]*?<\/a>/gi, ''));
    if (text) verses.set(Number(m[1]), text);
  }
  return verses;
}

/**
 * eBible.org: `<span class="verse" id="Vn">n </span>` then the verse, up to the next verse.
 *
 * Poetry breaks a single verse across several `<div class='q…'>` lines, so a `</div>` is not the
 * end of anything — stopping there loses the rest of every psalm. The chapter itself ends at the
 * footnotes or the bottom nav, and that is the only boundary the last verse gets.
 */
function parseEbible(html) {
  const start = html.indexOf('<div class="main"');
  let end = html.indexOf('<div class="footnote', start);
  if (end < 0) end = html.lastIndexOf("<ul class='tnav'>");
  if (end < start) end = html.length;
  const body = html
    .slice(start, end)
    // Section headings, parallel references and psalm superscriptions sit between verses and
    // would otherwise be read as the tail of the verse before them.
    .replace(/<div class='(?:s\d?|ms\d?|mr|r|d)'>[\s\S]*?<\/div>/gi, '');
  const verses = new Map();
  const re = /<span class="verse" id="V(\d+)">[\s\S]*?<\/span>([\s\S]*?)(?=<span class="verse"|$)/g;
  for (const m of body.matchAll(re)) {
    // Cross references and footnotes hang off the verse as their own anchors.
    const text = clean(m[2].replace(/<a\b[^>]*class=['"]?(notemark|xref)[\s\S]*?<\/a>/gi, ''));
    if (text) verses.set(Number(m[1]), text);
  }
  return verses;
}

/** The book's own name, from the chapter page's nav link back to its index. */
function ebibleBookName(html) {
  return clean(/<li><a href='index\.htm'>([^<]+)<\/a><\/li>/.exec(html)?.[1] ?? '');
}

function clean(fragment) {
  return fragment
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- run ---------- */

const refs = JSON.parse(fs.readFileSync(REFS, 'utf8'));
fs.mkdirSync(CACHE_DIR, { recursive: true });

const ko = await koBooks();
const ebible = { en: await ebibleBooks('web'), km: await ebibleBooks('khm-h') };

const chapters = new Map();
for (const v of refs.verses) {
  if (!ko.has(v.book) || !ebible.en.has(v.book)) throw new Error(`no code for book ${v.book}`);
  chapters.set(`${v.book}-${v.chapter}`, { book: v.book, chapter: v.chapter });
}
console.log(`${refs.verses.length} verses across ${chapters.size} chapters, 3 languages`);

const text = { ko: new Map(), en: new Map(), km: new Map() };
const bookName = { en: new Map(), km: new Map() };
let done = 0;
for (const [key, { book, chapter }] of chapters) {
  const koHtml = await cachedText(koChapterUrl(ko.get(book).code, chapter), `ko/${ko.get(book).code}-${chapter}.html`);
  text.ko.set(key, parseKorean(koHtml));

  for (const [locale, edition] of [
    ['en', 'web'],
    ['km', 'khm-h'],
  ]) {
    const { code, pad } = ebible[locale].get(book);
    const html = await cachedText(
      ebibleChapterUrl(edition, code, pad, chapter),
      `${locale}/${code}-${chapter}.html`
    );
    text[locale].set(key, parseEbible(html));
    if (!bookName[locale].has(book)) bookName[locale].set(book, ebibleBookName(html));
  }

  if (++done % 20 === 0) console.log(`  ${done}/${chapters.size} chapters`);
}

const filled = refs.verses.map((v) => {
  const key = `${v.book}-${v.chapter}`;
  return {
    day: v.day,
    theme: v.theme,
    book: v.book,
    chapter: v.chapter,
    verse: v.verse,
    reference: {
      ko: v.ref,
      en: `${bookName.en.get(v.book)} ${v.chapter}:${v.verse}`,
      km: `${bookName.km.get(v.book)} ${v.chapter}:${v.verse}`,
    },
    text: {
      ko: text.ko.get(key)?.get(v.verse) ?? '',
      en: text.en.get(key)?.get(v.verse) ?? '',
      km: text.km.get(key)?.get(v.verse) ?? '',
    },
  };
});

/* ---------- checks: every one has to pass ---------- */

const problems = [];
const say = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) problems.push(label);
};

say(filled.length === 183, `count is 183 (got ${filled.length})`);

for (const locale of ['ko', 'en', 'km']) {
  const empty = filled.filter((v) => !v.text[locale].trim());
  say(empty.length === 0, `${locale}: no empty text (${empty.length}${empty.length ? ': ' + empty.slice(0, 5).map((v) => v.reference.ko).join(', ') : ''})`);
  const broken = filled.filter((v) => v.text[locale].includes('�'));
  say(broken.length === 0, `${locale}: no replacement characters (${broken.length})`);
  const noRef = filled.filter((v) => !v.reference[locale] || /undefined/.test(v.reference[locale]));
  say(noRef.length === 0, `${locale}: every verse has a reference label (${noRef.length} missing)`);
}

const john146 = { ko: text.ko, en: text.en, km: text.km };
const jhn = '43-14';
say(
  (john146.ko.get(jhn)?.get(6) ?? '').includes('가라사대'),
  `ko is 개역한글 — 요한복음 14:6 has 가라사대 (${(john146.ko.get(jhn)?.get(6) ?? '').slice(0, 34)}…)`
);
say(
  /the way, the truth, and the life/i.test(john146.en.get(jhn)?.get(6) ?? ''),
  `en is the WEB — John 14:6 (${(john146.en.get(jhn)?.get(6) ?? '').slice(0, 44)}…)`
);
say(
  /[ក-៿]/.test(john146.km.get(jhn)?.get(6) ?? ''),
  `km is Khmer script — John 14:6 (${(john146.km.get(jhn)?.get(6) ?? '').slice(0, 30)}…)`
);

// Poetry runs one verse across several lines; this is the verse that caught it going missing.
const psalm28 = filled.find((v) => v.reference.ko === '시편 2:8');
say(
  /possession/i.test(psalm28.text.en),
  `en keeps every line of a poetic verse — 시편 2:8 (${psalm28.text.en})`
);
say(
  psalm28.text.km.length > 40,
  `km keeps every line of a poetic verse — 시편 2:8 (${psalm28.text.km.slice(0, 40)}…)`
);
// A section heading between two verses must not be read as the tail of the first one.
const joshua19 = filled.find((v) => v.reference.ko === '여호수아 1:9');
say(
  !/ការ​រៀបចំ/.test(joshua19.text.km),
  `km leaves section headings out — 여호수아 1:9 ends "${joshua19.text.km.slice(-24)}"`
);

const dayOne = filled[0];
say(
  dayOne.reference.ko === '시편 2:8' && dayOne.text.ko.includes('열방'),
  `day 1 is 시편 2:8 containing 열방 (${dayOne.text.ko.slice(0, 34)}…)`
);

for (const locale of ['ko', 'en', 'km']) {
  const odd = filled.filter((v) => v.text[locale].length < 10 || v.text[locale].length > 400);
  console.log(
    odd.length === 0
      ? `PASS  ${locale}: every verse is 10–400 characters`
      : `WARN  ${locale}: ${odd.length} verse(s) outside 10–400 characters — check the parse:\n` +
          odd.map((v) => `        day ${v.day} ${v.reference[locale]} (${v.text[locale].length}) ${v.text[locale]}`).join('\n')
  );
}

if (problems.length > 0) {
  console.error(`\n${problems.length} check(s) failed; nothing written.`);
  process.exit(1);
}

fs.writeFileSync(
  OUT,
  JSON.stringify({ attribution: ATTRIBUTION, count: filled.length, verses: filled }, null, 2) + '\n'
);
console.log(`\nwrote ${path.relative(ROOT, OUT)}`);

console.log('\n--- samples, verbatim ---');
for (const day of [1, 2, 3, 20, 50, 80, 100, 130, 160, 183]) {
  const v = filled[day - 1];
  console.log(`${String(day).padStart(3)}  ${v.reference.ko}  ${v.text.ko}`);
  console.log(`     ${v.reference.en}  ${v.text.en}`);
  console.log(`     ${v.reference.km}  ${v.text.km}`);
}
