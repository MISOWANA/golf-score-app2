// ─── 퍼팅 상세 분석 — 퍼트마다 거리 · 라이 · 미스 위치를 합쳐 본다 ───────────────────────────────────────
//
// 스코어 입력의 퍼팅 탭이 퍼트마다 받는 것: 거리 · 라이(경사 × 휨) · 결과, 그리고 공이 멈춘 곳(미스 위치 판).
//   · 멈춘 곳은 이번 퍼트의 라인(공 → 홀)을 위로 세운 좌표다 — x 오른쪽(+) · y 홀 너머(+, 롱). 퍼트마다 같은 방향 기준이라 모아서 겹쳐 볼 수 있다.
//   · 거리 · 라이 · 결과는 예전부터 있던 기록이고, 미스 위치는 새로 쌓이는 기록이라 없는 퍼트도 많다 — 있는 것만 센다.
// 이 모듈은 그 기록을 "내 퍼트가 어떻게 빗나가나"로 읽어 준다. 판정하지 않는다: 어느 쪽이 맞는 모습인지는 정하지 않고,
// 내 기록끼리의 비율 · 중앙값만 돌려준다 (투어 평균과 견주는 SG 만 예외 — strokesGained.js 의 기준선).
//
// 한 퍼트의 표본(sample)
//   made  이 퍼트로 홀인했나 · dist 퍼트 거리(m) · lie 라이 id · miss 멈춘 곳 기록(없을 수 있다) · leave 빗나간 뒤 남은 거리(m)
//   결과(holein)를 기록하지 않은 퍼트는 센 적이 없다 — 기존 퍼팅 성공률(shotStats.buildPuttingStats)과 같은 규칙이다.
//   그린 밖으로 나간 퍼트는 성공하지 못한 퍼트로 세고, 멈춘 곳 기록은 없다.
//   탭인으로 한 번에 기록한 마지막 퍼트(tapIn)는 라이를 '평지 직선'으로 가정한 값이라 라이별 표에서 뺀다 (거리별에는 센다).

import { puttLieId, decomposePuttLie, PUTT_DISTANCE_BUCKETS } from './shotStats.js';
import { PUTT_LIES, COMPOUND_LIES } from './puttMiss.js';
import { median, rateTier, distanceTier } from './stats.js';
import { buildHoleSG, aggregateSG, sgTier } from './strokesGained.js';
import { offGreenCount } from './offGreen.js';
import { summarizePattern, ringScale } from './shortGamePattern.js';

export const MIN_MAP_MISSES = 5;       // 미스 위치 과녁 · 평균 위치를 말하려면 필요한 미스 수
export const MIN_ROW = 3;              // 표의 한 줄(거리대 · 라이 · 경사)을 보여 주는 최소 퍼트 수
export const MIN_COMPARE = 5;          // 두 묶음을 견주는 한 줄을 말하려면 양쪽에 필요한 미스 수
export const MAP_SPLIT_M = 3;          // 미스 위치를 '가까운 퍼트'와 '먼 퍼트'로 가르는 퍼트 거리

const SLOPES = [['uphill', '오르막'], ['flat', '평지'], ['downhill', '내리막']];
const SHAPES = [['slice', '슬라이스'], ['straight', '직선'], ['hook', '훅'], ['scurve', 'S자']];
const SHAPE_LABEL = Object.fromEntries(SHAPES);
export const SLOPE_LABEL = Object.fromEntries(SLOPES);
const ALL_LIES = [...PUTT_LIES, ...COMPOUND_LIES];
const LIE_LABEL = Object.fromEntries(ALL_LIES.map((x) => [x.id, x.label.replace('\n', ' ')]));

const pct = (n, d) => (d > 0 ? (n / d) * 100 : null);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const positive = (v) => (num(v) != null && v > 0 ? v : null);

// 멈춘 곳 기록이 쓸 만한가 — 좌표 · 남은 거리 · 분류가 모두 있어야 한다
function validMiss(m) {
  if (!m || typeof m !== 'object') return null;
  if (num(m.x) == null || num(m.y) == null || positive(m.leave) == null) return null;
  if (!['short', 'long', 'pinHigh'].includes(m.along) || !['left', 'right', 'line'].includes(m.across)) return null;
  return m;
}

// 멈춘 곳이 어느 쪽에 더 가까운가 (가로 · 세로 중 더 먼 축) — 과녁의 쏠림 방향
export const quadrantOfStop = (x, y) => (Math.abs(y) >= Math.abs(x) ? (y >= 0 ? 'long' : 'short') : (x >= 0 ? 'right' : 'left'));

// ─── 표본 모으기 ───────────────────────────────────────────────────────────────────────────

