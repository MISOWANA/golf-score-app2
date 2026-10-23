import { describe, it, expect } from 'vitest';
import { buildHomeSummary, SKILL_NAME } from './homeSummary.js';
import { makeFullRound, makeNineRound, makeMultiRound, played } from '../test/fixtures.js';

const ME = '테스터';

// i번째 라운드 — 파 + over 로 친 18홀, 날짜는 2026-01-i
const mk = (i, over) => {
  const r = makeFullRound(i, ME, { id: `h${String(i).padStart(2, '0')}`, date: new Date(2026, 0, i, 12).toISOString() });
  r.holes.forEach((h) => { h.scores[ME] = played(h.par, { strokes: h.par + over, putts: 2 }); });
  return r;
};

describe('buildHomeSummary', () => {
  it('라운드가 없어도 죽지 않는다', () => {
    const s = buildHomeSummary([], [], ME);
    expect(s).toMatchObject({ hasForm: false, weakest: null, strongest: null });
    expect(s.handicap.index).toBeNull();
    expect(s.recent).toMatchObject({ n: 0, avg: null, delta: null });
  });

  it('라운드가 3개 미만이면 "내 폼"을 만들지 않는다', () => {
    const rounds = [mk(1, 1), mk(2, 1)];
    expect(buildHomeSummary(rounds, rounds, ME).hasForm).toBe(false);
  });

  it('최근 5라운드 평균과 그 이전 5라운드 대비', () => {
    const older = [1, 2, 3, 4, 5].map((i) => mk(i, 2));            // 108타
    const newer = [6, 7, 8, 9, 10].map((i) => mk(i, 1));           // 90타
    const s = buildHomeSummary([...older, ...newer], [...older, ...newer], ME);
    expect(s.recent).toMatchObject({ n: 5, avg: 90, prevAvg: 108, delta: -18 });
  });

  it('이전 라운드가 3개 미만이면 대비는 비운다', () => {
    const rounds = [1, 2, 3, 4, 5, 6, 7].map((i) => mk(i, 1));    // 최근 5 + 이전 2
    const s = buildHomeSummary(rounds, rounds, ME);
    expect(s.recent.avg).toBe(90);
    expect(s.recent.prevAvg).toBeNull();
    expect(s.recent.delta).toBeNull();
  });

  it('9홀 라운드는 평균에도 핸디캡에도 넣지 않는다', () => {
    const rounds = [mk(1, 1), mk(2, 1), mk(3, 1), makeNineRound(4, 'out')];
    const s = buildHomeSummary(rounds, rounds, ME);
    expect(s.recent.n).toBe(3);
    expect(s.handicap.count).toBe(3);
  });

  it('동반자와 함께 친 18홀은 내 점수로 평균·핸디캡에 넣는다', () => {
    const multi = makeMultiRound(1);
    const rounds = [mk(1, 1), mk(2, 1), multi];
    const s = buildHomeSummary(rounds, [rounds[0], rounds[1]], ME);
    expect(s.recent.n).toBe(3);
    expect(s.handicap.count).toBe(3);
  });

  it('핸디캡을 함께 준다 (3라운드: 가장 낮은 차이값 − 2.0)', () => {
    const rounds = [mk(1, 1), mk(2, 1), mk(3, 1)];
    expect(buildHomeSummary(rounds, rounds, ME).handicap).toMatchObject({ index: 16.0, count: 3 });
  });

  it('통계 라운드가 3개 이상이면 약점 1순위를 한글 이름으로 준다', () => {
    const rounds = [1, 2, 3, 4].map((i) => makeFullRound(i));
    const s = buildHomeSummary(rounds, rounds, ME);
    expect(s.weakest === null || Object.values(SKILL_NAME).includes(s.weakest.label)).toBe(true);
  });

  it('통계 라운드가 3개 미만이면 약점·강점을 말하지 않는다', () => {
    const rounds = [makeFullRound(1), makeFullRound(2)];
    const s = buildHomeSummary(rounds, rounds, ME);
    expect(s.weakest).toBeNull();
    expect(s.strongest).toBeNull();
  });
});
