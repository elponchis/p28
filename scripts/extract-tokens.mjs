#!/usr/bin/env node
/**
 * extract-tokens.mjs — Claude Design 캔버스에서 디자인 토큰을 뽑아
 * theme/tokens.ts 와 theme/tokens.json 을 다시 만듭니다.
 *
 *   node scripts/extract-tokens.mjs <아트보드 폴더> [--out theme]
 *
 * 캔버스를 편집한 뒤 아트보드 파일을 내려받아 이 스크립트를 다시 돌리면
 * 토큰 파일이 캔버스와 다시 맞춰집니다. 손으로 옮겨 적지 않으므로
 * 디자인과 코드가 어긋날 일이 없습니다.
 *
 * 이름 붙이기: 아래 NAMES에 있는 색만 이름을 받습니다.
 * 캔버스에 새 색이 생기면 "이름 없는 값"으로 보고되니, NAMES에 한 줄
 * 추가한 뒤 다시 돌리세요.
 *
 * 의존성 없음. Node 18 이상.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const SRC = args.find((a) => !a.startsWith('--')) ?? '.';
const OUT = (() => {
  const i = args.indexOf('--out');
  return i >= 0 ? args[i + 1] : 'theme';
})();

/** hex → 토큰 이름. 여기 없는 색은 보고만 되고 파일에 들어가지 않습니다. */
const NAMES = {
  '#2C7CB5': ['brand', '앱 아이콘의 파랑. 로고·큰 강조 면적에만.'],
  '#1E5C8C': ['brandDeep', '기본 동작(버튼, 선택된 탭, 링크). 흰 글씨는 이 위에만.'],
  '#E3EFF8': ['brandSoft', '옅은 파랑 배경 — 칩, 아바타, 빈 섬네일.'],
  '#D6E5F0': ['onBrandMuted', '파란 면 위의 보조 글자.'],
  '#0B2A45': ['ink', '본문 글자색이자 가장 어두운 면.'],
  '#35506A': ['inkSoft', '본문보다 한 단계 옅은 글자.'],
  '#4E6679': ['muted', '보조 글자. ground 위에서 대비 5.4:1.'],
  '#D98F2B': ['sand', '따뜻한 강조. 채움색으로만.'],
  '#FBEBD2': ['sandSoft', '앰버 옅은 면 — 활성 메뉴, 반응 칩.'],
  '#E7C79A': ['sandLine', '앰버 면의 테두리.'],
  '#8A5A12': ['sandInk', '앰버 면 위의 글자.'],
  '#F2F6FA': ['ground', '화면 바탕.'],
  '#FFFFFF': ['surface', '카드·사이드바 바탕.'],
  '#F8FAFC': ['surfaceSunken', '입력창처럼 내려앉은 면.'],
  '#DCE6EF': ['line', '테두리·구분선.'],
  '#E9EEF3': ['neutralSoft', '중립 칩·아바타.'],
  '#1C6B67': ['teal', '보조 색조 — 계열 구분용.'],
  '#DCEAE7': ['tealSoft', 'teal 계열 옅은 면.'],
  '#14534F': ['tealInk', 'tealSoft 위의 글자.'],
  '#0B2A45X': ['unused', ''],
};

const FONT_SIZE_NAMES = {
  11: 'micro', 12: 'caption', 13: 'small', 14: 'label', 15: 'body',
  16: 'bodyLarge', 19: 'title', 21: 'verseSm', 24: 'heading',
  25: 'verseMd', 27: 'verse', 32: 'display', 34: 'displayLg', 36: 'displayXl', 38: 'displayXxl',
};

const RADIUS_NAMES = {
  8: 'xs', 10: 'control', 11: 'controlLg', 12: 'field',
  14: 'cardSm', 16: 'card', 18: 'feature', 999: 'pill',
};

/* ---------- 수집 ---------- */

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.dc.html'));
if (!files.length) {
  console.error(`아트보드(.dc.html)를 찾지 못했습니다: ${path.resolve(SRC)}`);
  process.exit(1);
}

const tally = { color: new Map(), fontSize: new Map(), radius: new Map(), space: new Map(), font: new Map() };
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);

for (const f of files) {
  const text = fs.readFileSync(path.join(SRC, f), 'utf8');

  for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) bump(tally.color, m[0].toUpperCase());
  for (const m of text.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) bump(tally.fontSize, Number(m[1]));
  for (const m of text.matchAll(/border-radius:\s*(\d+(?:\.\d+)?)px/g)) bump(tally.radius, Number(m[1]));
  for (const m of text.matchAll(/border-radius:\s*(999)px/g)) bump(tally.radius, 999);
  for (const m of text.matchAll(/(?:gap|padding|margin(?:-top|-bottom|-left|-right)?):\s*([\d\s]+?)px/g)) {
    for (const n of m[1].trim().split(/\s+/)) if (n) bump(tally.space, Number(n));
  }
  for (const m of text.matchAll(/font-family:\s*'([^']+)'/g)) bump(tally.font, m[1]);
}

