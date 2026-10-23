// ─── 라운드 요약 카드 ─────────────────────────────────────────────────────────────
//
// 라운드를 끝낸 직후 Round Report 맨 위에 올리는 한눈 요약:
//   한 줄 총평 · 잃은 타수(영역별) · 잘한 점 3 · 아쉬운 점 3 · 다음 포커스 1 · 내 최근 평균과의 비교.
// 숫자는 인사이트(buildInsightReport · buildRoundReplay)와 리포트(summarizeRound)가 쓰는 계산을 그대로 쓴다 —
// 카드와 인사이트 탭, 리포트의 숫자가 어긋나지 않게.
//
// 비교는 이 라운드보다 먼저 친 1인 18홀 라운드 최대 5개의 평균과 한다 (3개 이상 쌓였을 때).
// 9홀 라운드와 동반자 라운드는 비교 대상에서 빠진다 (통계와 같은 기준).

import { buildRoundReplay, buildInsightReport } from './insightIndex.js';
import { summarizeRound } from './roundSummary.js';
import { penaltyCount } from './penalties.js';
import { isFullRound, isNineHoleRound } from './nines.js';

export const COMPARE_WINDOW = 5;
export const COMPARE_MIN = 3;
const SHOW = 3;

// 비교에 쓰는 지표. better = 어느 쪽이 좋은가. flat = 이 폭 안이면 '비슷함'.
export const COMPARE_METRICS = [
  { id: 'score', label: '스코어', unit: '타', better: 'down', flat: 1, digits: 1 },
  { id: 'gir', label: 'GIR', unit: '%', better: 'up', flat: 3, digits: 0 },
  { id: 'fairway', label: '페어웨이', unit: '%', better: 'up', flat: 3, digits: 0 },
  { id: 'putts', label: '퍼트', unit: '개', better: 'down', flat: 1, digits: 1 },
  { id: 'penalty', label: '벌타', unit: '개', better: 'down', flat: 0.5, digits: 1 },
];

// 라운드 하나의 비교 지표 값 (없으면 null)
export function compareValues(round) {
  const player = round.players[0];
  const s = summarizeRound(round, player);
  const penalties = round.holes.reduce((a, h) => a + penaltyCount(h.scores?.[player] ?? {}), 0);
  return {
    score: s.total,
    gir: s.playedCount > 0 ? Number(s.girPct) : null,
    fairway: s.fairwayPct != null ? Number(s.fairwayPct) : null,
    putts: s.playedCount > 0 ? Math.round((s.totalPutts / s.playedCount) * round.holes.length) : null,   // 18홀 환산
    penalty: penalties,
  };
}

const roundTo = (n, digits) => { const m = 10 ** digits; return Math.round(n * m) / m; };

function buildCompare(round, history) {
  if (!isFullRound(round)) return null;
  const prior = (history || [])
    .filter((r) => r.id !== round.id && r.players?.length === 1 && isFullRound(r) && new Date(r.date) < new Date(round.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, COMPARE_WINDOW);
  if (prior.length < COMPARE_MIN) return null;

  const mine = compareValues(round);
  const priorValues = prior.map(compareValues);
  const rows = [];
  COMPARE_METRICS.forEach((m) => {
    if (mine[m.id] == null) return;
    const others = priorValues.map((v) => v[m.id]).filter((v) => v != null);
    if (others.length < COMPARE_MIN) return;
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    const delta = roundTo(mine[m.id] - avg, m.digits);
    const tone = Math.abs(delta) <= m.flat ? 'flat' : (m.better === 'down' ? delta < 0 : delta > 0) ? 'good' : 'bad';
    rows.push({ id: m.id, label: m.label, unit: m.unit, value: mine[m.id], avg: roundTo(avg, m.digits), delta, tone });
  });
  return rows.length ? { basis: prior.length, rows } : null;
}

const asPoint = (i) => ({ id: i.id, title: i.title, detail: i.summary, hole: i.holeNumber ?? null, severity: i.severity });

// round: 1인 라운드. history: 비교에 쓸 라운드들(보통 통계에 들어가는 라운드). 동반자 라운드면 { eligible: false }.
export function buildRoundCard(round, history = []) {
  if (!round || round.players?.length !== 1) return { eligible: false };
  const replay = buildRoundReplay(round);
  const report = buildInsightReport([round], 'round');
  const focusItem = (report?.focus ?? []).find((f) => f.category !== 'data');
  return {
    eligible: true,
    roundId: round.id,
    courseName: round.courseName,
    date: round.date,
    isNine: isNineHoleRound(round),
    score: replay.score, par: replay.par, diff: replay.diff,
    front: replay.hasFront ? replay.front : null, back: replay.hasBack ? replay.back : null,
    headline: replay.headline,
    entered: replay.enteredHoles, totalHoles: replay.holes.length,
    loss: replay.breakdown.ranked.slice(0, SHOW).map((r) => ({ label: r.label, strokes: r.strokes })),
    strengths: (report?.strengths ?? []).slice(0, SHOW).map(asPoint),
    issues: (report?.issues ?? []).slice(0, SHOW).map(asPoint),
    focus: focusItem?.text ?? null,
    focusCategory: focusItem?.category ?? null,   // putting · penalty · tee · approach · shortGame — 목표 제안에 쓴다
    compare: buildCompare(round, history),
  };
}
