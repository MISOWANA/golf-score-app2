// ─── 샷 상세 통계 (기획서 §3) ──────────────────────────────────────────────────
// 티샷 편향, 어프로치 근접도, 퍼팅 성공률, 스크램블링, 라이→GIR 교차표.
// 클럽 거리 역산(클럽별 잔여거리 델타)은 clubDistance.js, 스코어 5단계 분해는
// scoreBreakdown.js. 여기는 그 외 "관찰 지표" 집계를 모은다.

import { extractClubShots } from './clubDistance.js';
import { median, iqr, rateTier, distanceTier } from './stats.js';

// ─── §3-5 티샷 좌우 편향 ───────────────────────────────────────────────────────
// 편향지수 = (R횟수 - L횟수) / (L+C+R). par>3 홀의 페어웨이 랜딩 칩만 사용.
// §5-4: 최근 10라운드 롤링 (rounds[0]이 최신 라운드).
export function buildTeeBias(rounds, windowSize = 10) {
  let L = 0, C = 0, R = 0, G = 0;
  rounds.slice(0, windowSize).forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      if (h.par <= 3) return;
      const s = h.scores?.[p];
      if (!s || !s.touched) return;
      if (s.teeGIR === true) { G++; return; }
      if (s.fairwayHit === 'L') L++;
      else if (s.fairwayHit === 'R') R++;
      else if (s.fairwayHit === 'C') C++;
    });
  });
  const total = L + C + R;
  const biasIndex = total > 0 ? (R - L) / total : 0;
  return { L, C, R, G, total, biasIndex };
}

// ─── §3-2 어프로치 근접도 (거리구간 × PUTT1 잔여거리) ─────────────────────────
const APPROACH_BUCKETS = [
  { id: 'lt80',    label: '~80m',    min: 0,   max: 80 },
  { id: '80to110', label: '80-110m', min: 80,  max: 110 },
  { id: '110to140',label: '110-140m',min: 110, max: 140 },
  { id: '140to170',label: '140-170m',min: 140, max: 170 },
  { id: 'gte170',  label: '170m+',   min: 170, max: Infinity },
];

// §5-4: 최근 20라운드 롤링 (rounds[0]이 최신 라운드).
export function buildApproachProximity(rounds, windowSize = 20) {
  const samples = APPROACH_BUCKETS.map(b => ({ ...b, proximities: [] }));

  rounds.slice(0, windowSize).forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s) return;
      const chain = extractClubShots(h, p);
      if (chain.length === 0) return;
      const last = chain[chain.length - 1];
      // 마지막 "유효한"(거리 필터 통과) 샷이 그린에 도달했을 때만 근접도 유효
      // (extractClubShots가 이미 각 체인 항목에 onGreen을 실어준다).
      if (last.onGreen !== true) return;
      const puttDistance = s.puttDetails?.[0]?.distance;
      if (puttDistance == null) return;
      const bucket = samples.find(b => last.fromDistance >= b.min && last.fromDistance < b.max);
      if (bucket) bucket.proximities.push(puttDistance);
    });
  });

  return samples.map(b => ({
    id: b.id, label: b.label, n: b.proximities.length,
    median: median(b.proximities),
    iqr: iqr(b.proximities),
    tier: distanceTier(b.proximities),
  }));
}

// ─── §3-3 퍼팅 성공률 (거리 / 세로경사 / 좌우브레이크 — 3개의 1축 분해) ────────
const PUTT_DISTANCE_BUCKETS = [
  { id: 'lt1',   label: '~1m',  min: 0, max: 1 },
  { id: '1to2',  label: '1-2m', min: 1, max: 2 },
  { id: '2to3',  label: '2-3m', min: 2, max: 3 },
  { id: '3to5',  label: '3-5m', min: 3, max: 5 },
  { id: 'gte5',  label: '5m+',  min: 5, max: Infinity },
];

function decomposePuttLie(lieId) {
  if (!lieId || lieId === 'flat') return { slope: 'flat', brk: 'straight' };
  const slope = lieId.includes('uphill') ? 'uphill' : lieId.includes('downhill') ? 'downhill' : 'flat';
  const brk = lieId.includes('break-left') ? 'slice' : lieId.includes('break-right') ? 'hook' : 'straight';
  return { slope, brk };
}

