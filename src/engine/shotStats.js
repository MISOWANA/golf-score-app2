// ─── 샷 상세 통계 (기획서 §3) ──────────────────────────────────────────────────
// 티샷 편향, 어프로치 근접도, 퍼팅 성공률, 스크램블링, 라이→GIR 교차표.
// 클럽 거리 역산(클럽별 잔여거리 델타)은 clubDistance.js, 스코어 5단계 분해는
// scoreBreakdown.js. 여기는 그 외 "관찰 지표" 집계를 모은다.

import { extractClubShots } from './clubDistance.js';
import { median, iqr, rateTier, distanceTier } from './stats.js';
import { offGreenCount } from './offGreen.js';
import { AWFUL_POINTS } from './bookBenchmarks.js';

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
      if (last.fromDistance == null) return;   // 어느 거리에서 친 샷인지 모르면 구간에 넣을 수 없다
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

// 어프로치 근접도 — 전체 샷 기준 (책 p.14). 위 근접도는 그린에 올린 샷만 세서, 그린을 놓친
// 샷까지 센 책의 지표보다 좋게 나온다. 여기서는 어프로치 뒤 핀까지 남은 거리를 그대로 쓴다:
//   · 그린에 올렸으면 첫 퍼트 거리
//   · 못 올렸으면 바로 다음 샷의 남은 거리 (다음 샷이 곧바로 이어진 경우만)
// 어느 쪽도 기록되지 않았거나 벌타로 멈춘 자리가 불확실한 샷은 뺀다 (extractClubShots 규칙).
// par 3 티샷은 체인에 없어 들어가지 않는다.
export function buildApproachProximityAll(rounds, windowSize = 20) {
  const samples = APPROACH_BUCKETS.map(b => ({ ...b, ends: [] }));

  rounds.slice(0, windowSize).forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s) return;
      const chain = extractClubShots(h, p);
      chain.forEach((shot, i) => {
        if (shot.fromDistance == null) return;
        const next = chain[i + 1];
        let end = null;
        if (next) {
          if (next.shotNo === shot.shotNo + 1) end = next.fromDistance;
        } else if (shot.onGreen === true) {
          end = s.puttDetails?.[0]?.distance ?? null;
        }
        if (end == null) return;
        const bucket = samples.find(b => shot.fromDistance >= b.min && shot.fromDistance < b.max);
        if (bucket) bucket.ends.push(end);
      });
    });
  });

  return samples.map(b => ({
    id: b.id, label: b.label, n: b.ends.length,
    median: median(b.ends),
    tier: distanceTier(b.ends),
  }));
}

// ─── GIRP (책 p.26) ───────────────────────────────────────────────────────────
// 그린 또는 프린지에 규정 타수 + 1타 이내로 도달한 홀. GIR(파 − 2타 이내)보다 한 타 더 허용해서
// 보기 플레이 골퍼도 의미 있는 숫자가 나온다. 그린까지 쓴 타수 = 스코어 − 퍼트 − 퍼트 뒤 칩.
// 프린지는 따로 기록하지 않아 그린에 올린 홀만 센다. 직접 고른 GIR 표시는 GIRP에 포함한다 —
// GIRP는 늘 GIR 이상이다. 입력한(touched) 홀만 센다 (입력 없이 저장된 파는 도달 여부를 모른다).
export function isGirp(score, par) {
  if (score?.gir === true) return true;
  const strokes = score?.strokes ?? par;
  const putts = score?.putts ?? 2;
  const chips = Array.isArray(score?.offGreen) ? offGreenCount(score) : 0;
  return strokes - putts - chips <= par - 1;
}

export function buildGirp(rounds) {
  let holes = 0, girp = 0;
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s || !s.touched) return;
      holes++;
      if (isGirp(s, h.par)) girp++;
    });
  });
  // 18홀로 환산 — 일부 홀만 입력한 라운드나 여러 라운드 평균을 같은 눈금으로 본다
  return { holes, girp, per18: holes > 0 ? (girp / holes) * 18 : null };
}

// ─── 끔찍한 샷 점수 (책 p.26, 페널티 기준 근사) ────────────────────────────────
// OB 2점 · 해저드/언플레이어블 1점. 뒤땅·토핑 같은 미스샷은 기록하지 않아 빠지므로 실제
// 점수는 이보다 높을 수 있다 — 책의 기준(6점)은 '이 점수만으로도 넘었는가'의 하한으로 본다.
// OB·해저드·언플 횟수는 인사이트 화면의 이벤트 칩과 같은 필드를 쓴다.
export function buildAwfulShots(rounds) {
  const perRound = rounds.map(r => {
    const p = r.players[0];
    let ob = 0, hazard = 0, unplayable = 0, score = 0;
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s) return;
      ob += s.ob ?? 0;
      hazard += s.hazard ?? 0;
      unplayable += s.unplayable ?? 0;
      score += s.strokes ?? h.par;
    });
    return { ob, hazard, unplayable, score, points: ob * AWFUL_POINTS.ob + hazard * AWFUL_POINTS.hazard + unplayable * AWFUL_POINTS.unplayable };
  });
  const n = perRound.length;
  const sum = (k) => perRound.reduce((a, r) => a + r[k], 0);
  return {
    rounds: n,
    ob: sum('ob'), hazard: sum('hazard'), unplayable: sum('unplayable'),
    points: sum('points'),
    avgPoints: n > 0 ? sum('points') / n : null,
    avgScore: n > 0 ? sum('score') / n : null,
  };
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
        if (i === 0 && putt.distance >= 5 && putt.holein !== 'offgreen' && putts[1]?.distance != null) {
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