// 홀마다 퍼트 기록(puttDetails)을 퍼트 표본 목록으로. holes[] 는 홀 단위 사실(퍼트 수 · 무엇을 위한 퍼트인가 등)이다.
export function collectPutts(rounds) {
  const putts = [];
  const holes = [];
  rounds.forEach((r) => {
    const p = r.players?.[0];
    (r.holes ?? []).forEach((h) => {
      const s = h.scores?.[p];
      if (!s || !Array.isArray(s.puttDetails)) return;
      const details = s.puttDetails;
      const nPutts = num(s.putts) ?? details.length;
      let first = null;
      details.forEach((d, i) => {
        if (!d || d.holein == null) return;     // 결과를 기록하지 않은 퍼트
        const made = d.holein === 'success';
        const dist = positive(d.distance);
        const lie = d.tapIn ? null : puttLieId(d.lie);
        const parts = lie != null ? decomposePuttLie(lie) : null;
        const miss = made || d.holein === 'offgreen' ? null : validMiss(d.miss);
        const nextDist = positive(details[i + 1]?.distance);
        const sample = {
          round: r.id, hole: h.holeNumber, par: h.par, idx: i, nPutts,
          made, off: d.holein === 'offgreen', dist, lie,
          slope: parts?.slope ?? null, brk: parts?.brk ?? null,
          miss, leave: made ? 0 : (d.holein === 'offgreen' ? null : (miss ? miss.leave : nextDist)),   // 그린 밖으로 나간 퍼트는 남은 거리를 모른다
          auto: d.distanceAuto === true, tapIn: d.tapIn === true,
        };
        putts.push(sample);
        if (i === 0) first = sample;
      });

      // 홀 단위 — 이 홀의 첫 퍼트가 무엇을 위한 퍼트였나 (그린에 올리는 데 쓴 타수로 센다)
      if (s.touched && first) {
        const strokes = num(s.strokes) ?? h.par;
        const toGreen = strokes - nPutts - offGreenCount(s);
        holes.push({
          round: r.id, hole: h.holeNumber, par: h.par, nPutts, first,
          forScore: toGreen >= 1 ? toGreen + 1 - h.par : null,       // 첫 퍼트가 들어가면 파 대비 몇 타 (−1 = 버디 퍼트)
        });
      }
    });
  });
  return { putts, holes };
}

// ─── 묶음 요약 ─────────────────────────────────────────────────────────────────────────────

const rate = (list) => {
  const made = list.filter((x) => x.made).length;
  return { made, total: list.length, ratePct: pct(made, list.length), tier: rateTier(made, list.length) };
};

// 빗나간 퍼트들의 앞뒤(롱 · 핀하이 · 숏) 몫과, 모자란 거리 · 지나친 거리의 중앙값
export function summarizePace(misses) {
  const list = misses.filter((x) => x.miss);
  const n = list.length;
  const count = (k) => list.filter((x) => x.miss.along === k).length;
  const short = count('short'), long = count('long'), pinHigh = count('pinHigh');
  const shortYs = list.filter((x) => x.miss.along === 'short').map((x) => Math.abs(x.miss.y));
  const longYs = list.filter((x) => x.miss.along === 'long').map((x) => x.miss.y);
  return {
    n, short, pinHigh, long,
    shortPct: pct(short, n), pinHighPct: pct(pinHigh, n), longPct: pct(long, n),
    shortMedian: median(shortYs), longMedian: median(longYs),
    leaveMedian: median(list.map((x) => x.miss.leave)),
    tier: rateTier(Math.max(short, long, pinHigh), n),
  };
}

// 과녁에 찍을 점들 — 멈춘 곳(x, y)과 그 퍼트의 거리
function missPattern(list) {
  const shots = list.filter((x) => x.miss).map((x) => ({
    x: x.miss.x, y: x.miss.y, dist: x.miss.leave, from: x.dist, side: x.miss.passSide ?? null,
    quadrant: quadrantOfStop(x.miss.x, x.miss.y), hour: null,
  }));
  return {
    ...summarizePattern(shots),
    shots,
    scale: ringScale(shots.length ? Math.max(...shots.map((s) => s.dist)) : 0),
    enough: shots.length >= MIN_MAP_MISSES,
  };
}

// ─── 퍼팅 상세 ─────────────────────────────────────────────────────────────────────────────

