import { describe, it, expect } from 'vitest';
import {
  GOAL_METRICS, metricOf, goalText, goalValue, evaluateGoal, goalProgress, suggestTarget, newGoal, sanitizeGoals, isAfterGoal,
  MAX_GOALS, FOCUS_METRIC, isGoalEligible,
} from './goals.js';
import { summarizeRound } from './roundSummary.js';
import { compareValues } from './roundCard.js';
import { makeFullRound, makeNineRound, makeMultiRound, played } from '../test/fixtures.js';

const ME = '테스터';

// i번째 라운드(2026-01-i) — 모든 홀 파, 퍼트 2, GIR 성공. patch(h, idx) 로 홀마다 덮어쓴다.
const mk = (i, patch = () => ({})) => {
  const r = makeFullRound(i, ME, { id: `g${String(i).padStart(2, '0')}`, date: new Date(2026, 0, i, 12).toISOString() });
  r.holes.forEach((h, idx) => { h.scores[ME] = played(h.par, { strokes: h.par, putts: 2, gir: true, ...patch(h, idx) }); });
  return r;
};
const goal = (metric, target, day = 1) => ({ id: `goal-${metric}`, metric, target, createdAt: new Date(2026, 0, day, 9).toISOString() });

describe('지표 목록', () => {
  it('8개 지표 — 낮을수록 좋은 것과 높을수록 좋은 것', () => {
    expect(GOAL_METRICS.map((m) => m.id)).toEqual(['threePutts', 'penalties', 'doubles', 'score', 'putts', 'gir', 'fairway', 'birdies']);
    expect(metricOf('gir').better).toBe('up');
    expect(metricOf('threePutts').better).toBe('down');
    expect(metricOf('nope')).toBeNull();
  });

  it('목표 문장: 낮을수록 좋으면 "이하", 높을수록 좋으면 "이상"', () => {
    expect(goalText({ metric: 'threePutts', target: 2 })).toBe('3퍼트 2회 이하');
    expect(goalText({ metric: 'gir', target: 45 })).toBe('GIR 45% 이상');
    expect(goalText({ metric: 'score', target: 88 })).toBe('스코어 88타 이하');
    expect(goalText({ metric: 'x', target: 1 })).toBe('');
  });

  it('인사이트의 포커스 영역마다 목표 지표가 있다', () => {
    expect(FOCUS_METRIC).toMatchObject({ putting: 'threePutts', penalty: 'penalties', tee: 'fairway', approach: 'gir' });
    Object.values(FOCUS_METRIC).forEach((id) => expect(metricOf(id)).toBeTruthy());
  });
});

describe('goalValue — 한 라운드의 지표 값', () => {
  const r = mk(1, (h, i) => (i < 3 ? { putts: 3, strokes: h.par + 1 } : i === 3 ? { ob: 1, strokes: h.par + 3 } : i === 4 ? { strokes: h.par - 1 } : {}));

  it('3퍼트 · 더블보기 이상 · 버디 이상 · 벌타', () => {
    expect(goalValue(r, 'threePutts')).toBe(3);
    expect(goalValue(r, 'doubles')).toBe(1);
    expect(goalValue(r, 'birdies')).toBe(1);
    expect(goalValue(r, 'penalties')).toBe(1);
  });

  it('스코어 · 퍼트 · GIR 은 리포트·요약 카드와 같은 계산이다 (화면 간 일치)', () => {
    const s = summarizeRound(r, ME);
    const c = compareValues(r);
    expect(goalValue(r, 'score')).toBe(s.total);
    expect(goalValue(r, 'putts')).toBe(c.putts);
    expect(goalValue(r, 'gir')).toBe(Number(s.girPct));
  });

  it('입력하지 않은 홀은 3퍼트로 세지 않는다', () => {
    const q = mk(2);
    q.holes[0].scores[ME] = { ...q.holes[0].scores[ME], touched: false, putts: 4 };
    expect(goalValue(q, 'threePutts')).toBe(0);
  });

  it('9홀 · 동반자 라운드와 알 수 없는 지표는 null', () => {
    expect(goalValue(makeNineRound(1, 'out'), 'threePutts')).toBeNull();
    expect(goalValue(makeMultiRound(1), 'score')).toBeNull();
    expect(goalValue(r, 'nope')).toBeNull();
    expect(isGoalEligible(makeNineRound(1))).toBe(false);
    expect(isGoalEligible(r)).toBe(true);
  });
});

describe('evaluateGoal — 달성 판정', () => {
  const r = mk(5, (h, i) => (i < 2 ? { putts: 3, strokes: h.par + 1 } : {}));         // 3퍼트 2번, GIR 100%

  it('낮을수록 좋은 지표는 목표값 이하면 달성', () => {
    expect(evaluateGoal(goal('threePutts', 2), r)).toEqual({ value: 2, met: true });
    expect(evaluateGoal(goal('threePutts', 1), r)).toEqual({ value: 2, met: false });
  });

  it('높을수록 좋은 지표는 목표값 이상이면 달성', () => {
    expect(evaluateGoal(goal('gir', 100), r).met).toBe(true);
    expect(evaluateGoal(goal('gir', 105), r)).toMatchObject({ met: false });
  });

  it('목표를 세우기 전에 친 라운드는 판정하지 않고, 세운 날 친 라운드는 판정한다', () => {
    expect(evaluateGoal(goal('threePutts', 2, 6), r)).toBeNull();                      // 6일에 세운 목표, 5일 라운드
    expect(evaluateGoal(goal('threePutts', 2, 5), r)).not.toBeNull();                  // 같은 날
    expect(isAfterGoal(goal('score', 90, 4), r)).toBe(true);
  });

  it('판정할 수 없는 라운드(9홀 · 동반자)는 null', () => {
    expect(evaluateGoal(goal('threePutts', 2), makeNineRound(2, 'in'))).toBeNull();
    expect(evaluateGoal(goal('threePutts', 2), makeMultiRound(2))).toBeNull();
    expect(evaluateGoal({ metric: 'nope', target: 1, createdAt: goal('score', 1).createdAt }, r)).toBeNull();
  });
});

