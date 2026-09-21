/**
 * P2:8 팔레트 — 자동 생성 파일, 손으로 고치지 마세요.
 *
 * Claude Design 캔버스의 아트보드 8개에서 뽑았습니다.
 * 앱의 theme/tokens.ts 가 이 값을 역할(primary, background …)에 연결해 씁니다.
 * 디자인이 바뀌면 아트보드를 내려받아 다시 돌리세요:
 *
 *   node scripts/extract-tokens.mjs <아트보드 폴더>
 */

export const palette = {
  /** 보조 글자. ground 위에서 대비 5.4:1. (캔버스에서 99회) */
  muted: '#4E6679',
  /** 테두리·구분선. (캔버스에서 93회) */
  line: '#DCE6EF',
  /** 본문 글자색이자 가장 어두운 면. (캔버스에서 92회) */
  ink: '#0B2A45',
  /** 카드·사이드바 바탕. (캔버스에서 91회) */
  surface: '#FFFFFF',
  /** 기본 동작(버튼, 선택된 탭, 링크). 흰 글씨는 이 위에만. (캔버스에서 64회) */
  brandDeep: '#1E5C8C',
  /** 옅은 파랑 배경 — 칩, 아바타, 빈 섬네일. (캔버스에서 39회) */
  brandSoft: '#E3EFF8',
  /** 앰버 옅은 면 — 활성 메뉴, 반응 칩. (캔버스에서 20회) */
  sandSoft: '#FBEBD2',
  /** 앱 아이콘의 파랑. 로고·큰 강조 면적에만. (캔버스에서 17회) */
  brand: '#2C7CB5',
  /** 화면 바탕. (캔버스에서 16회) */
  ground: '#F2F6FA',
  /** 앰버 면 위의 글자. (캔버스에서 15회) */
  sandInk: '#8A5A12',
  /** 본문보다 한 단계 옅은 글자. (캔버스에서 14회) */
  inkSoft: '#35506A',
  /** 보조 색조 — 계열 구분용. (캔버스에서 10회) */
  teal: '#1C6B67',
  /** 중립 칩·아바타. (캔버스에서 6회) */
  neutralSoft: '#E9EEF3',
  /** 파란 면 위의 보조 글자. (캔버스에서 5회) */
  onBrandMuted: '#D6E5F0',
  /** 따뜻한 강조. 채움색으로만. (캔버스에서 3회) */
  sand: '#D98F2B',
  /** 입력창처럼 내려앉은 면. (캔버스에서 2회) */
  surfaceSunken: '#F8FAFC',
  /** 앰버 면의 테두리. (캔버스에서 2회) */
  sandLine: '#E7C79A',
  /** teal 계열 옅은 면. (캔버스에서 1회) */
  tealSoft: '#DCEAE7',
  /** tealSoft 위의 글자. (캔버스에서 1회) */
  tealInk: '#14534F',
} as const;

/** 캔버스에서 실제로 쓰인 스케일. 앱의 spacing / radius / typography 가 참고합니다. */
export const scale = {
  space: [0, 4, 8, 12, 16, 20, 24, 32, 48],
  radius: { xs: 8, control: 10, field: 12, card: 16, feature: 18, pill: 999 },
  fontSize: { caption: 12, small: 13, label: 14, body: 15, bodyLarge: 16, title: 19, verseSm: 21, heading: 24, verse: 27, display: 32 },
} as const;

export const typeface = {
  /** 말씀 인용과 그룹 이름에만. */
  serif: 'Gowun Batang',
  sans: 'IBM Plex Sans KR',
} as const;

export type PaletteName = keyof typeof palette;
