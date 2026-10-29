import { describe, it, expect } from 'vitest';
import { buildPuttingDetail, collectPutts, summarizePace, quadrantOfStop, MIN_MAP_MISSES } from './puttingDetail.js';
import { buildPuttingStats } from './shotStats.js';
import { aggregateSG } from './strokesGained.js';
import { expectedStrokes } from '../data/baseline.js';
import { ME, stopAt, made, missed, holeOf, roundOf } from '../test/putts.js';

describe('collectPutts — 퍼트 표본', () => {
  it('결과(holein)를 기록하지 않은 퍼트는 세지 않는다', () => {
    const { putts } = collectPutts([roundOf([holeOf([{ distance: 3, lie: 'flat', holein: null }, made(1)])])]);
    expect(putts).toHaveLength(1);
    expect(putts[0]).toMatchObject({ dist: 1, made: true, idx: 1 });
  });

  it('빗나간 퍼트는 멈춘 곳 기록을, 홀인한 퍼트와 그린 밖 퍼트는 기록이 있어도 쓰지 않는다', () => {
    const m = stopAt(0.3, -0.4);
    const { putts } = collectPutts([roundOf([holeOf([
      { ...missed(5, 'flat'), miss: m }, { ...made(0.5), miss: m }, { distance: 4, lie: 'flat', holein: 'offgreen', miss: m },
    ])])]);
    expect(putts.map((x) => !!x.miss)).toEqual([true, false, false]);
    expect(putts[2]).toMatchObject({ off: true, made: false });
  });

  it('탄착이 아니라 좌표가 어긋난 기록(숫자가 아닌 값)은 멈춘 곳으로 쓰지 않는다', () => {
    const bad = { x: 'a', y: 1, leave: 1, along: 'long', across: 'line' };
    const { putts } = collectPutts([roundOf([holeOf([{ ...missed(5, 'flat'), miss: bad }, made(1)])])]);
    expect(putts[0].miss).toBeNull();
  });

  it('빗나간 뒤 남은 거리는 멈춘 곳 기록, 없으면 다음 퍼트 거리', () => {
    const { putts } = collectPutts([roundOf([holeOf([missed(8, 'flat', 0.2, -1.1), missed(1.1, 'flat'), made(0.4)])]), roundOf([holeOf([missed(6, 'flat'), made(1.8)])], 'r2')]);
    expect(putts[0].leave).toBeCloseTo(1.1, 1);
    expect(putts[1].leave).toBe(0.4);                         // 멈춘 곳 기록 없음 → 다음 퍼트 거리
    expect(putts[2].leave).toBe(0);                           // 들어간 퍼트
    expect(putts[3].leave).toBe(1.8);
  });

  it('탭인으로 한 번에 기록한 마지막 퍼트는 라이를 모르는 것으로 센다', () => {
    const { putts } = collectPutts([roundOf([holeOf([missed(4, 'break-right', 0.2, -0.6), { distance: 0.6, lie: 'flat', holein: 'success', tapIn: true, distanceAuto: true }])])]);
    expect(putts[1]).toMatchObject({ tapIn: true, lie: null, made: true, auto: true });
  });

  it('기록이 없거나 깨진 홀에도 던지지 않는다', () => {
    expect(collectPutts([])).toEqual({ putts: [], holes: [] });
    expect(collectPutts([{ players: [ME] }, { players: [ME], holes: [{ par: 4 }, { par: 4, scores: {} }, { par: 4, scores: { [ME]: { putts: 2 } } }] }]).putts).toEqual([]);
  });
});

describe('거리별 성공률은 기존 퍼팅 성공률과 같은 숫자다', () => {
  const rounds = [roundOf([
    holeOf([missed(7, 'flat', 0.3, -1.2), missed(1.2, 'flat', -0.2, 0.4), made(0.4)], { strokes: 6, number: 1 }),
    holeOf([made(2.4, 'uphill')], { number: 2 }),
    holeOf([missed(0.8, 'flat', 0.1, 0.3), made(0.3)], { number: 3 }),
    holeOf([{ distance: 3.5, lie: 'flat', holein: 'offgreen' }, made(1)], { number: 4 }),
    holeOf([made(0.6, 'flat', { tapIn: true })], { number: 5 }),
  ])];

  it('거리 구간마다 성공 · 시도가 buildPuttingStats 와 같다', () => {
    const detail = buildPuttingDetail(rounds).byDistance;
    const old = buildPuttingStats(rounds).byDistance;
    expect(detail.map((b) => [b.id, b.made, b.total])).toEqual(old.map((b) => [b.id, b.made, b.total]));
  });

  it('경사 · 휨 합계도 같고, 탭인(라이를 가정한 값)은 어느 쪽에서도 빠진다', () => {
    const d = buildPuttingDetail(rounds).byLie;
    const old = buildPuttingStats(rounds);
    expect(d.bySlope.map((b) => [b.id, b.made, b.total])).toEqual(old.bySlope.map((b) => [b.id, b.made, b.total]));
    expect(d.byBreak.map((b) => [b.id, b.made, b.total])).toEqual(old.byBreak.map((b) => [b.id, b.made, b.total]));
    expect(d.n).toBe(old.bySlope.reduce((a, b) => a + b.total, 0));
    expect(d.bySlope.find((b) => b.id === 'flat').total).toBe(7);       // 평지로 고른 7개 — 탭인 1개는 빠졌다
  });
});

