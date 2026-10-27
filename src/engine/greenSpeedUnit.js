// 그린 스피드를 어떤 단위로 보여 줄지 — 미터('m', 기본) 또는 피트('ft', 스팀프). 고른 단위는 이 기기에 기억한다.
// 값 자체는 늘 스팀프 피트로 저장하고(greenSpeed.js), 이 단위는 화면에 보이는 방식만 바꾼다.
// 그린 스피드를 고르는 창과, 값을 글자로 보여 주는 모든 곳(퍼팅 화면 · 인사이트)이 같은 선택을 따른다.

import { isYards } from './units.js';

export const SPEED_UNIT_KEY = 'bb.greenSpeedUnit';

// 처음에는 미터로 보여 준다 (거리 단위 설정이 야드이면 피트).
export function readSpeedUnit() {
  const fallback = isYards() ? 'ft' : 'm';
  try {
    const saved = localStorage.getItem(SPEED_UNIT_KEY);
    return saved === 'm' || saved === 'ft' ? saved : fallback;
  } catch { return fallback; }   // 저장소를 못 읽는 환경(시크릿 모드 등)
}

export function saveSpeedUnit(unit) {
  try { localStorage.setItem(SPEED_UNIT_KEY, unit); } catch { /* 기억만 못 할 뿐 */ }
}
