/**
 * LIV Golf Inspired Design System
 * Premium dark sports aesthetic — golf data clarity as top priority
 *
 * Color Palette A — LIV Origin (default, recommended)
 * Deep navy backgrounds, refined gold accent, crisp white text
 *
 * Color Palette B — Practical Stable
 * Lighter dark green surfaces, warmer gold, higher readability
 */

// ─── Palette A: LIV Origin ──────────────────────────────────────────────────
const paletteA = {
  bg:        '#0b0e18',   // page background — near-black navy
  surface1:  '#111827',   // card/panel
  surface2:  '#1a2235',   // secondary surface / table header
  surface3:  '#212a40',   // hover / active fill
  heroSurface: '#0e1c14', // deep green hero panels

  gold:      '#c9a228',   // LIV Gold — primary accent
  goldLight: '#e8c84e',   // bright gold
  goldMuted: '#7a611a',   // muted gold
  goldBg:    'rgba(201,162,40,0.10)',

  green:     '#0e1c14',   // deep green (heritage panels)
  greenMid:  '#1a3028',   // mid green
  greenAccent: '#3db87a', // active / success green
  greenBg:   'rgba(61,184,122,0.10)',

  textPrimary:   '#e8edf8',
  textSecondary: '#8896b0',
  textMuted:     '#4d5a78',
  textInverse:   '#0b0e18',

  border:      '#1b2238',
  borderMid:   '#252f4a',
  borderGold:  '#c9a228',

  scoreBirdie:   '#3db87a',
  scoreEagle:    '#c9a228',
  scoreAlbatross:'#e8c84e',
  scoreHio:      '#f0d070',
  scorePar:      '#8896b0',
  scoreBogey:    '#6b7c9a',
  scoreDouble:   '#ef5350',
  scoreTriple:   '#c62828',

  success: '#3db87a',
  warning: '#c9a228',
  error:   '#ef5350',
  info:    '#5c7cfa',

  scrim:   'rgba(11,14,24,0.88)',
};

// ─── Palette B: Practical Stable ────────────────────────────────────────────
export const paletteB = {
  bg:        '#0f1319',
  surface1:  '#16202e',
  surface2:  '#1f2d3f',
  surface3:  '#283852',
  heroSurface: '#132213',

  gold:      '#d4a520',
  goldLight: '#f0c84a',
  goldMuted: '#806314',
  goldBg:    'rgba(212,165,32,0.10)',

  green:     '#132213',
  greenMid:  '#1e3828',
  greenAccent: '#41c47a',
  greenBg:   'rgba(65,196,122,0.10)',

  textPrimary:   '#dde6f4',
  textSecondary: '#7a8da8',
  textMuted:     '#3f4f6a',
  textInverse:   '#0f1319',

  border:      '#1c2a3c',
  borderMid:   '#263648',
  borderGold:  '#d4a520',

  scoreBirdie:   '#41c47a',
  scoreEagle:    '#d4a520',
  scoreAlbatross:'#f0c84a',
  scoreHio:      '#fce07a',
  scorePar:      '#7a8da8',
  scoreBogey:    '#5a6a88',
  scoreDouble:   '#e85454',
  scoreTriple:   '#c03030',

  success: '#41c47a',
  warning: '#d4a520',
  error:   '#e85454',
  info:    '#4a6cee',

  scrim:   'rgba(15,19,25,0.88)',
};

// ─── Active Palette (switch here to change theme) ───────────────────────────
export const palette = paletteA;

// ─── Typography ─────────────────────────────────────────────────────────────
export const typography = {
  fontBase: "'Noto Sans KR', -apple-system, 'Helvetica Neue', sans-serif",

  // Headline — hero numbers, round totals
  displaySize:  '64px',
  displayWeight:'800',
  displayTracking: '-0.04em',

  // Large heading
  h1Size:   '28px',
  h1Weight: '800',
  h1Tracking: '-0.02em',

  // Section heading
  h2Size:   '20px',
  h2Weight: '700',
  h2Tracking: '-0.01em',

  h3Size:   '17px',
  h3Weight: '700',
  h3Tracking: '-0.01em',

  // Stat value — large data numbers
  statXL:   '38px',
  statLG:   '30px',
  statMD:   '22px',
  statSM:   '18px',
  statWeight: '800',
  statTracking: '-0.03em',

  // Body
  bodyLG: '15px',
  bodyMD: '14px',
  bodySM: '13px',
  bodyXS: '12px',
  bodyWeight: '400',
  bodyStrong: '600',

  // Label — uppercase overlines
  labelLG: '12px',
  labelMD: '11px',
  labelSM: '10px',
  labelXS: '9px',
  labelWeight: '700',
  labelTracking: '0.18em',
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  xs2: '4px',
  xs:  '8px',
  sm:  '12px',
  md:  '16px',
  lg:  '20px',
  xl:  '24px',
  xl2: '32px',
  xl3: '40px',
  xl4: '56px',
  xl5: '80px',

  pagePad:  '16px',
  cardPad:  '18px',
  cardPadLG:'24px',
  sectionGap: '28px',
  rowGap: '8px',
};

// ─── Radii ───────────────────────────────────────────────────────────────────
export const radii = {
  none:  '0',
  xs:    '2px',   // buttons, chips, badges
  sm:    '4px',   // cards, inputs, steppers
  md:    '6px',   // modals, overlays
  lg:    '10px',  // bottom sheets
  full:  '9999px',
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  none: 'none',
  sm:   '0 1px 4px rgba(0,0,0,0.4)',
  md:   '0 4px 16px rgba(0,0,0,0.5)',
  lg:   '0 12px 40px rgba(0,0,0,0.65)',
  gold: '0 0 0 1px rgba(201,162,40,0.35), 0 4px 16px rgba(201,162,40,0.15)',
  tabBar: '0 -2px 16px rgba(0,0,0,0.5)',
};

// ─── Borders ─────────────────────────────────────────────────────────────────
export const borders = {
  thin:   `1px solid ${palette.border}`,
  mid:    `1px solid ${palette.borderMid}`,
  gold:   `1px solid ${palette.gold}`,
  goldThick: `2px solid ${palette.gold}`,
  accent: `1px solid ${palette.borderGold}`,
};

// ─── Score Colors helper ─────────────────────────────────────────────────────
export function getScoreColor(diff) {
  if (diff === null || diff === undefined) return palette.textMuted;
  if (diff <= -3) return palette.scoreAlbatross;
  if (diff === -2) return palette.scoreEagle;
  if (diff === -1) return palette.scoreBirdie;
  if (diff === 0)  return palette.scorePar;
  if (diff === 1)  return palette.scoreBogey;
  if (diff === 2)  return palette.scoreDouble;
  return palette.scoreTriple;
}

// ─── Default export ──────────────────────────────────────────────────────────
const theme = { palette, typography, spacing, radii, shadows, borders };
export default theme;
