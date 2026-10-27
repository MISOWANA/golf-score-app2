import { describe, it, expect } from 'vitest';
import { buildShortGamePattern, shortGameShots, summarizePattern, ringScale, MIN_PATTERN_SHOTS, MIN_ROW_SHOTS, PATTERN_WINDOW } from './shortGamePattern.js';
import { defaultScore } from '../test/fixtures.js';

const ME = '테스터';

// 파4 세컨샷을 from(m) 에서 쳐서 그린에 올린 홀 — 랜딩 hour 시, 핀까지 dist(m)
const chipHole = (from, hour, dist, over = {}) => ({
  par: 4,
  scores: {
    [ME]: {
      ...defaultScore(4), touched: true, confirmed: true, teeClub: 'driver',
      secondClub: 'wedge', secondClubSub: '52', remainingDistance: from, onGreen: true, gir: true, girAuto: false,
      putts: 2, puttDetails: [{ distance: dist, holein: 'fail' }, { distance: 0.5, holein: 'success' }],
      onGreenLanding: hour, ...over,
    },
  },
});
const roundOf = (holes, id = 'r') => ({ id, date: '2026-06-01T00:00:00.000Z', players: [ME], holes });

describe('shortGameShots — 80m 안 샷이 그린에 올라간 홀을 핀 기준 점으로', () => {
  it('랜딩 방향(시)과 첫 퍼트 거리가 핀 기준 좌표가 된다 (+x 오른쪽 · +y 핀 너머)', () => {
    const { shots } = shortGameShots([roundOf([chipHole(30, 6, 2), chipHole(30, 3, 1.5), chipHole(30, 12, 3), chipHole(30, 9, 1)])]);
    const at = (hour) => shots.find((s) => s.hour === hour);
    expect(at(6)).toMatchObject({ quadrant: 'short' });
    expect(at(6).x).toBeCloseTo(0, 6); expect(at(6).y).toBeCloseTo(-2, 6);        // 숏 2m
    expect(at(3).x).toBeCloseTo(1.5, 6); expect(at(3).y).toBeCloseTo(0, 6);       // 라이트 1.5m
    expect(at(12).y).toBeCloseTo(3, 6);                                           // 롱 3m
    expect(at(9).x).toBeCloseTo(-1, 6);                                           // 레프트 1m
  });

  it('대각선 시각은 두 축으로 나뉜다 (1시 = 롱 쪽 · 오른쪽)', () => {
    const [s] = shortGameShots([roundOf([chipHole(30, 1, 4)])]).shots;
    expect(s.quadrant).toBe('long');
    expect(s.x).toBeCloseTo(2, 6); expect(s.y).toBeCloseTo(4 * Math.cos(Math.PI / 6), 6);
  });

  it('80m 이상에서 친 샷 · 남은 거리를 모르는 샷 · 그린을 못 올린 샷은 숏게임이 아니다', () => {
    const miss = chipHole(30, 6, 2, { onGreen: false, gir: false, extraShots: [{ club: 'wedge', subClub: '56', remainingDistance: 10, onGreen: null, lie: 'flat' }] });
    const { shots, coverage } = shortGameShots([roundOf([chipHole(80, 6, 2), chipHole(120, 6, 2), chipHole(null, 6, 2), miss, chipHole(79, 6, 2)])]);
    expect(shots.map((s) => s.from)).toEqual([79]);
    expect(coverage.onGreen).toBe(1);
  });

  it('랜딩 방향이 없으면 점은 만들지 않지만, 올린 샷 중 몇 개가 방향을 갖췄는지는 센다', () => {
    const noHour = chipHole(30, null, 2);
    const holes = [chipHole(30, 6, 2), noHour, chipHole(30, '4', 2)];   // 예전 기록의 '4' 문자열 시각도 받는다
    const { shots, coverage } = shortGameShots([roundOf(holes)]);
    expect(shots).toHaveLength(2);
    expect(coverage).toEqual({ onGreen: 3, withLanding: 2, withPutt: 3, both: 2 });
  });

  it('첫 퍼트 거리가 없는 샷은 거리를 구할 수 없어(GPS도 없으면) 샷 자체가 목록에 없다', () => {
    const { shots, coverage } = shortGameShots([roundOf([chipHole(30, 6, 2, { puttDetails: [] })])]);
    expect(shots).toEqual([]);
    expect(coverage.onGreen).toBe(0);
  });

  it('칩인(퍼트 없이 들어간 샷)은 올린 샷으로도 세지 않는다', () => {
    const holed = chipHole(30, 6, 2, { onGreen: 'chip-in', putts: 0, puttDetails: [] });
    const { shots, coverage } = shortGameShots([roundOf([holed, chipHole(30, 6, 2)])]);
    expect(shots).toHaveLength(1);
    expect(coverage.onGreen).toBe(1);
  });

  it(`최근 ${PATTERN_WINDOW}라운드만 쓴다`, () => {
    const rounds = Array.from({ length: PATTERN_WINDOW + 3 }, (_, i) => roundOf([chipHole(30, 6, 2)], `r${i}`));
    expect(shortGameShots(rounds).shots).toHaveLength(PATTERN_WINDOW);
  });
});

