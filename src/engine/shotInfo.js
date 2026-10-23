// ─── 샷 정보 (지형 · 라이 · 거리 · 클럽) ────────────────────────────────────────────
//
// 상세 입력에서 샷마다 꼭 받는 네 가지 — 실측으로 알 수 있는 정보이고 Strokes Gained 와 클럽 분석에 쓰인다.
//   지형  그 샷을 치는 자리의 표면: 페어웨이 · 러프 · 벙커  (Broadie 기준선의 표면과 같다)
//   라이  경사: 평지 · 오르막 · 내리막 …  (기존 "라이" 입력)
//   거리  그 샷을 치는 자리에서 핀까지 남은 거리 (파3 티샷은 티샷 거리)
//   클럽  그 샷에 쓴 클럽
// 티샷 L/C/R 랜딩 · 그린 랜딩 방향 · 구질 같은 나머지는 선택 입력이다 (비워 두어도 막지 않는다).
//
// 저장 위치:
//   두 번째 샷(세컨샷)  secondClub · remainingDistance · terrainCondition(라이) · secondSurface(지형)
//   세 번째 샷부터       extraShots[i] = { club, remainingDistance, lie(라이), surface(지형), … }
//   파3 티샷             teeClub · teeDistance

import { fieldShotCount } from './geo.js';
import { penaltyAt } from './penalties.js';

export const SURFACES = [
  { id: 'fairway', label: '페어웨이', hint: '프린지 포함' },
  { id: 'rough', label: '러프' },
  { id: 'bunker', label: '벙커' },
];
export const SURFACE_IDS = SURFACES.map((s) => s.id);

// 한때 있던 '리커버리'(나무 뒤 등)는 지형이 아니라 상황이라 없앴다 — 그렇게 저장된 기록은 러프로 읽는다
const LEGACY_SURFACE = { recovery: 'rough' };
export const surfaceIdOf = (id) => (id == null ? null : LEGACY_SURFACE[id] ?? id);

export const surfaceLabel = (id) => SURFACES.find((s) => s.id === surfaceIdOf(id))?.label ?? null;

// 앱의 표면 값 → Strokes Gained 기준선(data/baseline.js)의 표면 이름
const BASELINE_LIE = { fairway: 'fairway', rough: 'rough', bunker: 'sand' };
export const baselineLieOf = (surface) => BASELINE_LIE[surfaceIdOf(surface)] ?? null;

// 라이는 문자열 또는 [문자열] (예전 기록)로 들어온다
export const lieValueOf = (lie) => (Array.isArray(lie) ? lie[0] || null : lie || null);

// 이 순서로 묻고 보여 준다 (사용자가 정한 순서)
export const SHOT_INFO_ITEMS = ['라이', '지형', '거리', '클럽'];

// slot 번째 샷(1 = 세컨샷, 2 이상 = 추가 샷)의 정보
export function shotInfoOf(score, slot) {
  if (!score || slot < 1) return null;
  if (slot === 1) {
    return { club: score.secondClub ?? null, distance: score.remainingDistance ?? null, lie: lieValueOf(score.terrainCondition), surface: surfaceIdOf(score.secondSurface) };
  }
  const x = (score.extraShots || [])[slot - 2];
  if (!x) return null;
  return { club: x.club ?? null, distance: x.remainingDistance ?? null, lie: lieValueOf(x.lie), surface: surfaceIdOf(x.surface) };
}

// slot 번째 샷을 치는 자리의 표면 (기록이 없으면 null)
export const surfaceOfShot = (score, slot) => shotInfoOf(score, slot)?.surface ?? null;

// 직전 샷의 벌타가 "같은 자리에서 다시 치기"이면 이 샷은 앞 샷과 같은 자리에서 친다 — 지형·라이·거리를 따로 받지 않는다
const isReplayShot = (score, slot) => penaltyAt(score, slot - 1)?.mode === 'replay';

// 빠진 샷 정보. 반환: [{ slot, missing: ['라이','지형','거리','클럽'] 중 빠진 것 }] (샷 순서대로, 없으면 [])
// 티샷 클럽을 고른 상세 입력 홀에만 묻는다 (스코어만 적는 간편 입력 홀은 대상이 아니다).
export function shotInfoGaps(score, par) {
  if (!score || !score.teeClub) return [];
  const gaps = [];
  if (par === 3 && score.teeDistance == null && !penaltyAt(score, 0)) gaps.push({ slot: 0, missing: ['거리'] });

  const fieldShots = Math.max(0, fieldShotCount(score, par) - 1);   // 티샷을 뺀 필드샷 수
  for (let slot = 1; slot <= fieldShots; slot++) {
    const info = shotInfoOf(score, slot);
    if (!info) continue;
    const replay = isReplayShot(score, slot);
    const missing = [];
    if (!replay && !info.lie) missing.push('라이');
    if (!replay && !info.surface) missing.push('지형');
    if (!replay && info.distance == null) missing.push('거리');
    if (!info.club) missing.push('클럽');
    if (missing.length) gaps.push({ slot, missing });
  }
  return gaps;
}

// 세컨샷 지형으로 티샷의 페어웨이 적중을 알 수 있다: 페어웨이에서 쳤으면 적중, 러프·벙커면 놓침.
// 티샷에서 벌타가 났거나 1온이면 알 수 없다 (null).
export function fairwayFromSurface(score, par) {
  if (par <= 3 || !score || score.teeGIR === true || penaltyAt(score, 0)) return null;
  const surface = surfaceIdOf(score.secondSurface);
  if (!surface) return null;
  return surface === 'fairway';
}