const SLOPE_LABEL = { uphill: '오르막', flat: '평지', downhill: '내리막' };
const BREAK_LABEL = { slice: '슬라이스', straight: '직선', hook: '훅' };

export function buildPuttingStats(rounds) {
  const byDistance = PUTT_DISTANCE_BUCKETS.map(b => ({ ...b, made: 0, total: 0 }));
  const bySlope = { uphill: { made: 0, total: 0 }, flat: { made: 0, total: 0 }, downhill: { made: 0, total: 0 } };
  const byBreak = { slice: { made: 0, total: 0 }, straight: { made: 0, total: 0 }, hook: { made: 0, total: 0 } };
  const ratioSamples = []; // §3-4 롱퍼트 잔여거리 비율 (PUTT1 5m+)

  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const putts = h.scores?.[p]?.puttDetails;
      if (!Array.isArray(putts)) return;
      putts.forEach((putt, i) => {
        if (putt.holein == null) return;
        const made = putt.holein === 'success';
        if (putt.distance != null) {
          const bucket = byDistance.find(b => putt.distance >= b.min && putt.distance < b.max);
          if (bucket) { bucket.total++; if (made) bucket.made++; }
        }
        if (putt.lie != null) {
          const { slope, brk } = decomposePuttLie(putt.lie);
          bySlope[slope].total++; if (made) bySlope[slope].made++;
          byBreak[brk].total++; if (made) byBreak[brk].made++;
        }
        if (i === 0 && putt.distance >= 5 && putts[1]?.distance != null) {
          ratioSamples.push(putts[1].distance / putt.distance);
        }
      });
    });
  });

  const rate = (o) => o.total > 0 ? (o.made / o.total) * 100 : null;

  return {
    byDistance: byDistance.map(b => ({ id: b.id, label: b.label, made: b.made, total: b.total, ratePct: rate(b), tier: rateTier(b.made, b.total) })),
    bySlope: Object.entries(bySlope).map(([k, v]) => ({ id: k, label: SLOPE_LABEL[k], made: v.made, total: v.total, ratePct: rate(v), tier: rateTier(v.made, v.total) })),
    byBreak: Object.entries(byBreak).map(([k, v]) => ({ id: k, label: BREAK_LABEL[k], made: v.made, total: v.total, ratePct: rate(v), tier: rateTier(v.made, v.total) })),
    longPuttRatio: ratioSamples.length > 0 ? median(ratioSamples) : null,
    longPuttN: ratioSamples.length,
  };
}

// ─── §3-7 스크램블링 (GIR 실패 후 파 이상 세이브율) ───────────────────────────
export function buildScrambling(rounds) {
  let attempts = 0, saves = 0;
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s || !s.touched || s.gir !== false) return;
      attempts++;
      if ((s.strokes ?? h.par) - h.par <= 0) saves++;
    });
  });
  return { attempts, saves, ratePct: attempts > 0 ? (saves / attempts) * 100 : null, tier: rateTier(saves, attempts) };
}

// ─── GIR 성공 후 버디 이상 전환율 (스크램블링의 대응 지표, GIR 성공 홀이 분모) ──
export function buildGirConversion(rounds) {
  let attempts = 0, made = 0;
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s || !s.touched || s.gir !== true) return;
      attempts++;
      if ((s.strokes ?? h.par) - h.par <= -1) made++;
    });
  });
  return { attempts, made, ratePct: attempts > 0 ? (made / attempts) * 100 : null, tier: rateTier(made, attempts) };
}

// ─── 어프로치 라이별 GIR 도달률 (§3-6 계열, 9분면 라이 단순화) ─────────────────
export function buildLieGirStats(rounds) {
  const byLie = {};
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s) return;
      extractClubShots(h, p).forEach((shot, i, chain) => {
        if (!shot.lie) return;
        const isLast = i === chain.length - 1;
        const reached = isLast && shot.onGreen === true;
        const key = shot.lie;
        if (!byLie[key]) byLie[key] = { made: 0, total: 0 };
        byLie[key].total++;
        if (reached) byLie[key].made++;
      });
    });
  });
  return Object.entries(byLie).map(([lie, v]) => ({
    lie, made: v.made, total: v.total,
    ratePct: v.total > 0 ? (v.made / v.total) * 100 : null,
    tier: rateTier(v.made, v.total),
  })).sort((a, b) => b.total - a.total);
}
