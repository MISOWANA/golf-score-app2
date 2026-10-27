// ─── 숏게임 탄착 — 80m 안 샷이 핀 기준 어디에 멈췄나 ─────────────────────────────────
//
// 80m 안에서 친 샷(칩·피치)이 그린에 올라간 홀은 두 기록을 합치면 핀 기준 위치가 나온다.
//   · 온그린 랜딩 방향(onGreenLanding, 1~12시): 핀을 가운데 두고 공이 멈춘 쪽 — 12시=롱(핀 너머) · 6시=숏 · 3시=라이트 · 9시=레프트
//   · 첫 퍼트 거리(puttDetails[0].distance): 공에서 핀까지의 거리
// → 샷 하나가 핀 기준의 점 하나다.  x = 거리 × sin(각)  (+ 오른쪽) · y = 거리 × cos(각)  (+ 핀 너머)
//
// 쏠림(평균 위치)과 흩어짐(표준편차)을 앞뒤(롱·숏)와 좌우로 나눠서 본다 — 같은 "숏이 많다"여도
// 쏠림이면 거리를 한 번에 고칠 수 있고, 흩어짐이면 컨택·거리감을 다듬어야 한다. 어느 쪽이 맞는 모습인지는 판정하지 않는다.
//
// 표본은 어프로치 거리 구간·'80m 안' 근접도와 같은 기준(extractClubShots 체인의 마지막 샷, 최근 20라운드)이라 같은 샷을 센다.
// 거리는 모두 미터로 돌려준다 — 화면이 단위(미터·야드/피트)에 맞게 바꾼다.

import { extractClubShots, SHORT_SHOT_MAX_M } from './clubDistance.js';
import { landingHour, quadrantOf, QUADRANTS } from './landing.js';
import { clubLabelOf } from './clubRecommend.js';
import { median, distanceTier } from './stats.js';

export const PATTERN_WINDOW = 20;           // 최근 20라운드 (클럽 거리·어프로치와 같다)
export const MIN_PATTERN_SHOTS = 5;         // 과녁과 평균 위치를 말하려면 필요한 샷 수
export const MIN_ROW_SHOTS = 3;             // 거리대·클럽 한 줄을 보여 주는 최소 샷 수

// 거리대 — 칩부터 피치까지. 마지막 경계는 숏게임 경계(80m)와 같다.
export const SHORT_BANDS = [
  { id: 'lt20', min: 0, max: 20 },
  { id: '20to50', min: 20, max: 50 },
  { id: '50to80', min: 50, max: SHORT_SHOT_MAX_M },
];

// sin(180°) 같은 값이 1e-16 로 남아 '쏠림 0' 이 '아주 작은 쏠림'으로 읽히지 않게 정리한다
const tidy = (v) => Math.round(v * 1e9) / 1e9 + 0;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => (a.length ? sum(a) / a.length : null);
// 표본 표준편차 — 샷이 둘 미만이면 흩어짐을 말할 수 없다
const std = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(sum(a.map((v) => (v - m) ** 2)) / (a.length - 1));
};

// 80m 안 샷이 그린에 올라간 홀 → 샷 목록과, 기록이 어디까지 모였는지(coverage)
export function shortGameShots(rounds, windowSize = PATTERN_WINDOW) {
  const shots = [];
  const coverage = { onGreen: 0, withLanding: 0, withPutt: 0, both: 0 };
  rounds.slice(0, windowSize).forEach((r) => {
    const p = r.players[0];
    r.holes.forEach((h) => {
      const s = h.scores?.[p];
      if (!s) return;
      const chain = extractClubShots(h, p);
      const last = chain[chain.length - 1];
      if (!last || last.onGreen !== true || last.fromDistance == null || last.fromDistance >= SHORT_SHOT_MAX_M) return;
      // 칩인은 핀 기준 위치가 없다 (퍼트 없이 들어갔다) — 올린 샷으로도 세지 않는다
      const holed = s.putts === 0 || s.onGreen === 'chip-in' || (s.extraShots ?? []).some((e) => e?.onGreen === 'chip-in');
      if (holed) return;
      const dist = s.puttDetails?.[0]?.distance;
      const hasPutt = dist != null && dist > 0;
      const hour = landingHour(s.onGreenLanding);
      // 어느 기록이 빠졌는지 알려 줄 수 있게, 올린 샷 중 몇 개가 방향·첫 퍼트를 갖췄는지 센다
      coverage.onGreen++;
      if (hour != null) coverage.withLanding++;
      if (hasPutt) coverage.withPutt++;
      if (hour != null && hasPutt) coverage.both++;
      if (hour == null || !hasPutt) return;
      const a = ((hour % 12) * 30 * Math.PI) / 180;
      shots.push({
        hour, dist, from: last.fromDistance, club: last.club, subClub: last.subClub ?? null,
        key: last.subClub ? `${last.club}:${last.subClub}` : last.club,
        label: clubLabelOf(last.club, last.subClub),
        quadrant: quadrantOf(hour),
        x: tidy(dist * Math.sin(a)), y: tidy(dist * Math.cos(a)),
      });
    });
  });
  return { shots, coverage };
}

