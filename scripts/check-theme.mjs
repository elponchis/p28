#!/usr/bin/env node
/**
 * check-theme.mjs — 토큰을 벗어난 값을 소스에서 찾아냅니다.
 *
 *   node scripts/check-theme.mjs            리포트
 *   node scripts/check-theme.mjs --json     JSON (CLI에 그대로 먹이기 좋음)
 *   node scripts/check-theme.mjs --quiet    요약만
 *
 * 기준은 theme/tokens.json — extract-tokens.mjs 가 Claude Design 캔버스에서
 * 뽑아낸 파일입니다. 따라서 캔버스를 고치고 다시 뽑으면 이 검사 기준도
 * 같이 따라옵니다. 손으로 맞출 필요가 없습니다.
 *
 * 의존성 없음. Node 18 이상.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const AS_JSON = ARGS.has('--json');
const QUIET = ARGS.has('--quiet');

/* ---------- 기준 불러오기 ---------- */

const TOKENS_PATH = ['theme/tokens.json', 'src/theme/tokens.json', 'app/theme/tokens.json']
  .map((p) => path.join(ROOT, p))
  .find((p) => fs.existsSync(p));

if (!TOKENS_PATH) {
  console.error(
    'theme/tokens.json 을 찾지 못했습니다.\n' +
      '먼저 캔버스에서 토큰을 뽑으세요:\n' +
      '  node scripts/extract-tokens.mjs <아트보드 폴더>'
  );
  process.exit(2);
}

/**
 * tokens.json 옆의 tokens.extra.json 을 합쳐 읽습니다. 캔버스 export 가 앱이 실제로 쓰는
 * 스케일보다 좁을 때, 앱 쪽을 캔버스에 맞춰 바꾸는 대신 여기에 적어 둡니다. extra 는 손으로
 * 관리하는 파일이라 재추출해도 덮어쓰이지 않습니다.
 *
 * 같은 이름이 양쪽에 있으면 캔버스가 이깁니다 — extra 는 더하는 용도지, 캔버스를 무르는
 * 수단이 아닙니다. space 는 배열이라 합집합으로 합칩니다.
 */
function mergeTokens(base, extra) {
  if (!extra) return base;
  const out = { ...base };
  for (const [group, value] of Object.entries(extra)) {
    if (Array.isArray(value)) {
      out[group] = [...new Set([...(base[group] ?? []), ...value])].sort((a, b) => a - b);
    } else if (value && typeof value === 'object') {
      out[group] = { ...value, ...(base[group] ?? {}) };
    }
  }
  return out;
}

const EXTRA_PATH = path.join(path.dirname(TOKENS_PATH), 'tokens.extra.json');
const EXTRA = fs.existsSync(EXTRA_PATH) ? JSON.parse(fs.readFileSync(EXTRA_PATH, 'utf8')) : null;

const T = mergeTokens(JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')), EXTRA);
const PALETTE = T.color;
const PALETTE_SET = new Set(Object.values(PALETTE).map((v) => v.toUpperCase()));
const FONT_SIZES = Object.values(T.fontSize);
const FONT_SIZE_NAME = Object.fromEntries(Object.entries(T.fontSize).map(([k, v]) => [v, k]));
const RADII = Object.values(T.radius);
const RADIUS_NAME = Object.fromEntries(Object.entries(T.radius).map(([k, v]) => [v, k]));
const SPACES = T.space;

/** 예전 팔레트 → 새 토큰. 정확히 일치하면 이쪽 제안이 우선합니다. */
const LEGACY = {
  '#F9F9FF': 'ground',
  '#002046': 'ink',
  '#151C27': 'ink',
  '#FED488': 'sandSoft',
  '#DCE3F2': 'line',
  '#E7EEFE': 'brandSoft',
  '#E5EAF6': 'brandSoft',
  '#EBEEF9': 'brandSoft',
};

/** 팔레트 이름 → 앱의 역할 이름. 컴포넌트는 역할 이름으로만 고칩니다. */
const ROLE_FOR = {
  brandDeep: 'colors.primary',
  brandSoft: 'colors.surfaceContainerHighest',
  sand: 'colors.secondary',
  sandSoft: 'colors.amberSoft',
  sandInk: 'colors.onSecondaryContainer',
  ground: 'colors.background',
  surface: 'colors.surface',
  surfaceSunken: 'colors.surfaceContainerLow',
  neutralSoft: 'colors.surfaceContainerHigh',
  ink: 'colors.onSurface',
  inkSoft: 'colors.ink300',
  muted: 'colors.onSurfaceVariant',
  line: 'colors.outlineVariant',
};
const roleOf = (name) => ROLE_FOR[name] ?? `palette.${name} (맞는 역할 없음 — 보고)`;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo',
  '.expo-shared',
  'dist',
  'build',
  'android',
  'ios',
  'coverage',
  '.next',
  'supabase',
]);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const SKIP_FILES = [
  /tokens\.(ts|js|json)$/,
  /palette\.generated\.ts$/,
  /-theme\.mjs$/,
  /-tokens\.mjs$/,
  /-artboards\.mjs$/,
  /\.d\.ts$/,
  /__tests__/,
];

/**
 * 스케일 밖이지만 의도한 값. 줄 번호가 아니라 파일·종류·값으로 짚기 때문에 코드가 움직여도
 * 따라갑니다. `why`는 선택이 아닙니다 — 이유 없는 예외는 예외가 아니라 빚이고, 다음 사람이
 * 지워도 되는지 판단할 수 없게 됩니다. 값을 스케일 안으로 옮길 수 있으면 여기 적지 말고
 * 옮기세요. 이 목록이 길어지면 스케일이 틀린 것입니다.
 */
