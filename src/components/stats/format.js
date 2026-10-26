import { fmtShot, fmtPutt } from '../../engine/units.js';
// 스탯 화면의 숫자 표기와 색 — 컴포넌트 파일에는 컴포넌트만 둔다.

export const COLOR = {
  gold: '#c9a228', goldHi: '#f3d36b', green: '#3db87a', red: '#ef5350',
  amber: '#e6b94a', orange: '#ef8a50', blue: '#4f6290', slate: '#8896b0',
  text: '#e8edf8', muted: '#8896b0', faint: '#8aa0c4', line: '#1b2238', track: '#1a2235',
};

export const fmtPct = (v, digits = 0) => (v == null || Number.isNaN(v) ? '–' : `${v.toFixed(digits)}%`);
export const fmtNum = (v, digits = 1) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(digits));
export const fmtSigned = (v, digits = 1) => {
  if (v == null || Number.isNaN(v)) return '–';
  const s = Math.abs(v).toFixed(digits);
  return `${v > 0 ? '+' : v < 0 && Number(s) !== 0 ? '−' : ''}${s}`;
};
// 거리 글자 — 단위 설정(미터·야드)을 따른다. 샷 거리는 fmtMeters, 퍼트·근접도처럼 짧은 거리는 fmtPuttMeters (야드 모드에서 피트)
export const fmtMeters = (v, digits = 0) => fmtShot(v, { digits });
export const fmtPuttMeters = (v, digits = 1) => fmtPutt(v, { digits });

// 추세 표시에 쓰는 말: 최근 5라운드 값이 이전보다 좋아졌나
export const isBetter = (delta, goodWhen) => (goodWhen === 'down' ? delta < 0 : delta > 0);