describe('거리감 — 롱 · 숏', () => {
  const m = (x, y) => ({ miss: stopAt(x, y) });

  it('미스를 숏 · 핀하이 · 롱으로 나누고 모자란 거리 · 지나친 거리의 중앙값을 낸다', () => {
    const p = summarizePace([m(0, -0.5), m(0, -0.9), m(0, -0.7), m(0, 0.4), m(0, 1.2), m(0.5, 0)]);
    expect(p).toMatchObject({ n: 6, short: 3, long: 2, pinHigh: 1 });
    expect(p.shortPct).toBeCloseTo(50, 6);
    expect(p.shortMedian).toBeCloseTo(0.7, 6);
    expect(p.longMedian).toBeCloseTo(0.8, 6);
  });

  it('멈춘 곳 기록이 없는 퍼트는 세지 않고, 기록이 없으면 비율은 null', () => {
    expect(summarizePace([{ miss: null }])).toMatchObject({ n: 0, shortPct: null, shortMedian: null });
  });

  it('경사별 · 거리별로도 나누고 표본이 3개 미만인 줄은 뺀다', () => {
    const putts = [
      ...[-0.6, -0.8, -0.5, 0.7].map((y) => missed(3, 'flat', 0, y)),
      ...[1.0, 0.9, 1.3].map((y) => missed(3, 'downhill', 0, y)),
      missed(3, 'uphill', 0, -0.5),
    ];
    const d = buildPuttingDetail([roundOf(putts.map((p, i) => holeOf([p, made(0.3)], { number: i + 1 })))]).pace;
    expect(d.all.n).toBe(8);
    expect(d.bySlope.map((r) => [r.id, r.n, r.short, r.long])).toEqual([['flat', 4, 3, 1], ['downhill', 3, 0, 3]]);   // 오르막은 1개라 줄이 없다
    expect(d.byDistance.map((r) => r.id)).toEqual(['p5']);          // 모두 3m 퍼트 → 2~5m 한 줄
  });

  it('quadrantOfStop — 가로 · 세로 중 더 먼 축', () => {
    expect(quadrantOfStop(0.2, 0.9)).toBe('long');
    expect(quadrantOfStop(0.2, -0.9)).toBe('short');
    expect(quadrantOfStop(1, 0.3)).toBe('right');
    expect(quadrantOfStop(-1, -0.3)).toBe('left');
  });
});

describe('라인 — 좌우 · 하이/로우사이드', () => {
  it('직선 퍼트의 좌우를 센다', () => {
    const rs = [[0.4, -0.5], [0.6, 0.2], [-0.3, -0.4], [0.02, -0.8]].map(([x, y], i) => holeOf([missed(4, 'flat', x, y), made(0.5)], { number: i + 1 }));
    const l = buildPuttingDetail([roundOf(rs)]).line;
    expect(l.straight).toMatchObject({ n: 4, right: 2, left: 1, line: 1 });
    expect(l.side.n).toBe(0);                                         // 직선은 사이드를 말하지 않는다
  });

  it('훅 · 슬라이스의 미스는 하이 · 로우사이드로 나눈다 (훅은 왼쪽이 로우, 슬라이스는 오른쪽이 로우)', () => {
    const hook = [[-0.4, 0.2], [-0.5, -0.3], [0.5, -0.4], [-0.6, 0.1]].map(([x, y], i) => holeOf([missed(5, 'break-right', x, y, { brk: 'hook' }), made(0.5)], { number: i + 1 }));
    const slice = [[0.5, 0.2], [0.4, -0.3], [-0.5, -0.2]].map(([x, y], i) => holeOf([missed(5, 'break-left', x, y, { brk: 'slice' }), made(0.5)], { number: i + 5 }));
    const l = buildPuttingDetail([roundOf([...hook, ...slice])]).line;
    expect(l.side).toMatchObject({ n: 7, low: 5, high: 2 });
    expect(l.byShape.map((r) => [r.id, r.n, r.low, r.high])).toEqual([['hook', 4, 3, 1], ['slice', 3, 2, 1]]);
  });
});