const ALLOW = [
  {
    file: 'components/patterns/SectionHeader.tsx',
    kind: 'spacing',
    value: 'paddingVertical: 1',
    why:
      '안 읽음 개수 배지 — 12px 숫자 하나를 감싸는 pill. 1px은 글자가 테두리에 닿지 않을 ' +
      '만큼만 띄우는 값이고, 여백 스케일의 최소 단위(4)는 이 크기의 pill에 과하다.',
  },
  {
    file: 'components/patterns/VideoEmbedPlayer.tsx',
    kind: 'color',
    value: '#000',
    why:
      '16:9 영상 컨테이너와 webview의 레터박스 바탕. 팔레트의 회색은 전부 파랑 기운이라 ' +
      '영상 옆에 두면 검정이 아니라 파란 띠로 보인다. 레터박스는 순수 검정이어야 한다.',
  },
];

const allowed = (f) =>
  ALLOW.some((a) => a.file === f.file && a.kind === f.kind && String(a.value) === String(f.value));

/* ---------- 가장 가까운 토큰 ---------- */

const toRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

function nearestColor(hex) {
  const up = hex.toUpperCase();
  if (LEGACY[up]) return { name: LEGACY[up], exact: true };
  const [r, g, b] = toRgb(up);
  let best = null;
  for (const [name, value] of Object.entries(PALETTE)) {
    const [r2, g2, b2] = toRgb(value);
    const d = Math.hypot(r - r2, g - g2, b - b2);
    if (!best || d < best.d) best = { name, d };
  }
  return { name: best.name, exact: false, distance: Math.round(best.d) };
}

const nearestOf = (list, n) => list.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));

/* ---------- 파일 순회 ---------- */

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full, out);
    } else if (EXTS.has(path.extname(e.name))) {
      const rel = path.relative(ROOT, full);
      if (!SKIP_FILES.some((re) => re.test(rel))) out.push(full);
    }
  }
  return out;
}

/* ---------- 검사 ---------- */

const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
const FONT_SIZE = /\bfontSize\s*:\s*(\d+(?:\.\d+)?)/g;
const SPACING =
  /\b(padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|gap|rowGap|columnGap)\s*:\s*(\d+(?:\.\d+)?)/g;
const RADIUS = /\bborderRadius\s*:\s*(\d+(?:\.\d+)?)/g;

function checkFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const findings = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    const at = { file: rel, line: i + 1 };

    for (const m of line.matchAll(HEX)) {
      const hex = m[0].toUpperCase();
      if (PALETTE_SET.has(hex)) continue;
      const near = nearestColor(hex);
      findings.push({
        ...at,
        kind: 'color',
        value: m[0],
        suggest: roleOf(near.name),
        note: near.exact ? '예전 팔레트 — 그대로 치환' : `가장 가까운 토큰 (거리 ${near.distance})`,
      });
    }

    for (const m of line.matchAll(FONT_SIZE)) {
      const n = Number(m[1]);
      if (FONT_SIZES.includes(n)) continue;
      const near = nearestOf(FONT_SIZES, n);
      findings.push({
        ...at,
        kind: 'fontSize',
        value: m[1],
        suggest: `fontSize.${FONT_SIZE_NAME[near]} (${near})`,
        note: '타입 스케일 밖',
      });
    }

    for (const m of line.matchAll(SPACING)) {
      const n = Number(m[2]);
      if (SPACES.includes(n)) continue;
      findings.push({
        ...at,
        kind: 'spacing',
        value: `${m[1]}: ${m[2]}`,
        suggest: `${nearestOf(SPACES, n)}`,
        note: '여백 스케일 밖',
      });
    }

    for (const m of line.matchAll(RADIUS)) {
      const n = Number(m[1]);
      if (RADII.includes(n) || n === 999) continue;
      const near = nearestOf(RADII, n);
      findings.push({
        ...at,
        kind: 'radius',
        value: m[1],
        suggest: `radius.${RADIUS_NAME[near]} (${near})`,
        note: '모서리 스케일 밖',
      });
    }
  });

  return findings;
}

/* ---------- 실행 ---------- */

const files = walk(ROOT);
const all = files.flatMap(checkFile).filter((f) => !allowed(f));

if (AS_JSON) {
  console.log(
    JSON.stringify(
      { tokens: path.relative(ROOT, TOKENS_PATH), scanned: files.length, findings: all },
      null,
      2
    )
  );
  process.exit(all.length ? 1 : 0);
}

const byKind = all.reduce((acc, f) => ((acc[f.kind] = (acc[f.kind] || 0) + 1), acc), {});

console.log(`\n기준: ${path.relative(ROOT, TOKENS_PATH)} (캔버스에서 추출)`);
console.log(`파일 ${files.length}개 검사 · 토큰을 벗어난 값 ${all.length}건`);
if (all.length)
  console.log(
    Object.entries(byKind)
      .map(([k, v]) => `  ${k} ${v}`)
      .join('\n')
  );

if (!QUIET && all.length) {
  const byFile = all.reduce((acc, f) => ((acc[f.file] ||= []).push(f), acc), {});
  for (const [file, items] of Object.entries(byFile)) {
    console.log(`\n${file}`);
    for (const f of items) {
      console.log(`  ${String(f.line).padStart(4)}  ${f.value}  →  ${f.suggest}   (${f.note})`);
    }
  }
}

console.log(
  all.length
    ? '\n색 항목은 제안된 역할 이름(colors.*)으로 바꾸세요. 여백·글자 크기 항목은 바꾸지 말고 보고만 합니다.\n'
    : '\n전부 토큰 안에 있습니다.\n'
);

process.exit(all.length ? 1 : 0);