describe('summarizePattern — 쏠림과 흩어짐', () => {
  const shots = (list) => shortGameShots([roundOf(list.map(([hour, dist]) => chipHole(30, hour, dist)))]).shots;

  it('방향별 횟수 · 가장 많이 멈춘 쪽 · 평균 위치', () => {
    const s = summarizePattern(shots([[6, 2], [6, 1], [6, 3], [12, 1], [3, 2]]));
    expect(s).toMatchObject({ n: 5, q: { short: 3, long: 1, right: 1, left: 0 }, top: 'short', medianDist: 2 });
    expect(s.mean.y).toBeCloseTo((-2 - 1 - 3 + 1 + 0) / 5, 6);         // 앞뒤: 숏 쪽
    expect(s.mean.x).toBeCloseTo(2 / 5, 6);                            // 좌우: 약간 오른쪽
  });

  it('같은 횟수로 갈리면 "가장 많은 쪽"을 정하지 않는다', () => {
    expect(summarizePattern(shots([[6, 2], [6, 1], [12, 2], [12, 1]])).top).toBeNull();
  });

  it('흩어짐은 앞뒤와 좌우를 따로 낸다 — 앞뒤로만 흩어지면 좌우 흩어짐은 0 이다', () => {
    const s = summarizePattern(shots([[12, 1], [12, 3], [6, 1], [6, 3]]));
    expect(s.spread.x).toBeCloseTo(0, 6);
    expect(s.spread.y).toBeGreaterThan(1.5);
  });

  it('쏠림이 뚜렷한지는 평균의 오차 범위로 가른다 — 같은 쪽으로만 가면 뚜렷하고, 사방으로 흩어지면 아니다', () => {
    const same = summarizePattern(shots([[6, 2], [6, 2.1], [6, 1.9], [6, 2], [6, 2.2]]));
    expect(same.clear).toEqual({ x: false, y: true });              // 좌우는 늘 0 (쏠림 없음) · 앞뒤는 숏으로 뚜렷
    const scatter = summarizePattern(shots([[6, 4], [12, 4], [3, 4], [9, 4], [6, 1]]));
    expect(scatter.clear.y).toBe(false);
    expect(summarizePattern(shots([[6, 2], [6, 1], [12, 1]])).clear).toBeNull();   // 샷이 적으면 말하지 않는다
  });

  it('샷이 3개 미만이면 흩어짐을 말하지 않고, 비어 있어도 안전하다', () => {
    expect(summarizePattern(shots([[6, 2], [3, 1]])).spread).toBeNull();
    expect(summarizePattern([])).toMatchObject({ n: 0, top: null, mean: null, spread: null, medianDist: null });
  });
});

describe('buildShortGamePattern', () => {
  const rounds = (list) => [roundOf(list)];

  it(`샷이 ${MIN_PATTERN_SHOTS}개 미만이면 enough 가 아니다`, () => {
    const few = buildShortGamePattern(rounds(Array.from({ length: MIN_PATTERN_SHOTS - 1 }, () => chipHole(30, 6, 2))));
    expect(few.enough).toBe(false);
    const ok = buildShortGamePattern(rounds(Array.from({ length: MIN_PATTERN_SHOTS }, () => chipHole(30, 6, 2))));
    expect(ok.enough).toBe(true);
  });

  it(`거리대별 · 클럽별 줄은 ${MIN_ROW_SHOTS}샷 이상일 때만 만든다`, () => {
    const holes = [
      ...[10, 12, 15].map((f) => chipHole(f, 6, 2)),                                         // 20m 안 3샷 (52°)
      ...[30, 40].map((f) => chipHole(f, 12, 1)),                                            // 20-50m 2샷
      ...[60, 65, 70].map((f) => chipHole(f, 3, 3, { secondClub: 'iron', secondClubSub: '9I' })),   // 50-80m 3샷 (9I)
    ];
    const p = buildShortGamePattern(rounds(holes));
    expect(p.byBand.map((b) => [b.id, b.n])).toEqual([['lt20', 3], ['50to80', 3]]);
    expect(p.byClub.map((c) => [c.key, c.n])).toEqual([['wedge:52', 5], ['iron:9I', 3]]);
    expect(p.byBand[0]).toMatchObject({ top: 'short', medianDist: 2 });
  });

  it('쏠림만 있는 패턴과 흩어진 패턴이 서로 다르게 나온다', () => {
    const steady = buildShortGamePattern(rounds([[6, 2], [6, 2.1], [6, 1.9], [6, 2], [6, 2.2]].map(([h, d]) => chipHole(30, h, d))));
    const loose = buildShortGamePattern(rounds([[6, 4], [12, 4], [3, 4], [9, 4], [6, 0.5]].map(([h, d]) => chipHole(30, h, d))));
    expect(steady.mean.y).toBeLessThan(-1.9);                      // 같은 쪽(숏)에 쏠림
    expect(steady.spread.y).toBeLessThan(0.2);                     // 흩어짐은 작다
    expect(Math.abs(loose.mean.y)).toBeLessThan(1.5);              // 쏠림은 서로 상쇄
    expect(loose.spread.y).toBeGreaterThan(2.5);                   // 흩어짐은 크다
  });
});

describe('ringScale — 과녁 눈금', () => {
  it('가장 먼 샷까지 담는 동심원을 5개 이내로 만든다', () => {
    expect(ringScale(3.2)).toMatchObject({ step: 1, max: 4, rings: [1, 2, 3, 4] });
    expect(ringScale(2.5)).toMatchObject({ step: 0.5, max: 2.5, rings: [0.5, 1, 1.5, 2, 2.5] });
    expect(ringScale(7).rings).toEqual([2, 4, 6, 8]);
  });

  it('이상치 한 개가 눈금을 한없이 늘리지 못한다', () => {
    const s = ringScale(60);
    expect(s.max).toBeLessThanOrEqual(15);
    expect(ringScale(0).rings.length).toBeGreaterThan(0);
  });
});