describe('라이별', () => {
  it('기본 9칸은 기록이 없어도 모두 있고, 복합은 기록된 칸만 있다', () => {
    const d = buildPuttingDetail([roundOf([holeOf([made(2, 'flat')]), holeOf([made(3, 's-lr')], { number: 2 })])]).byLie;
    expect(d.cells).toHaveLength(9);
    expect(d.cells.find((c) => c.id === 'flat')).toMatchObject({ made: 1, total: 1, ratePct: 100 });
    expect(d.cells.find((c) => c.id === 'uphill-break-left').total).toBe(0);
    expect(d.compound.map((c) => c.id)).toEqual(['s-lr']);
    expect(d.byBreak.map((b) => b.id)).toEqual(['slice', 'straight', 'hook', 'scurve']);
  });

  it('S자 기록이 없으면 휨 합계에도 S자 줄이 없다', () => {
    expect(buildPuttingDetail([roundOf([holeOf([made(2, 'flat')])])]).byLie.byBreak.map((b) => b.id)).toEqual(['slice', 'straight', 'hook']);
  });

  it('칸마다 거리 중앙값과 미스의 앞뒤 몫도 돌려준다', () => {
    const rs = [made(4, 'uphill'), missed(6, 'uphill', 0, -0.5), missed(8, 'uphill', 0, -0.6), missed(2, 'uphill', 0, 0.4)].map((p, i) => holeOf([p, made(0.3)], { number: i + 1 }));
    const c = buildPuttingDetail([roundOf(rs)]).byLie.cells.find((x) => x.id === 'uphill');
    expect(c).toMatchObject({ made: 1, total: 4, missN: 3 });
    expect(c.distMedian).toBe(5);                                       // 4 · 6 · 8 · 2 → 중앙값 5
    expect(c.pace).toMatchObject({ n: 3, short: 2, long: 1 });
  });
});

describe('첫 퍼트 붙이기', () => {
  it('시작 거리대마다 1퍼트 · 3퍼트 · 남은 거리 중앙값 · 1m 안 비율', () => {
    const holes = [
      holeOf([missed(7, 'flat', 0.1, -0.6), made(0.6)]),                                   // 6~10m: 0.6 남김
      holeOf([missed(8, 'flat', 0.3, 1.5), missed(1.5, 'flat', 0, -0.4), made(0.4)]),       // 6~10m: 1.5 남김 · 3퍼트
      holeOf([missed(9, 'flat', 0.5, -2.0), made(2)]),                                      // 6~10m: 2.1 남김
      holeOf([made(7)]),                                                                    // 6~10m: 1퍼트
    ].map((h, i) => ({ ...h, holeNumber: i + 1 }));
    const row = buildPuttingDetail([roundOf(holes)]).lag.find((z) => z.id === 'lag10');
    expect(row).toMatchObject({ n: 4, leaveN: 3 });
    expect(row.onePuttPct).toBeCloseTo(25, 6);
    expect(row.threePuttPct).toBeCloseTo(25, 6);
    expect(row.leaveMedian).toBeCloseTo(1.5, 1);
    expect(row.within1N).toBe(4);
    expect(row.within1Pct).toBeCloseTo(50, 6);                                              // 들어간 1 + 1m 안 1(0.6) / 4
  });

  it('표본이 3개 미만인 거리대는 줄이 없다', () => {
    expect(buildPuttingDetail([roundOf([holeOf([made(7)]), holeOf([made(7)], { number: 2 })])]).lag).toEqual([]);
  });

  it('컴백 퍼트 — 두 번째 이후 퍼트 중 2m 이내', () => {
    const holes = [
      holeOf([missed(6, 'flat', 0, -1.4), made(1.4)]),
      holeOf([missed(6, 'flat', 0, -1.0), missed(1.0, 'flat', 0, -0.3), made(0.3)], { number: 2 }),
      holeOf([made(1.0)], { number: 3 }),                                                    // 첫 퍼트라 컴백이 아니다
    ];
    expect(buildPuttingDetail([roundOf(holes)]).comeback).toMatchObject({ made: 2, total: 3 });
  });
});

