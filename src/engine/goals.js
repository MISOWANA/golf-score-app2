// ─── 다음 라운드 목표 ─────────────────────────────────────────────────────────────
//
// 인사이트가 짚어 준 약점을 "다음 라운드에 이걸 하겠다"는 목표로 저장하고, 라운드가 끝날 때마다 달성했는지 판정한다.
//   · 목표는 최대 2개, 하나는 지표 하나와 목표값 하나 (예: 3퍼트 2회 이하).
//   · 판정은 통계와 같은 기준의 라운드(1인 18홀)에서만 한다. 9홀·동반자 라운드는 판정하지 않는다.
//   · 목표를 세운 날 이후에 친 라운드부터 판정한다.
//   · 지표 값은 리포트 · 요약 카드와 같은 계산을 쓴다 (summarizeRound · compareValues) — 화면마다 숫자가 같도록.

import { summarizeRound } from './roundSummary.js';
import { compareValues } from './roundCard.js';
import { isFullRound } from './nines.js';

export const MAX_GOALS = 2;
export const PROGRESS_WINDOW = 5;     // 최근 몇 라운드의 달성 여부를 보여 줄지

// better: 'down' = 낮을수록 좋다("이하"), 'up' = 높을수록 좋다("이상"). fallback: 기록이 없을 때 처음 보여 주는 목표값.
export const GOAL_METRICS = [
  { id: 'threePutts', label: '3퍼트', unit: '회', better: 'down', step: 1, min: 0, max: 9, fallback: 2 },
  { id: 'penalties', label: '벌타', unit: '개', better: 'down', step: 1, min: 0, max: 9, fallback: 1 },
  { id: 'doubles', label: '더블보기 이상', unit: '개', better: 'down', step: 1, min: 0, max: 9, fallback: 2 },
  { id: 'score', label: '스코어', unit: '타', better: 'down', step: 1, min: 60, max: 140, fallback: 90 },
  { id: 'putts', label: '퍼트 수', unit: '개', better: 'down', step: 1, min: 20, max: 50, fallback: 34 },
  { id: 'gir', label: 'GIR', unit: '%', better: 'up', step: 5, min: 0, max: 100, fallback: 40 },
  { id: 'fairway', label: '페어웨이', unit: '%', better: 'up', step: 5, min: 0, max: 100, fallback: 50 },
  { id: 'birdies', label: '버디 이상', unit: '개', better: 'up', step: 1, min: 0, max: 9, fallback: 1 },
];
export const metricOf = (id) => GOAL_METRICS.find((m) => m.id === id) ?? null;

// 인사이트 "다음 라운드 포커스"의 영역 → 목표로 삼기 좋은 지표
export const FOCUS_METRIC = { putting: 'threePutts', penalty: 'penalties', tee: 'fairway', approach: 'gir', shortGame: 'score' };

export function goalText(goal) {
  const m = metricOf(goal.metric);
  return m ? `${m.label} ${goal.target}${m.unit} ${m.better === 'down' ? '이하' : '이상'}` : '';
}

// 목표를 판정할 수 있는 라운드 (1인 · 18홀)
export const isGoalEligible = (round) => !!round && round.players?.length === 1 && isFullRound(round);

// 한 라운드의 지표 값. 판정 대상이 아니거나 값을 알 수 없으면 null. 진행 중인 라운드면 "지금까지" 값이다.
export function goalValue(round, metricId) {
  if (!isGoalEligible(round)) return null;
  const player = round.players[0];
  const s = summarizeRound(round, player);
  switch (metricId) {
    case 'threePutts': return round.holes.filter((h) => h.scores?.[player]?.touched !== false && (h.scores?.[player]?.putts ?? 0) >= 3).length;
    case 'doubles': return s.doubles;
    case 'birdies': return s.birdies + s.eagles;
    case 'penalties': return compareValues(round).penalty;
    case 'score': return s.playedCount === 0 ? null : s.total;
    case 'putts': return compareValues(round).putts;
    case 'gir': return compareValues(round).gir;
    case 'fairway': return compareValues(round).fairway;
    default: return null;
  }
}