// 샷 묶음의 요약 — 방향별 횟수, 평균 위치(쏠림), 흩어짐, 핀까지 거리 중앙값
export function summarizePattern(list) {
  const n = list.length;
  const q = Object.fromEntries(QUADRANTS.map((k) => [k, 0]));
  list.forEach((s) => { q[s.quadrant]++; });
  // 가장 많이 멈춘 쪽 — 같은 횟수로 갈리면 말하지 않는다
  const ranked = QUADRANTS.map((k) => [k, q[k]]).sort((a, b) => b[1] - a[1]);
  const top = n > 0 && ranked[0][1] > 0 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : null;
  const dists = list.map((s) => s.dist);
  const xs = list.map((s) => s.x), ys = list.map((s) => s.y);
  const m = n ? { x: mean(xs), y: mean(ys) } : null;      // x: + 오른쪽 · y: + 핀 너머(롱)
  const sd = n >= 3 ? { x: std(xs), y: std(ys) } : null;  // 좌우 · 앞뒤 흩어짐 (m)
  return {
    n, q, top,
    medianDist: median(dists),
    tier: distanceTier(dists),
    mean: m,
    spread: sd,
    // 쏠림이 우연이라고 보기 어려운가 (평균이 평균의 오차 범위 95% 밖) — 샷이 적으면 말하지 않는다(null).
    // 평균 위치가 핀에서 떨어져 보여도 흩어짐이 크고 샷이 적으면 표본 오차일 수 있다.
    clear: n >= MIN_PATTERN_SHOTS && sd ? { x: isClear(m.x, sd.x, n), y: isClear(m.y, sd.y, n) } : null,
  };
}

const isClear = (m, s, n) => (s > 0 ? Math.abs(m) > (1.96 * s) / Math.sqrt(n) : Math.abs(m) > 0);

const bandOf = (from) => SHORT_BANDS.find((b) => from >= b.min && from < b.max);

// 과녁의 눈금 — 가장 먼 샷까지 담는 동심원. 이상치 한 개가 눈금을 늘려 나머지를 뭉개지 않게 상한을 둔다.
export const RING_CAP_M = 15;
export function ringScale(maxDist) {
  const capped = Math.min(Math.max(maxDist ?? 0, 0.5), RING_CAP_M);
  const step = [0.5, 1, 2, 5].find((s) => capped / s <= 5) ?? 5;
  const max = Math.max(step, Math.ceil(capped / step - 1e-9) * step);
  return { step, max, rings: Array.from({ length: Math.round(max / step) }, (_, i) => (i + 1) * step) };
}

export function buildShortGamePattern(rounds, windowSize = PATTERN_WINDOW) {
  const { shots, coverage } = shortGameShots(rounds, windowSize);
  const all = summarizePattern(shots);

  const group = (keyOf) => {
    const map = new Map();
    shots.forEach((s) => { const k = keyOf(s); if (k != null) map.set(k, [...(map.get(k) ?? []), s]); });
    return map;
  };
  const byBand = SHORT_BANDS.map((b) => ({ ...b, ...summarizePattern(shots.filter((s) => bandOf(s.from)?.id === b.id)) }))
    .filter((b) => b.n >= MIN_ROW_SHOTS);
  const byClub = [...group((s) => s.key)].map(([key, list]) => ({ key, label: list[0].label, ...summarizePattern(list) }))
    .filter((c) => c.n >= MIN_ROW_SHOTS)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));

  return {
    ...all,
    enough: all.n >= MIN_PATTERN_SHOTS,
    shots,
    coverage,
    scale: ringScale(shots.length ? Math.max(...shots.map((s) => s.dist)) : 0),
    byBand, byClub,
  };
}
