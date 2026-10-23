import { describe, it, expect } from 'vitest';
import { buildRoundCard, compareValues, COMPARE_MIN } from './roundCard.js';
import { summarizeRound } from './roundSummary.js';
import { buildInsightReport } from './insightIndex.js';
import { makeFullRound, makeNineRound, makeMultiRound, played, defaultScore } from '../test/fixtures.js';

const ME = '테스터';

// 모든 홀을 파 + over 로 친 18홀 (퍼트 putts, GIR gir) — 날짜는 2026-01-i
const flat = (i, { over = 0, putts = 2, gir = true } = {}, extra = {}) => {
  const r = makeFullRound(i, ME, { id: `c${String(i).padStart(2, '0')}`, date: new Date(2026, 0, i, 12).toISOString(), ...extra });
  r.holes.forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par + over, putts, gir }); });
  return r;
};

describe('buildRoundCard', () => {
  it('동반자 라운드는 카드를 만들지 않는다', () => {
    expect(buildRoundCard(makeMultiRound(1), [])).toEqual({ eligible: false });
    expect(buildRoundCard(null, [])).toEqual({ eligible: false });
  });

  it('총평 · 점수 · 잃은 타수 · 잘한 점/아쉬운 점(각 3개 이하) · 포커스를 준다', () => {
    const round = makeFullRound(3);
    const card = buildRoundCard(round, []);
    expect(card.eligible).toBe(true);
    expect(card.headline).toMatch(/^\d+타 \(/);
    expect(card.score).toBe(summarizeRound(round, ME).total);                      // 리포트와 같은 합계
    expect(card.strengths.length).toBeLessThanOrEqual(3);
    expect(card.issues.length).toBeLessThanOrEqual(3);
    expect(card.loss.length).toBeLessThanOrEqual(3);
    expect(card.loss.map((l) => l.strokes)).toEqual([...card.loss.map((l) => l.strokes)].sort((a, b) => b - a));
    expect(card.front + card.back).toBe(card.score);
  });

  it('잘한 점 · 아쉬운 점은 인사이트 리포트와 같은 항목이다 (화면 간 일치)', () => {
    const round = makeFullRound(4);
    const card = buildRoundCard(round, []);
    const rep = buildInsightReport([round], 'round');
    expect(card.strengths.map((s) => s.id)).toEqual(rep.strengths.slice(0, 3).map((s) => s.id));
    expect(card.issues.map((s) => s.id)).toEqual(rep.issues.slice(0, 3).map((s) => s.id));
  });

  it('포커스는 "입력하지 않은 홀" 같은 기록 보완 안내가 아니라 실제 개선 방향이다', () => {
    const card = buildRoundCard(makeFullRound(5), []);
    expect(card.focus === null || !/입력하지 않은 홀/.test(card.focus)).toBe(true);
  });

  it('입력한 홀이 하나도 없어도 죽지 않는다', () => {
    const r = makeFullRound(6);
    r.holes.forEach((h) => { h.scores[ME] = defaultScore(h.par); });
    const card = buildRoundCard(r, []);
    expect(card.eligible).toBe(true);
    expect(card.entered).toBe(0);
    expect(card.strengths).toEqual([]);
    expect(card.issues).toEqual([]);
  });

  it('9홀 라운드도 카드는 만들지만 평균 비교는 하지 않는다', () => {
    const history = [1, 2, 3, 4].map((i) => flat(i));
    const nine = makeNineRound(9, 'out');
    const card = buildRoundCard(nine, history);
    expect(card.eligible).toBe(true);
    expect(card.isNine).toBe(true);
    expect(card.back).toBeNull();
    expect(card.compare).toBeNull();
  });
});

describe('평균 비교', () => {
  it(`이전 라운드가 ${COMPARE_MIN}개 미만이면 비교하지 않는다`, () => {
    const history = [flat(1, { over: 1 }), flat(2, { over: 1 })];
    expect(buildRoundCard(flat(3), history).compare).toBeNull();
  });

  it('이전 3~5개 라운드의 평균과 견준다 (이 라운드와 이후 라운드는 뺀다)', () => {
    const rounds = [1, 2, 3, 4, 5, 6, 7].map((i) => flat(i, { over: 1 }));
    const current = rounds[3];                                          // 4번째 → 앞선 라운드는 3개
    expect(buildRoundCard(current, rounds).compare.basis).toBe(3);
    expect(buildRoundCard(rounds[6], rounds).compare.basis).toBe(5);    // 최대 5개
  });

  it('좋아졌으면 good · 나빠졌으면 bad · 비슷하면 flat 이고 방향은 지표마다 다르다', () => {
    const history = [1, 2, 3].map((i) => flat(i, { over: 1, putts: 2, gir: false }));     // 90타 · 퍼트 36 · GIR 0%
    const better = buildRoundCard(flat(4, { over: 0, putts: 1, gir: true }), history).compare;
    const byId = Object.fromEntries(better.rows.map((r) => [r.id, r]));
    expect(byId.score).toMatchObject({ value: 72, avg: 90, delta: -18, tone: 'good' });   // 타수는 낮을수록 좋다
    expect(byId.putts).toMatchObject({ value: 18, avg: 36, delta: -18, tone: 'good' });
    expect(byId.gir).toMatchObject({ value: 100, avg: 0, delta: 100, tone: 'good' });     // GIR 은 높을수록 좋다
    expect(byId.penalty.tone).toBe('flat');

    const worse = buildRoundCard(flat(4, { over: 2, putts: 3, gir: false }), history).compare;
    expect(worse.rows.find((r) => r.id === 'score').tone).toBe('bad');
    expect(worse.rows.find((r) => r.id === 'putts').tone).toBe('bad');
    expect(worse.rows.find((r) => r.id === 'gir').tone).toBe('flat');                       // 0% → 0%

    const same = buildRoundCard(flat(4, { over: 1, putts: 2, gir: false }), history).compare;
    expect(same.rows.every((r) => r.tone === 'flat')).toBe(true);
  });

  it('페어웨이를 기록하지 않은 라운드는 그 지표를 건너뛴다', () => {
    const history = [1, 2, 3].map((i) => flat(i));                                           // 페어웨이 기록 없음
    const rows = buildRoundCard(flat(4), history).compare.rows;
    expect(rows.find((r) => r.id === 'fairway')).toBeUndefined();
  });

  it('비교 숫자는 리포트(summarizeRound)와 같다', () => {
    const history = [1, 2, 3].map((i) => makeFullRound(i));
    const current = makeFullRound(4);
    const s = summarizeRound(current, ME);
    const row = buildRoundCard(current, history).compare.rows;
    expect(row.find((r) => r.id === 'score').value).toBe(s.total);
    expect(row.find((r) => r.id === 'gir').value).toBe(Number(s.girPct));
  });

  it('compareValues: 퍼트는 18홀 환산', () => {
    expect(compareValues(flat(1, { putts: 2 })).putts).toBe(36);
  });
});