export function buildPuttingDetail(rounds) {
  const { putts, holes } = collectPutts(rounds);
  const misses = putts.filter((x) => x.miss);
  const notMade = putts.filter((x) => !x.made);

  // 거리별 — 성공률 · 빗나갔을 때 남기는 거리 · 이 거리의 퍼트가 투어 평균 대비 얼마나 득실인지(SG)
  const sgByDist = sgPuttSegments(rounds);
  const byDistance = PUTT_DISTANCE_BUCKETS.map((b) => {
    const inB = putts.filter((x) => x.dist != null && x.dist >= b.min && x.dist < b.max);
    const miss = inB.filter((x) => x.miss);
    const left = inB.filter((x) => !x.made && x.leave != null);          // 빗나간 뒤 남은 거리를 아는 퍼트 (멈춘 곳 기록 또는 다음 퍼트 거리)
    const sgs = sgByDist.filter((g) => g.dist >= b.min && g.dist < b.max);
    return {
      id: b.id, label: b.label, ...rate(inB),
      missN: miss.length, leaveN: left.length, leaveMedian: median(left.map((x) => x.leave)),
      sgN: sgs.length, sgTotal: sgs.reduce((a, g) => a + g.sg, 0), sgPerPutt: sgs.length ? sgs.reduce((a, g) => a + g.sg, 0) / sgs.length : null,
    };
  });

  // 미스 위치 과녁 — 전체 · 가까운 퍼트 · 먼 퍼트
  const near = misses.filter((x) => x.dist != null && x.dist <= MAP_SPLIT_M);
  const far = misses.filter((x) => x.dist != null && x.dist > MAP_SPLIT_M);
  const missMap = { all: missPattern(misses), near: missPattern(near), far: missPattern(far), splitM: MAP_SPLIT_M };

  // 거리감 — 롱 · 숏
  const paceAll = summarizePace(misses);
  const paceBySlope = SLOPES.map(([id, label]) => {
    const list = misses.filter((x) => x.slope === id);
    return { id, label, ...summarizePace(list) };
  }).filter((r) => r.n >= MIN_ROW);
  const paceByDist = [
    { id: 'p2', label: '~2m', min: 0, max: 2 }, { id: 'p5', label: '2-5m', min: 2, max: 5 }, { id: 'p5p', label: '5m+', min: 5, max: Infinity },
  ].map((z) => ({ id: z.id, label: z.label, ...summarizePace(misses.filter((x) => x.dist != null && x.dist >= z.min && x.dist < z.max)) })).filter((r) => r.n >= MIN_ROW);

  // 라인 — 좌우 · 하이/로우사이드
  const acrossCount = (list, k) => list.filter((x) => x.miss.across === k).length;
  const straight = misses.filter((x) => x.brk === 'straight');
  const sided = misses.filter((x) => x.miss.passSide === 'high' || x.miss.passSide === 'low');
  const sideRow = (list) => {
    const high = list.filter((x) => x.miss.passSide === 'high').length;
    const low = list.filter((x) => x.miss.passSide === 'low').length;
    const n = high + low;
    return { n, high, low, highPct: pct(high, n), lowPct: pct(low, n) };
  };
  const line = {
    across: { n: misses.length, left: acrossCount(misses, 'left'), line: acrossCount(misses, 'line'), right: acrossCount(misses, 'right') },
    straight: { n: straight.length, left: acrossCount(straight, 'left'), line: acrossCount(straight, 'line'), right: acrossCount(straight, 'right') },
    side: sideRow(sided),
    byShape: ['hook', 'slice', 'scurve'].map((k) => ({ id: k, label: SHAPE_LABEL[k], ...sideRow(sided.filter((x) => x.brk === k)) })).filter((r) => r.n >= MIN_ROW),
  };

  // 라이별 — 15칸(기본 9 + 복합 6)과 경사 · 휨 합계. 탭인은 라이를 몰라서 이미 lie 가 없다.
  const withLie = putts.filter((x) => x.lie != null);
  const cell = (id) => {
    const inC = withLie.filter((x) => x.lie === id);
    const miss = inC.filter((x) => x.miss);
    return { id, label: LIE_LABEL[id], ...rate(inC), missN: miss.length, distMedian: median(inC.map((x) => x.dist).filter((d) => d != null)), pace: summarizePace(miss) };
  };
  const byLie = {
    n: withLie.length,
    cells: PUTT_LIES.map((x) => cell(x.id)),
    compound: COMPOUND_LIES.map((x) => cell(x.id)).filter((c) => c.total > 0),
    bySlope: SLOPES.map(([id, label]) => ({ id, label, ...rate(withLie.filter((x) => x.slope === id)) })),
    byBreak: SHAPES.map(([id, label]) => ({ id, label, ...rate(withLie.filter((x) => x.brk === id)) })).filter((r) => r.id !== 'scurve' || r.total > 0),
  };

  // 첫 퍼트 붙이기 — 시작 거리별로 얼마나 붙였나 · 몇 퍼트로 끝났나
  const firsts = holes.map((h) => h.first).filter((f) => f.dist != null);
  const LAG_ZONES = [
    { id: 'lag3', label: '~3m', min: 0, max: 3 }, { id: 'lag6', label: '3-6m', min: 3, max: 6 },
    { id: 'lag10', label: '6-10m', min: 6, max: 10 }, { id: 'lag10p', label: '10m+', min: 10, max: Infinity },
  ];
  const lag = LAG_ZONES.map((z) => {
    const inZ = firsts.filter((f) => f.dist >= z.min && f.dist < z.max);
    const leaves = inZ.filter((f) => !f.made && f.leave != null);
    const known = inZ.filter((f) => f.made || f.leave != null);
    const within1 = known.filter((f) => f.made || f.leave <= 1).length;
    return {
      id: z.id, label: z.label, n: inZ.length,
      onePuttPct: pct(inZ.filter((f) => f.made).length, inZ.length),
      threePuttPct: pct(inZ.filter((f) => f.nPutts >= 3).length, inZ.length),
      leaveN: leaves.length, leaveMedian: median(leaves.map((f) => f.leave)),
      leaveRatioMedian: median(leaves.map((f) => f.leave / f.dist)),
      within1Pct: pct(within1, known.length), within1N: known.length,
      tier: distanceTier(leaves.map((f) => f.leave)),
    };
  }).filter((r) => r.n >= MIN_ROW);

  // 컴백 퍼트 — 첫 퍼트를 빗나간 뒤 남은 2m 이내 퍼트
  const comebackList = putts.filter((x) => x.idx > 0 && x.dist != null && x.dist <= 2);
  const comeback = { ...rate(comebackList) };

  // 무엇을 위한 퍼트인가 — 첫 퍼트가 들어가면 버디 · 파 · 보기였나
  const FOR = [['birdie', '버디 퍼트', (v) => v <= -1], ['par', '파 퍼트', (v) => v === 0], ['bogey', '보기 이상 퍼트', (v) => v >= 1]];
  const forScore = FOR.map(([id, label, test]) => {
    const list = holes.filter((h) => h.forScore != null && test(h.forScore)).map((h) => h.first);
    return { id, label, ...rate(list), distMedian: median(list.map((f) => f.dist).filter((d) => d != null)) };
  }).filter((r) => r.total > 0);

  // 3퍼트 홀 — 첫 퍼트가 어떻게 빗나갔나
  const three = holes.filter((h) => h.nPutts >= 3);
  const threeFirst = three.map((h) => h.first).filter((f) => f.miss);
  const threePutt = {
    holes: three.length, known: threeFirst.length,
    short: threeFirst.filter((f) => f.miss.along === 'short').length,
    long: threeFirst.filter((f) => f.miss.along === 'long').length,
    pinHigh: threeFirst.filter((f) => f.miss.along === 'pinHigh').length,
    leaveMedian: median(three.map((h) => h.first.leave).filter((v) => v != null && v > 0)),
  };

  // 투어 평균 대비 SG — 라운드당 합계는 인사이트와 같은 계산(aggregateSG)
  const agg = aggregateSG(rounds);
  const bp = agg.categories.putting;
  const sg = {
    measured: bp.segments > 0,
    total: bp.sg, strokes: bp.strokes, rounds: agg.rounds,
    perRound: bp.segments > 0 ? bp.sg / Math.max(1, agg.rounds) : null,
    tier: sgTier(bp.strokes),
  };

  return {
    n: {
      putts: putts.length, withDistance: putts.filter((x) => x.dist != null).length, withLie: withLie.length,
      withMiss: misses.length, notMade: notMade.length, holes: holes.length,
    },
    byDistance, missMap,
    pace: { all: paceAll, bySlope: paceBySlope, byDistance: paceByDist },
    line, byLie, lag, comeback, forScore, threePutt, sg,
  };
}

// 퍼트 한 개짜리 SG 구간 — 앞뒤 거리를 모두 아는 퍼트만 (사이에 모르는 거리가 끼어 묶인 구간은 한 퍼트의 값이 아니라서 뺀다)
function sgPuttSegments(rounds) {
  const out = [];
  rounds.forEach((r) => {
    const p = r.players?.[0];
    (r.holes ?? []).forEach((h) => {
      buildHoleSG(h, p).segments.forEach((seg) => {
        if (seg.category === 'putting' && seg.strokes === 1 && seg.startDist != null) out.push({ dist: seg.startDist, sg: seg.sg });
      });
    });
  });
  return out;
}