describe('goalProgress — 최근 라운드의 달성 흐름', () => {
  // 5~9일 라운드: 3퍼트 0 · 3 · 0 · 1 · 3 번
  const rounds = [[5, 0], [6, 3], [7, 0], [8, 1], [9, 3]].map(([day, n]) => mk(day, (h, i) => (i < n ? { putts: 3, strokes: h.par + 1 } : {})));

  it('최근 것이 앞이고 달성 수를 센다', () => {
    const p = goalProgress(goal('threePutts', 1, 1), rounds);
    expect(p.results.map((x) => x.value)).toEqual([3, 1, 0, 3, 0]);
    expect(p.results.map((x) => x.met)).toEqual([false, true, true, false, true]);
    expect(p).toMatchObject({ met: 3, total: 5 });
  });

  it('목표를 세운 날 이후 라운드만 센다', () => {
    const p = goalProgress(goal('threePutts', 1, 8), rounds);
    expect(p.results.map((x) => x.id)).toEqual(['g09', 'g08']);
    expect(p.total).toBe(2);
  });

  it('최대 5개까지만 보여 준다', () => {
    const many = Array.from({ length: 8 }, (_, k) => mk(k + 1));
    expect(goalProgress(goal('threePutts', 1, 1), many).total).toBe(5);
    expect(goalProgress(goal('threePutts', 1, 1), many, 3).total).toBe(3);
  });

  it('끝나지 않은 라운드와 판정 불가 라운드는 건너뛴다', () => {
    const live = { ...mk(10), completed: false };
    expect(goalProgress(goal('threePutts', 1, 1), [live, makeNineRound(3)]).total).toBe(0);
  });
});

describe('suggestTarget — 목표값 제안', () => {
  const withPutts = (values) => values.map((n, i) => mk(i + 1, (h, idx) => (idx < n ? { putts: 3, strokes: h.par + 1 } : {})));

  it('기록이 없으면 지표별 기본값', () => {
    expect(suggestTarget('threePutts', [])).toBe(2);
    expect(suggestTarget('gir', [])).toBe(40);
    expect(suggestTarget('nope', [])).toBeNull();
  });

  it('3퍼트 · 벌타 같은 횟수는 평균보다 하나 적게 (0 아래로는 내려가지 않는다)', () => {
    expect(suggestTarget('threePutts', withPutts([3, 3, 3]))).toBe(2);
    expect(suggestTarget('threePutts', withPutts([0, 0, 1]))).toBe(0);
  });

  it('스코어 · 퍼트 수는 평균보다 2 적게, 버디는 하나 많게', () => {
    const rounds = [1, 2, 3].map((i) => mk(i));                                         // 모두 파 → 72타 · 퍼트 36
    expect(suggestTarget('score', rounds)).toBe(70);
    expect(suggestTarget('putts', rounds)).toBe(34);
    expect(suggestTarget('birdies', rounds)).toBe(1);
  });

  it('GIR · 페어웨이 %는 평균보다 조금 높은 5% 단위, 100 을 넘지 않는다', () => {
    const rounds = [1, 2, 3].map((i) => mk(i, (h, idx) => ({ gir: idx < 9 })));         // GIR 50%
    expect(suggestTarget('gir', rounds)).toBe(60);
    expect(suggestTarget('gir', [1, 2, 3].map((i) => mk(i)))).toBe(100);                // GIR 100% → 상한
  });

  it('최근 5라운드만 본다', () => {
    const rounds = [...withPutts([9, 9, 9, 9, 9]).map((r, i) => ({ ...r, date: new Date(2026, 0, i + 1, 12).toISOString() })),
      ...[0, 0, 0, 0, 0].map((_, i) => ({ ...mk(i + 20), date: new Date(2026, 1, i + 1, 12).toISOString() }))];
    expect(suggestTarget('threePutts', rounds)).toBe(0);                                // 최근 5개는 모두 0 → 0
  });
});

describe('newGoal · sanitizeGoals', () => {
  it('새 목표는 만든 시각을 갖는다', () => {
    const g = newGoal({ metric: 'threePutts', target: 2 }, new Date('2026-10-23T09:00:00Z'));
    expect(g).toMatchObject({ metric: 'threePutts', target: 2, createdAt: '2026-10-23T09:00:00.000Z' });
    expect(g.id).toMatch(/^g\d+$/);
  });

  it('저장된 값에서 알 수 없는 지표 · 숫자가 아닌 목표값을 버리고 범위에 맞추고 2개까지만 남긴다', () => {
    const ok = (id, metric, target) => ({ id, metric, target, createdAt: '2026-10-01T00:00:00Z' });
    const out = sanitizeGoals([ok('a', 'threePutts', 2), ok('b', 'nope', 1), ok('c', 'gir', '40'), ok('d', 'gir', 140), ok('e', 'penalties', 1), { id: 'f' }, null]);
    expect(out.map((g) => g.id)).toEqual(['a', 'd']);
    expect(out[1].target).toBe(100);                                                    // 범위(0~100)에 맞춘다
    expect(out.length).toBeLessThanOrEqual(MAX_GOALS);
    expect(sanitizeGoals(undefined)).toEqual([]);
  });
});
