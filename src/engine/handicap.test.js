import { describe, it, expect } from 'vitest';
import { buildHandicap, handicapFromDifferentials, adjustedHoleScore, formatHandicap, HANDICAP_MAX } from './handicap.js';
import { makeFullRound, makeNineRound, makeMultiRound } from '../test/fixtures.js';

const ME = '테스터';

// i번째 라운드(날짜는 i일) — 모든 홀을 파 + over 로 친 18홀 (파 합계 72 → 차이값 = over × 18). over 는 숫자 또는 홀별 배열.
const mk = (i, over, extra = {}) => {
  const r = makeFullRound(i, ME, { id: `r${String(i).padStart(3, '0')}`, date: new Date(2026, 0, i, 12).toISOString(), ...extra });
  r.holes.forEach((h, idx) => {
    const o = Array.isArray(over) ? over[idx] : over;
    h.scores[ME] = { ...h.scores[ME], strokes: h.par + o };
  });
  return r;
};
const many = (overs) => overs.map((o, i) => mk(i + 1, o));

describe('handicapFromDifferentials — WHS 표', () => {
  it('3개 미만이면 계산하지 않는다', () => {
    expect(handicapFromDifferentials([])).toBeNull();
    expect(handicapFromDifferentials([10, 12])).toBeNull();
  });

  it.each([
    [[10, 12, 14], 8.0],                       // 3개: 가장 낮은 1개 − 2.0
    [[10, 12, 14, 16], 9.0],                   // 4개: 가장 낮은 1개 − 1.0
    [[10, 12, 14, 16, 18], 10.0],              // 5개: 가장 낮은 1개
    [[10, 12, 14, 16, 18, 20], 10.0],          // 6개: 낮은 2개 평균 − 1.0
    [[10, 12, 14, 16, 18, 20, 22], 11.0],      // 7개: 낮은 2개 평균
  ])('%j → %s', (diffs, expected) => {
    expect(handicapFromDifferentials(diffs)).toBe(expected);
  });

  it('20개면 낮은 8개의 평균', () => {
    const diffs = [...Array(8).fill(10), ...Array(12).fill(30)];
    expect(handicapFromDifferentials(diffs)).toBe(10.0);
  });

  it('최근 20개만 본다 (오래된 좋은 라운드는 빠진다)', () => {
    const diffs = [...Array(5).fill(0), ...Array(20).fill(18)];
    expect(handicapFromDifferentials(diffs)).toBe(18.0);
  });

  it('54.0 을 넘지 않는다', () => {
    expect(handicapFromDifferentials([80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80])).toBe(HANDICAP_MAX);
  });
});

describe('adjustedHoleScore — 한 홀 최대 점수', () => {
  it('핸디캡이 없으면 파 + 5', () => {
    expect(adjustedHoleScore(12, 4, null)).toBe(9);
    expect(adjustedHoleScore(7, 4, null)).toBe(7);
  });

  it('핸디캡이 있으면 파 + 2 + 홀당 받는 타수(코스 핸디캡 ÷ 18 반올림)', () => {
    expect(adjustedHoleScore(12, 4, 0)).toBe(6);     // 받는 타수 0 → 더블보기
    expect(adjustedHoleScore(12, 4, 8)).toBe(6);     // 8 ÷ 18 = 0.44 → 0
    expect(adjustedHoleScore(12, 4, 10)).toBe(7);    // 10 ÷ 18 = 0.56 → 1
    expect(adjustedHoleScore(12, 4, 18)).toBe(7);
    expect(adjustedHoleScore(12, 4, 36)).toBe(8);
  });

  it('핸디캡이 마이너스(스크래치보다 잘 침)여도 파 + 2 아래로 줄이지 않는다', () => {
    expect(adjustedHoleScore(12, 4, -2)).toBe(6);
  });
});

