#!/usr/bin/env node
/**
 * normalize-artboards.mjs — 아트보드의 값을 정해둔 스케일에 맞춥니다.
 *
 *   node scripts/normalize-artboards.mjs <아트보드 폴더> [--dry]
 *
 * 눈대중으로 찍힌 11px, 14px, 25px 같은 값을 스케일 안의 값으로 당겨
 * 붙입니다. 레이아웃 구조(flex, grid, width, height)는 건드리지 않고
 * font-size / border-radius / gap / padding / margin 만 바꿉니다.
 *
 * --dry 를 붙이면 무엇이 바뀔지만 보여주고 파일은 쓰지 않습니다.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const SRC = args.find((a) => !a.startsWith('--')) ?? '.';
const DRY = args.includes('--dry');

/** 글자 크기 스케일 밖의 값 → 안쪽 값 */
const FONT = { 11: 12, 17: 16, 18: 19, 20: 19, 22: 21, 25: 27, 26: 27, 28: 27, 30: 32, 34: 32, 36: 32, 38: 32 };

/** 모서리 스케일 밖의 값 → 안쪽 값 (8 / 10 / 12 / 16 / 18 / 999) */
const RADIUS = { 4: 8, 5: 8, 6: 8, 9: 8, 11: 10, 13: 12, 14: 16, 15: 16, 17: 16, 20: 18, 22: 18, 24: 18 };

/** 4px 그리드 밖의 여백 → 안쪽 값 */
const SPACE = {
  1: 4, 2: 4, 3: 4, 5: 4, 6: 8, 7: 8, 9: 8, 10: 8, 11: 12, 13: 12,
  14: 16, 15: 16, 17: 16, 18: 20, 19: 20, 21: 20, 22: 24, 23: 24,
  25: 24, 26: 24, 27: 28, 29: 28, 30: 32, 31: 32, 33: 32, 34: 32,
  35: 36, 37: 36, 38: 40, 39: 40,
};

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.dc.html'));
if (!files.length) {
  console.error(`아트보드(.dc.html)를 찾지 못했습니다: ${path.resolve(SRC)}`);
  process.exit(1);
}

let total = 0;
const changeLog = [];

for (const file of files) {
  const full = path.join(SRC, file);
  const before = fs.readFileSync(full, 'utf8');
  let count = 0;
  const seen = new Map();
  const note = (kind, from, to) => {
    count += 1;
    const key = `${kind} ${from}→${to}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  };

  let after = before;

  after = after.replace(/font-size:\s*(\d+)px/g, (m, n) => {
    const v = Number(n);
    if (!FONT[v]) return m;
    note('font-size', v, FONT[v]);
    return `font-size: ${FONT[v]}px`;
  });

  after = after.replace(/border-radius:\s*(\d+)px/g, (m, n) => {
    const v = Number(n);
    if (!RADIUS[v]) return m;
    note('radius', v, RADIUS[v]);
    return `border-radius: ${RADIUS[v]}px`;
  });

  // gap / padding / margin — 여러 값(예: "4px 8px 26px 8px")도 각각 처리
  const SPACING_PROP = /\b(gap|row-gap|column-gap|padding|padding-top|padding-bottom|padding-left|padding-right|margin|margin-top|margin-bottom|margin-left|margin-right):\s*([^;"']+)/g;
  after = after.replace(SPACING_PROP, (m, prop, value) => {
    const fixed = value.replace(/(\d+)px/g, (mm, n) => {
      const v = Number(n);
      if (!SPACE[v]) return mm;
      note(prop.split('-')[0], v, SPACE[v]);
      return `${SPACE[v]}px`;
    });
    return `${prop}: ${fixed}`;
  });

  if (count) {
    total += count;
    changeLog.push({ file, count, detail: [...seen.entries()].sort((a, b) => b[1] - a[1]) });
    if (!DRY) fs.writeFileSync(full, after, 'utf8');
  }
}

console.log(`\n아트보드 ${files.length}개 · 값 ${total}건 ${DRY ? '변경 예정' : '정리 완료'}`);
for (const c of changeLog) {
  console.log(`\n${c.file}  (${c.count}건)`);
  console.log('  ' + c.detail.map(([k, n]) => `${k}×${n}`).join('  '));
}
if (DRY) console.log('\n--dry 였으므로 파일은 그대로입니다.\n');
else console.log('\n캔버스에 다시 올린 뒤 extract-tokens.mjs 를 돌리세요.\n');