const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);

/* ---------- 이름 붙이기 ---------- */

const named = [];
const unnamed = [];
for (const [hex, count] of sorted(tally.color)) {
  if (NAMES[hex]) named.push({ name: NAMES[hex][0], hex, note: NAMES[hex][1], count });
  else unnamed.push({ hex, count });
}

const sizes = sorted(tally.fontSize).map(([px, count]) => ({ px, count, name: FONT_SIZE_NAMES[px] }));
const radii = sorted(tally.radius).map(([px, count]) => ({ px, count, name: RADIUS_NAMES[px] }));
const spaces = sorted(tally.space).map(([px, count]) => ({ px, count }));

/* ---------- 출력 ---------- */

const json = {
  generatedFrom: files.length + '개 아트보드',
  color: Object.fromEntries(named.map((c) => [c.name, c.hex])),
  fontSize: Object.fromEntries(sizes.filter((s) => s.name).map((s) => [s.name, s.px])),
  radius: Object.fromEntries(radii.filter((r) => r.name).map((r) => [r.name, r.px])),
  space: spaces.map((s) => s.px).filter((n) => n % 4 === 0).sort((a, b) => a - b),
  font: [...tally.font.keys()],
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');

const ts = `/**
 * P2:8 디자인 토큰 — 손으로 고치지 마세요.
 *
 * Claude Design 캔버스의 아트보드 ${files.length}개에서 자동으로 뽑아낸 파일입니다.
 * 디자인을 고쳤으면 아트보드를 내려받아 다시 돌리세요:
 *
 *   node scripts/extract-tokens.mjs <아트보드 폴더>
 */

export const color = {
${named.map((c) => `  /** ${c.note} (캔버스에서 ${c.count}회) */\n  ${c.name}: '${c.hex}',`).join('\n')}
} as const;

/** 예전 팔레트 → 새 토큰. 치환이 끝나면 지워도 됩니다. */
export const legacyColorMap: Record<string, keyof typeof color> = {
  '#F9F9FF': 'ground',
  '#002046': 'ink',
  '#151C27': 'ink',
  '#FED488': 'sandSoft',
  '#DCE3F2': 'line',
  '#E7EEFE': 'brandSoft',
  '#E5EAF6': 'brandSoft',
  '#EBEEF9': 'brandSoft',
};

/** 4px 그리드. 캔버스에서 실제로 쓰인 값. */
export const space = {
${json.space.map((n) => `  s${n}: ${n},`).join('\n')}
} as const;

export const radius = {
${radii.filter((r) => r.name).map((r) => `  ${r.name}: ${r.px},`).join('\n')}
} as const;

export const fontSize = {
${sizes.filter((s) => s.name).map((s) => `  ${s.name}: ${s.px},`).join('\n')}
} as const;

export const font = {
  /** 말씀 인용과 그룹 이름에만. */
  serif: 'Gowun Batang',
  sans: 'IBM Plex Sans KR',
} as const;

export const fontWeight = { regular: '400', medium: '500', bold: '600' } as const;
export const lineHeight = { tight: 1.35, body: 1.65, verse: 1.6 } as const;

/** 최소 터치 영역. */
export const hitSize = 44;

export const tokens = { color, space, radius, font, fontSize, fontWeight, lineHeight, hitSize } as const;
export default tokens;
`;

fs.writeFileSync(path.join(OUT, 'tokens.ts'), ts, 'utf8');

/* ---------- 리포트 ---------- */

console.log(`\n아트보드 ${files.length}개에서 추출`);
console.log(`  색 ${named.length}개 · 글자 크기 ${json.fontSize ? Object.keys(json.fontSize).length : 0}단계 · 모서리 ${Object.keys(json.radius).length}종 · 여백 ${json.space.length}단계`);
console.log(`\n색 (많이 쓰인 순)`);
for (const c of named) console.log(`  ${c.hex}  ${c.name.padEnd(14)} ${String(c.count).padStart(3)}회`);

if (unnamed.length) {
  console.log(`\n이름 없는 값 ${unnamed.length}건 — NAMES에 추가한 뒤 다시 돌리세요`);
  for (const u of unnamed) console.log(`  ${u.hex}  ${String(u.count).padStart(3)}회`);
}

const offGrid = spaces.filter((s) => s.px % 4 !== 0);
if (offGrid.length) {
  console.log(`\n4px 그리드 밖 여백 ${offGrid.length}종 — 캔버스에서 정리할 후보`);
  console.log('  ' + offGrid.map((s) => `${s.px}px(${s.count})`).join('  '));
}

console.log(`\n${path.join(OUT, 'tokens.ts')} 와 tokens.json 을 새로 썼습니다.\n`);