describe('buildHandicap', () => {
  it('3라운드 미만은 핸디캡이 없다', () => {
    expect(buildHandicap([], ME).index).toBeNull();
    expect(buildHandicap(many([1, 2]), ME).index).toBeNull();
    expect(buildHandicap(many([1, 2]), ME).count).toBe(2);
  });

  it('차이값은 조정 총타수 − 파 (모든 홀 보기 → 18)', () => {
    const h = buildHandicap(many([1, 1, 1]), ME);
    expect(h.entries.map((e) => e.differential)).toEqual([18, 18, 18]);
    expect(h.entries[0]).toMatchObject({ gross: 90, adjusted: 90 });
    expect(h.index).toBe(16.0);                       // 3개: 18 − 2.0
  });

  it('라운드가 쌓이면 WHS 표대로 바뀐다 (4개 · 5개 · 6개)', () => {
    expect(buildHandicap(many([1, 2, 3, 1]), ME).index).toBe(17.0);          // 낮은 1개(18) − 1.0
    expect(buildHandicap(many([1, 2, 3, 1, 2]), ME).index).toBe(18.0);       // 낮은 1개(18)
    expect(buildHandicap(many([1, 1, 2, 2, 3, 3]), ME).index).toBe(17.0);    // 낮은 2개 평균(18) − 1.0
  });

  it('20라운드 중 낮은 8개의 평균을 쓰고, 쓴 라운드를 표시한다', () => {
    const h = buildHandicap(many([...Array(8).fill(0), ...Array(12).fill(1)]), ME);
    expect(h.index).toBe(0.0);
    expect(h.used).toBe(8);
    expect(h.entries.filter((e) => e.counted)).toHaveLength(8);
    expect(h.entries.filter((e) => e.counted).every((e) => e.differential === 0)).toBe(true);
  });

  it('최근 20개만 쓴다 — 25라운드면 앞의 5개는 빠진다', () => {
    const h = buildHandicap(many([...Array(5).fill(0), ...Array(20).fill(1)]), ME);
    expect(h.index).toBe(18.0);
    expect(h.count).toBe(25);
  });

  it('입력 순서와 상관없이 날짜순으로 계산한다', () => {
    const rounds = many([1, 2, 3, 1, 2, 3, 1]);
    expect(buildHandicap([...rounds].reverse(), ME).index).toBe(buildHandicap(rounds, ME).index);
  });

  it('핸디캡이 없을 때 한 홀은 파 + 5 까지만 센다', () => {
    const over = Array(18).fill(0); over[0] = 8;                            // 한 홀에서 파 + 8
    const h = buildHandicap([mk(1, over)], ME);
    expect(h.entries[0]).toMatchObject({ gross: 80, adjusted: 77, differential: 5 });
  });

  it('핸디캡이 생기면 그 값으로 상한을 계산한다 (코스 핸디캡 16 → 홀당 1타 → 파 + 3)', () => {
    const blowUp = Array(18).fill(0); blowUp[0] = 8;
    const h = buildHandicap([mk(1, 1), mk(2, 1), mk(3, 1), mk(4, blowUp)], ME);
    expect(h.entries[2].differential).toBe(18);
    expect(h.entries[3]).toMatchObject({ gross: 80, adjusted: 75, differential: 3 });   // 그 홀 파 + 8 → 파 + 3 으로 줄어 80 → 75
  });

  it('9홀 라운드는 계산에서 뺀다', () => {
    const h = buildHandicap([...many([1, 1, 1]), makeNineRound(1, 'out')], ME);
    expect(h.count).toBe(3);
    expect(h.index).toBe(16.0);
  });

  it('동반자와 함께 친 18홀도 내 점수로 센다 (이름으로 "나"를 찾는다)', () => {
    const withFriend = (i, mine, theirs) => {
      const r = makeMultiRound(i);
      r.id = `m${i}`; r.date = new Date(2026, 1, i, 12).toISOString();
      r.holes.forEach((hole) => {
        hole.scores['친구'] = { ...hole.scores['친구'], strokes: hole.par + theirs };
        hole.scores[ME] = { ...hole.scores[ME], strokes: hole.par + mine };
      });
      return r;
    };
    const rounds = [withFriend(1, 1, 3), withFriend(2, 1, 3), withFriend(3, 1, 3)];
    expect(buildHandicap(rounds, ME).entries.map((e) => e.differential)).toEqual([18, 18, 18]);     // 내 점수(보기 플레이)
    expect(buildHandicap(rounds, '친구').entries.map((e) => e.differential)).toEqual([54, 54, 54]);  // 같은 라운드를 친구 이름으로 보면 다르다
    expect(buildHandicap(rounds, ME).index).toBe(16.0);
  });

  it('직전 라운드를 넣기 전과의 차이(delta)를 준다', () => {
    const h = buildHandicap(many([1, 1, 1, 1]), ME);                            // 16.0 → 17.0
    expect(h.index).toBe(17.0);
    expect(h.delta).toBe(1.0);
    expect(buildHandicap(many([1, 1]), ME).delta).toBeNull();
    expect(buildHandicap(many([1, 1, 1]), ME).delta).toBeNull();               // 이전 값이 없다
  });

  it('스크래치보다 잘 치면 마이너스 핸디캡이 나온다', () => {
    expect(buildHandicap(many([-1, -1, -1]), ME).index).toBeLessThan(0);
  });

  it('홀 점수가 비어 있어도 죽지 않는다 (파로 센다)', () => {
    const r = mk(1, 0);
    r.holes[0].scores[ME].strokes = null;
    expect(() => buildHandicap([r, mk(2, 0), mk(3, 0)], ME)).not.toThrow();
  });
});

describe('formatHandicap', () => {
  it('값 없음 · 0 이상 · 마이너스(+표기)', () => {
    expect(formatHandicap(null)).toBe('—');
    expect(formatHandicap(12.34)).toBe('12.3');
    expect(formatHandicap(0)).toBe('0.0');
    expect(formatHandicap(-1.2)).toBe('+1.2');
  });
});