describe('무엇을 위한 퍼트인가', () => {
  it('그린에 올리는 데 쓴 타수로 버디 · 파 · 보기 이상 퍼트를 가른다 (칩 · 벌타를 뺀 타수)', () => {
    const holes = [
      holeOf([made(3)], { par: 4, strokes: 3, number: 1 }),                                 // 2온 1퍼트 → 버디 퍼트
      holeOf([missed(5, 'flat'), made(0.5)], { par: 4, strokes: 4, number: 2 }),            // 2온 → 버디 퍼트(실패)
      holeOf([made(2), ], { par: 4, strokes: 4, gir: false, number: 3 }),                   // 3온 1퍼트 → 파 퍼트
      holeOf([made(1.5)], { par: 4, strokes: 5, gir: false, number: 4 }),                   // 4온 → 보기 퍼트
    ];
    const f = buildPuttingDetail([roundOf(holes)]).forScore;
    expect(f.map((r) => [r.id, r.made, r.total])).toEqual([['birdie', 1, 2], ['par', 1, 1], ['bogey', 1, 1]]);
    expect(f[0].distMedian).toBe(4);
  });

  it('그린 밖으로 나가 칩으로 올린 홀은 칩 타수를 빼고 센다', () => {
    const h = holeOf([{ distance: 6, lie: 'flat', holein: 'offgreen' }, made(1)], { par: 4, strokes: 5, number: 1, over: { offGreen: [{ after: 0, club: 'wedge', onGreen: true }], putts: 2 } });
    const f = buildPuttingDetail([roundOf([h])]).forScore;
    expect(f.map((r) => r.id)).toEqual(['birdie']);           // 5타 − 퍼트 2 − 칩 1 = 2타에 그린에 올랐다 → 첫 퍼트는 버디 퍼트였다
  });

  it('입력하지 않은 홀(touched 아님)은 세지 않는다', () => {
    const h = holeOf([made(3)], { par: 4, strokes: 3, over: { touched: false } });
    expect(buildPuttingDetail([roundOf([h])]).forScore).toEqual([]);
  });
});

describe('3퍼트 홀의 첫 퍼트', () => {
  it('첫 퍼트가 숏 · 롱으로 빗나간 3퍼트 홀을 센다', () => {
    const holes = [
      holeOf([missed(9, 'flat', 0, -2.2), missed(2.2, 'flat', 0, -0.4), made(0.4)], { strokes: 6, number: 1 }),
      holeOf([missed(9, 'flat', 0, 2.5), missed(2.5, 'flat', 0, -0.4), made(0.4)], { strokes: 6, number: 2 }),
      holeOf([missed(9, 'flat'), missed(2.5, 'flat'), made(0.4)], { strokes: 6, number: 3 }),     // 멈춘 곳 기록 없음
      holeOf([made(3)], { number: 4 }),
    ];
    const t = buildPuttingDetail([roundOf(holes)]).threePutt;
    expect(t).toMatchObject({ holes: 3, known: 2, short: 1, long: 1, pinHigh: 0 });
  });
});

describe('SG — 투어 평균 대비', () => {
  it('거리대마다 퍼트 한 개짜리 SG 를 모으고, 값은 기준선 공식과 같다', () => {
    // 3m 에서 한 번에 넣었다: SG = E(3m) − 0 − 1
    const d = buildPuttingDetail([roundOf([holeOf([made(3)])])]);
    const expected = expectedStrokes('green', 3) - 1;
    const row = d.byDistance.find((b) => b.id === '3to5');
    expect(row.sgN).toBe(1);
    expect(row.sgPerPutt).toBeCloseTo(expected, 9);
  });

  it('두 퍼트: 첫 퍼트 SG = E(첫 거리) − E(남긴 거리) − 1', () => {
    const d = buildPuttingDetail([roundOf([holeOf([missed(6, 'flat', 0, -1), made(1)])])]);
    const first = d.byDistance.find((b) => b.id === 'gte5');
    expect(first.sgPerPutt).toBeCloseTo(expectedStrokes('green', 6) - expectedStrokes('green', 1) - 1, 9);
  });

  it('총합은 인사이트와 같은 계산(aggregateSG)이다', () => {
    const rounds = [roundOf([holeOf([missed(6, 'flat', 0, -1), made(1)]), holeOf([made(3)], { number: 2 })])];
    const sg = buildPuttingDetail(rounds).sg;
    const agg = aggregateSG(rounds);
    expect(sg.total).toBeCloseTo(agg.categories.putting.sg, 9);
    expect(sg.perRound).toBeCloseTo(agg.categories.putting.sg / agg.rounds, 9);
    expect(sg.measured).toBe(true);
  });

  it('퍼트 거리를 기록하지 않으면 측정하지 않는다', () => {
    const sg = buildPuttingDetail([roundOf([holeOf([{ distance: null, lie: 'flat', holein: 'fail' }, { distance: null, lie: 'flat', holein: 'success' }])])]).sg;
    expect(sg.measured).toBe(false);
    expect(sg.perRound).toBeNull();
  });
});