const dayKey = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 목표를 세운 날 이후(당일 포함)에 친 라운드인가
export const isAfterGoal = (goal, round) => {
  const a = dayKey(round.date), b = dayKey(goal.createdAt);
  return a !== '' && b !== '' && a >= b;
};

// { value, met } | null — 이 라운드로 이 목표를 판정할 수 없으면 null
export function evaluateGoal(goal, round) {
  const m = metricOf(goal.metric);
  if (!m || !isGoalEligible(round) || !isAfterGoal(goal, round)) return null;
  const value = goalValue(round, goal.metric);
  if (value == null) return null;
  return { value, met: m.better === 'down' ? value <= goal.target : value >= goal.target };
}

// 목표를 세운 뒤 끝낸 라운드들의 판정 — 최근 것이 앞. { results: [{ id, date, value, met }], met: 달성 수, total }
export function goalProgress(goal, rounds, limit = PROGRESS_WINDOW) {
  const results = (rounds || [])
    .filter((r) => r.completed !== false)
    .map((r) => ({ round: r, ev: evaluateGoal(goal, r) }))
    .filter((x) => x.ev)
    .sort((a, b) => new Date(b.round.date) - new Date(a.round.date))
    .slice(0, limit)
    .map((x) => ({ id: x.round.id, date: x.round.date, value: x.ev.value, met: x.ev.met }));
  return { results, met: results.filter((r) => r.met).length, total: results.length };
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// 최근 라운드(최대 5개)의 지표 평균과 몇 라운드로 낸 값인지. 기록이 없으면 null.
export function recentAverage(metricId, rounds) {
  const values = (rounds || [])
    .filter((r) => isGoalEligible(r))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, PROGRESS_WINDOW)
    .map((r) => goalValue(r, metricId))
    .filter((v) => v != null);
  return values.length === 0 ? null : { avg: values.reduce((a, b) => a + b, 0) / values.length, n: values.length };
}

// 목표값 제안 — 최근 라운드(최대 5개) 평균보다 조금 나은 값. 기록이 없으면 기본값.
export function suggestTarget(metricId, rounds) {
  const m = metricOf(metricId);
  if (!m) return null;
  const recent = recentAverage(metricId, rounds);
  if (!recent) return m.fallback;
  const avg = recent.avg;
  let t;
  if (m.id === 'score' || m.id === 'putts') t = Math.round(avg) - 2;
  else if (m.id === 'birdies') t = Math.round(avg) + 1;
  else if (m.better === 'down') t = Math.round(avg) - 1;               // 3퍼트 · 벌타 · 더블보기: 평균보다 하나 적게
  else t = Math.round((avg + 8) / 5) * 5;                               // GIR · 페어웨이 %: 평균보다 8%p 쯤 높게, 5% 단위
  return clamp(t, m.min, m.max);
}

// 새 목표. id 는 만든 시각에서 — 같은 시각에 둘을 만들 일은 없다 (최대 2개를 차례로 만든다)
export function newGoal({ metric, target }, now = new Date()) {
  return { id: `g${now.getTime()}`, metric, target, createdAt: now.toISOString() };
}

// 저장된 값 검사 — 알 수 없는 지표 · 숫자가 아닌 목표값은 버리고 최대 2개만 남긴다
export function sanitizeGoals(list) {
  return (Array.isArray(list) ? list : [])
    .filter((g) => g && typeof g.id === 'string' && metricOf(g.metric) && Number.isFinite(g.target) && g.createdAt)
    .map((g) => { const m = metricOf(g.metric); return { id: g.id, metric: g.metric, target: clamp(Math.round(g.target), m.min, m.max), createdAt: g.createdAt }; })
    .slice(0, MAX_GOALS);
}
