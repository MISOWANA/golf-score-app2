// ─── 핸디캡 (간이 WHS) ───────────────────────────────────────────────────────────
//
// 일반적인 핸디캡 계산(월드 핸디캡 시스템)을 따르되, 코스 레이팅·슬로프를 모르므로 두 가지를 단순화한다.
//   · 코스 레이팅 = 파. 스크래치 골퍼의 평균 스코어를 파로 본다 (실제 코스 레이팅은 코스마다 파보다 조금 높거나 낮다).
//   · 슬로프 = 표준 113. 그래서 차이값 = 조정 총타수 − 파.
//
// 계산:
//   1. 홀 점수는 '넷 더블보기'까지만 센다 (WHS 3.1). 핸디캡이 아직 없으면 파+5까지.
//      홀별 핸디캡 순위를 몰라서, 홀마다 받는 타수는 코스 핸디캡 ÷ 18 을 반올림한 평균값으로 둔다.
//      그 라운드 이전까지의 핸디캡으로 계산한다 (라운드를 날짜순으로 따라가며 쌓는다).
//   2. 차이값 = 조정 총타수 − 파 (소수 첫째 자리).
//   3. 핸디캡 = 최근 20개 차이값 중 낮은 N개의 평균 (+ 라운드가 적을 때의 보정). N은 라운드 수에 따라 WHS 표를 따른다.
//   4. 최대 54.0, 소수 첫째 자리 반올림. 3라운드 미만이면 아직 계산하지 않는다.
//
// 18홀 라운드만 센다 (9홀 라운드는 제외). 동반자와 함께 친 라운드도 내 점수로 센다 — 핸디캡은 점수만으로 계산되고,
// 샷 단위 분석(통계·인사이트)이 1인 라운드만 쓰는 것과는 이유가 다르다.

import { isFullRound } from './nines.js';
import { totalPar, myPlayer } from './players.js';

export const HANDICAP_MIN_ROUNDS = 3;
export const HANDICAP_WINDOW = 20;
export const HANDICAP_MAX = 54;
const NO_INDEX_CAP = 5;   // 핸디캡이 아직 없을 때 한 홀 최대 = 파 + 5

// 기록된 차이값 개수 → [쓰는 낮은 차이값 개수, 보정] (WHS 표 5.2a)
const TABLE = {
  3: [1, -2.0], 4: [1, -1.0], 5: [1, 0], 6: [2, -1.0], 7: [2, 0], 8: [2, 0],
  9: [3, 0], 10: [3, 0], 11: [3, 0], 12: [4, 0], 13: [4, 0], 14: [4, 0],
  15: [5, 0], 16: [5, 0], 17: [6, 0], 18: [6, 0], 19: [7, 0], 20: [8, 0],
};

const round1 = (n) => Math.round(n * 10) / 10;

// 차이값 목록(날짜순)으로 핸디캡 계산. 3개 미만이면 null.
export function handicapFromDifferentials(diffs) {
  const recent = diffs.slice(-HANDICAP_WINDOW);
  const spec = TABLE[recent.length];
  if (!spec) return null;
  const [use, adjust] = spec;
  const lowest = [...recent].sort((a, b) => a - b).slice(0, use);
  const avg = lowest.reduce((s, d) => s + d, 0) / use;
  return Math.min(HANDICAP_MAX, round1(avg + adjust));
}

// 한 홀의 조정 점수 — 넷 더블보기(파 + 2 + 받는 타수)까지만 센다. courseHandicap null = 핸디캡 없음.
export function adjustedHoleScore(strokes, par, courseHandicap) {
  const received = courseHandicap == null ? null : Math.round(Math.max(0, courseHandicap) / 18);
  const cap = received == null ? par + NO_INDEX_CAP : par + 2 + received;
  return Math.min(strokes, cap);
}

const byDate = (a, b) => new Date(a.date) - new Date(b.date) || String(a.id).localeCompare(String(b.id));

// 라운드 한 개의 합계 — 핸디캡에 쓰는 조정 총타수
function adjustedGross(round, player, courseHandicap) {
  return round.holes.reduce((sum, h) => {
    const raw = h.scores?.[player]?.strokes;
    const strokes = Number.isFinite(raw) && raw > 0 ? raw : h.par;
    return sum + adjustedHoleScore(strokes, h.par, courseHandicap);
  }, 0);
}

// rounds: 모든 라운드(순서 무관). userName: 동반자 라운드에서 "나"를 찾는 이름. 반환
//   index       핸디캡 (3라운드 미만이면 null)
//   delta       직전 라운드를 넣기 전과의 차이 (비교할 값이 없으면 null)
//   entries     날짜순 { id, date, courseName, gross, adjusted, differential, counted } — counted = 핸디캡에 들어간 차이값
//   count       계산에 쓸 수 있는 라운드 수 / used 핸디캡에 들어간 차이값 수
export function buildHandicap(rounds, userName) {
  const eligible = (rounds || []).filter((r) => r.players?.length >= 1 && isFullRound(r)).sort(byDate);
  const diffs = [];
  const entries = [];
  const indexAfter = [];
  eligible.forEach((r) => {
    const before = handicapFromDifferentials(diffs);
    const ch = before == null ? null : Math.round(before);
    const player = myPlayer(r, userName);
    const gross = r.holes.reduce((s, h) => s + (h.scores?.[player]?.strokes || h.par), 0);
    const adjusted = adjustedGross(r, player, ch);
    const differential = round1(adjusted - totalPar(r));
    diffs.push(differential);
    indexAfter.push(handicapFromDifferentials(diffs));
    entries.push({ id: r.id, date: r.date, courseName: r.courseName, gross, adjusted, differential, counted: false });
  });

  const index = indexAfter.length ? indexAfter[indexAfter.length - 1] : null;
  const prev = indexAfter.length > 1 ? indexAfter[indexAfter.length - 2] : null;
  const delta = index != null && prev != null ? round1(index - prev) : null;

  // 핸디캡에 들어간 차이값 표시 (최근 20개 중 낮은 N개)
  const recent = entries.slice(-HANDICAP_WINDOW);
  const spec = TABLE[recent.length];
  if (spec) {
    [...recent].sort((a, b) => a.differential - b.differential).slice(0, spec[0]).forEach((e) => { e.counted = true; });
  }
  return { index, delta, entries, count: entries.length, used: spec ? spec[0] : 0, adjust: spec ? spec[1] : 0 };
}

// 화면 표시 — 0 이상은 숫자, 마이너스(스크래치보다 잘 치는 경우)는 관례대로 "+1.2"
export function formatHandicap(index) {
  if (index == null) return '—';
  return index < 0 ? `+${Math.abs(index).toFixed(1)}` : index.toFixed(1);
}