describe('미스 위치 과녁', () => {
  const holesOf = (stops, dist) => stops.map(([x, y], i) => holeOf([missed(dist, 'flat', x, y), made(0.3)], { number: i + 1 }));

  it(`미스가 ${MIN_MAP_MISSES}개 미만이면 enough 가 아니다`, () => {
    const d = buildPuttingDetail([roundOf(holesOf([[0.2, -0.5], [0.1, -0.7], [-0.2, -0.4]], 4))]);
    expect(d.missMap.all.enough).toBe(false);
    expect(d.missMap.all.n).toBe(3);
  });

  it('쏠림(평균 위치)과 흩어짐, 3m 안 · 밖으로 나눈 과녁', () => {
    const near = holesOf([[0.2, -0.5], [0.3, -0.4], [0.1, -0.6], [0.25, -0.45], [0.15, -0.55]], 2);
    const far = holesOf([[0.8, -2.0], [1.0, -2.5], [0.6, -1.8], [0.9, -2.2], [0.7, -2.1]], 8).map((h, i) => ({ ...h, holeNumber: 10 + i }));
    const d = buildPuttingDetail([roundOf([...near, ...far])]).missMap;
    expect(d.all.n).toBe(10);
    expect(d.near.n).toBe(5);
    expect(d.far.n).toBe(5);
    expect(d.near.mean.y).toBeCloseTo(-0.5, 6);
    expect(d.far.mean.y).toBeCloseTo(-2.12, 6);
    expect(d.near.q.short).toBe(5);
    expect(d.near.enough && d.far.enough).toBe(true);
    expect(d.all.scale.max).toBeGreaterThanOrEqual(3);       // 가장 멀리 멈춘 미스까지 눈금에 들어온다
    d.all.shots.forEach((s) => expect(Number.isFinite(s.x) && Number.isFinite(s.y)).toBe(true));
  });

  it('하이/로우사이드는 점마다 side 로 붙는다 (과녁에서 색으로 가른다)', () => {
    const rs = [[-0.4, 0.1], [0.4, 0.1]].map(([x, y], i) => holeOf([missed(5, 'break-right', x, y, { brk: 'hook' }), made(0.3)], { number: i + 1 }));
    const shots = buildPuttingDetail([roundOf(rs)]).missMap.all.shots;
    expect(shots.map((s) => s.side).sort()).toEqual(['high', 'low']);
  });
});

describe('빈 기록 · 깨진 기록', () => {
  it('라운드가 없어도 모든 묶음이 빈 값으로 나온다', () => {
    const d = buildPuttingDetail([]);
    expect(d.n.putts).toBe(0);
    expect(d.byDistance.every((b) => b.total === 0 && b.ratePct === null)).toBe(true);
    expect(d.missMap.all.enough).toBe(false);
    expect(d.pace.all.n).toBe(0);
    expect(d.lag).toEqual([]);
    expect(d.forScore).toEqual([]);
    expect(d.sg.measured).toBe(false);
  });

  it('거리 · 라이 · 미스 기록이 부분적으로 비어 있어도 던지지 않는다', () => {
    const holes = [
      holeOf([{ holein: 'fail' }, { holein: 'success' }]),
      holeOf([{ distance: -1, lie: [], holein: 'fail', miss: {} }, { distance: 'x', lie: ['uphill'], holein: 'success' }], { number: 2 }),
      holeOf([{ distance: 3, lie: 'mystery-lie', holein: 'fail', miss: { x: 1, y: 1, leave: 1.4, along: 'long', across: 'right' } }, made(1)], { number: 3 }),
    ];
    expect(() => buildPuttingDetail([roundOf(holes)])).not.toThrow();
    const d = buildPuttingDetail([roundOf(holes)]);
    expect(d.n.putts).toBe(6);
    expect(d.n.withLie).toBe(3);                                  // 알 수 없는 라이 id 도 칸이 없을 뿐 세어진다 — 'uphill' 한 개와 'mystery-lie'
  });
});
