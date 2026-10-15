import { analyzePutts, summarizePuttCauses, puttDistanceCoverage, PUTT_THRESHOLD } from './puttAnalysis.js';

// ─── Individual metric getters ───────────────────────────────────────────────

export function getScoreToPar(h) {
  return h.score - h.par;
}

export function getHasPenalty(h) {
  return (h.obCount ?? 0) > 0 || (h.hazardCount ?? 0) > 0 || (h.unplayableCount ?? 0) > 0;
}

export function getTotalPenaltyStrokes(h) {
  // OB 1회 = 페널티 1타 + 재샷 1타, 해저드·언플레이어블 1회 = 페널티 1타
  // (ScoringView.calcAutoStrokes / scoreBreakdown.js와 동일한 모델).
  return (h.obCount ?? 0) * 2 + (h.hazardCount ?? 0) + (h.unplayableCount ?? 0);
}

export function getPuttCategory(h) {
  const p = h.putts;
  if (p == null) return 'two_putt';
  if (p === 0)   return 'no_putt';
  if (p === 1)   return 'one_putt';
  if (p === 2)   return 'two_putt';
  return 'three_putt_plus';
}

export function getScoreCategory(h) {
  if (h.score === 1) return 'hole_in_one';
  const d = h.score - h.par;
  if (d <= -3) return 'albatross';
  if (d === -2) return 'eagle';
  if (d === -1) return 'birdie';
  if (d ===  0) return 'par';
  if (d ===  1) return 'bogey';
  if (d ===  2) return 'double';
  return 'triple_plus';
}

export function getTeeMissCategory(h) {
  if (h.par === 3) return 'not_applicable';
  const { teeShotShape, fairwayHit, landingPoint } = h;
  if (teeShotShape === 'hook')  return 'severe_left';
  if (teeShotShape === 'slice') return 'severe_right';
  if (fairwayHit === false) {
    if (landingPoint === 'L') return 'miss_left';
    if (landingPoint === 'R') return 'miss_right';
    return 'miss_unknown';
  }
  return 'fairway';
}

export function getGIRResultCategory(h) {
  const putts = h.putts ?? 2;
  if (h.gir === true) {
    if (putts === 1) return 'gir_one_putt';
    if (putts === 2) return 'gir_two_putt';
    return 'gir_three_plus';
  }
  return (h.score - h.par) <= 0 ? 'no_gir_save' : 'no_gir_bogey_plus';
}

export function getRecoveryCategory(h) {
  const diff       = h.score - h.par;
  const hasPenalty = getHasPenalty(h);
  if (h.gir === false && !hasPenalty && diff <= 0)  return 'full_recovery';
  if (hasPenalty && diff <= 1)                      return 'partial_recovery';
  if (h.gir === false && !hasPenalty && diff === 1) return 'partial_recovery';
  return 'no_recovery';
}

export function getDamageCategory(h) {
  const diff    = h.score - h.par;
  const penalty = getTotalPenaltyStrokes(h);
  if (diff <= 0 && penalty === 0) return 'clean';
  if (diff <= 1 && penalty <= 1)  return 'minor';
  if (diff <= 2 && penalty <= 2)  return 'major';
  return 'catastrophic';
}

const fmM = (d) => (d == null ? '' : `${Number.isInteger(d) ? d : d.toFixed(1)}m`);
const PEN_TYPE_LABEL = { ob: 'OB', hazard: '해저드', unplayable: '언플레이어블' };

// ─── 홀 단위 파생 지표 ─────────────────────────────────────────────────────────
// 퍼트 원인·근접도·페널티 위치(티샷/어프로치) 같은 '거리·샷 단위' 지표를 여기서 만든다.
// 입력(h)에 puttDetails·penalties 같은 선택 필드가 없으면 해당 지표는 판단 보류(null)다.

export function buildDerivedHoleMetrics(h) {
  const T = PUTT_THRESHOLD;
  const scoreToPar = getScoreToPar(h);
  const hasPenalty = getHasPenalty(h);
  const pa = analyzePutts({ putts: h.putts, puttDetails: h.puttDetails });

  // 퍼트
  const firstDist = pa.firstDistance;
  const leaveDist = pa.leaveDistance;
  const girTrue = h.gir === true;
  const approachClose = girTrue && firstDist != null && firstDist <= T.closeGirM;
  const approachFar = girTrue && firstDist != null && firstDist >= T.farGirM;
  const birdieChanceMissed = girTrue && firstDist != null && firstDist <= T.closeGirM && (h.putts ?? 0) >= 2 && scoreToPar >= 0;

  // 페널티 위치 — penalties 배열(샷별 기록)이 있을 때만 티샷/어프로치를 구분한다
  const pens = Array.isArray(h.penalties) ? h.penalties : [];
  const penaltySlotKnown = pens.length > 0;
  const teePenalty = penaltySlotKnown ? pens.some(p => p.slot === 0) : null;
  const approachPenalty = penaltySlotKnown ? pens.some(p => p.slot >= 1) : null;
  const obForwardCount = pens.filter(p => p.type === 'ob' && p.mode === 'forward').length;
  const obReplayCount = pens.filter(p => p.type === 'ob' && p.mode === 'replay').length;
  const penaltyEvents = (h.obCount ?? 0) + (h.hazardCount ?? 0) + (h.unplayableCount ?? 0);
  const firstApproachPenalty = pens.filter(p => p.slot >= 1).sort((a, b) => a.slot - b.slot)[0] ?? null;
  const penaltyTypeLabel = firstApproachPenalty ? (PEN_TYPE_LABEL[firstApproachPenalty.type] ?? '페널티') : '페널티';

  const teePens = pens.filter(p => p.slot === 0);
  const teePenaltyTypeLabel = [...new Set(teePens.map(p => PEN_TYPE_LABEL[p.type] ?? '페널티'))].join('·') || '페널티';
  const teeClub = h.teeClub ?? null;
  const driverPenalty = teePenalty === true && teeClub === 'driver';
  const teePenaltyNonDriver = teePenalty === true && teeClub != null && teeClub !== 'driver';

  const putts = h.putts ?? null;
  const offGreenChips = h.offGreenChips ?? 0;
  // 온그린까지 타수 — 그린 밖으로 나간 퍼트 뒤에 다시 친 칩은 온그린 이후의 샷이다
  const onGreenStrokes = putts != null && putts > 0 ? h.score - putts - offGreenChips : null;

  const teeMiss = getTeeMissCategory(h);
  const fairwayHole = h.par >= 4;
  const fairwayGood = fairwayHole && (teeMiss === 'fairway') && h.fairwayHit === true;

  const memo = typeof h.memo === 'string' ? h.memo.trim() : '';
  const ctxBits = [];
  if (fairwayGood) ctxBits.push('페어웨이 안착');
  if (girTrue) ctxBits.push('그린 적중');
  const threePuttPrefix = ctxBits.length ? `${ctxBits.join('·')} 후 ` : '';

  return {
    scoreToPar,
    hasPenalty,
    totalPenaltyStrokes: getTotalPenaltyStrokes(h),
    puttCategory:        getPuttCategory(h),
    scoreCategory:       getScoreCategory(h),
    teeMissCategory:     teeMiss,
    girResultCategory:   getGIRResultCategory(h),
    recoveryCategory:    getRecoveryCategory(h),
    damageCategory:      getDamageCategory(h),
    parType:             `par${h.par}`,

    // ── 퍼팅 원인 (퍼트 거리 기반) ──
    puttCause:           pa.cause,                 // null | lag | short | both | mid | close | unknown
    puttConfidence:      pa.confidence,            // measured | inferred | none
    puttCauseLabel:      pa.causeLabel ?? '',
    puttCauseDetail:     pa.detail ?? '',
    puttCauseAdvice:     pa.advice ?? '',
    puttLine:            pa.line,
    threePuttPrefix,
    puttLineSuffix:      pa.hasDistance ? `(퍼트 ${pa.line})` : '',
    puttDistRecorded:    pa.hasDistance,
    firstPuttDist:       firstDist,
    firstPuttDistStr:    fmM(firstDist),
    leaveDist,
    leaveDistStr:        fmM(leaveDist),
    longPuttMade:        pa.longMade,
    lagGreat:            pa.lagGreat,
    approachClose,
    approachFar,
    birdieChanceMissed,
    upAndDown:           h.gir === false && scoreToPar <= 0 && putts === 1 && !hasPenalty,
    chipIn:              (putts === 0 || h.offGreenChipIn === true) && h.score > 1,
    offGreenPutt:        offGreenChips > 0,
    offGreenChips,
    offGreenChipIn:      h.offGreenChipIn === true,
    shortGameFail:       h.gir === false && scoreToPar >= 1 && !hasPenalty && (putts ?? 2) >= 2,

    // ── 페널티 위치 ──
    penaltyEvents,
    penaltySlotKnown,
    teePenalty,
    approachPenalty,
    teeClub,
    driverPenalty,
    teePenaltyNonDriver,
    obForwardCount,
    obReplayCount,
    penaltyTypeLabel,
    teePenaltyTypeLabel,

    // ── 샷 구성 ──
    onGreenStrokes,
    par5TwoOn: h.par === 5 && onGreenStrokes != null && onGreenStrokes <= 2,
    driveOnGreen: h.par >= 4 && h.teeGIR === true,
    fairwayGood,
    fairwayGoodBogey: fairwayGood && scoreToPar >= 1 && !hasPenalty,
    fairwayGoodThreePutt: fairwayGood && scoreToPar >= 1 && !hasPenalty && (putts ?? 2) >= 3,
    fairwayGoodNoGreen: fairwayGood && scoreToPar >= 1 && !hasPenalty && h.gir === false && (putts ?? 2) < 3,
    roughSave: fairwayHole && h.fairwayHit === false && !hasPenalty && scoreToPar <= 0,

    hasMemo: memo.length > 0,
    memoShort: memo.length > 40 ? `${memo.slice(0, 40)}…` : memo,
  };
}

// ─── Round aggregates ────────────────────────────────────────────────────────

export function buildRoundMetrics(holes) {
  const holeCount = holes.length;
  if (holeCount === 0) return null;

  const metrics = holes.map(h => ({ h, m: buildDerivedHoleMetrics(h) }));
  const safe = (n, d) => d === 0 ? 0 : n / d;

  const totalScore = holes.reduce((s, h) => s + h.score, 0);
  const totalPar   = holes.reduce((s, h) => s + h.par, 0);

  const birdieCount     = metrics.filter(x => x.m.scoreCategory === 'birdie').length;
  const parCount        = metrics.filter(x => x.m.scoreCategory === 'par').length;
  const bogeyCount      = metrics.filter(x => x.m.scoreCategory === 'bogey').length;
  const doubleCount     = metrics.filter(x => x.m.scoreCategory === 'double').length;
  const triplePlusCount = metrics.filter(x => x.m.scoreCategory === 'triple_plus').length;

  const girCount          = holes.filter(h => h.gir === true).length;
  const fairwayHoles      = holes.filter(h => h.par >= 4);
  const fairwayRecorded   = fairwayHoles.filter(h => h.fairwayHit != null);
  const fairwayHitCount   = fairwayRecorded.filter(h => h.fairwayHit === true).length;

  const totalPutts      = holes.reduce((s, h) => s + (h.putts ?? 2), 0);
  const onePuttCount    = metrics.filter(x => x.m.puttCategory === 'one_putt').length;
  const threePuttCount  = metrics.filter(x => x.m.puttCategory === 'three_putt_plus').length;
  const fourPuttCount   = holes.filter(h => (h.putts ?? 0) >= 4).length;

  // 3퍼트 원인 분포 (퍼트 거리 기준)
  const causes = summarizePuttCauses(holes.map(h => analyzePutts({ putts: h.putts, puttDetails: h.puttDetails })));
  const coverage = puttDistanceCoverage(holes.map(h => ({ putts: h.putts, puttDetails: h.puttDetails })));

  const totalOB          = holes.reduce((s, h) => s + (h.obCount ?? 0), 0);
  const totalHazard      = holes.reduce((s, h) => s + (h.hazardCount ?? 0), 0);
  const totalUnplayable  = holes.reduce((s, h) => s + (h.unplayableCount ?? 0), 0);
  const holesWithOB      = holes.filter(h => (h.obCount ?? 0) > 0).length;
  const holesWithPenalty = metrics.filter(x => x.m.hasPenalty).length;
  const penaltyStrokes   = holes.reduce((s, h) => s + getTotalPenaltyStrokes(h), 0);

  const par3 = holes.filter(h => h.par === 3);
  const par4 = holes.filter(h => h.par === 4);
  const par5 = holes.filter(h => h.par === 5);
  const avgDiff = arr =>
    arr.length === 0 ? 0 : arr.reduce((s, h) => s + (h.score - h.par), 0) / arr.length;

  const misses          = holes.map(h => h.greenMissDirection).filter(Boolean);
  const greenMissTotal  = misses.length;
  const greenMissLeft   = misses.filter(d => d === 'left').length;
  const greenMissRight  = misses.filter(d => d === 'right').length;
  const greenMissShort  = misses.filter(d => d === 'short').length;
  const greenMissLong   = misses.filter(d => d === 'long').length;

  const teeMetrics        = metrics.map(x => x.m.teeMissCategory);
  const sliceCount        = teeMetrics.filter(t => t === 'severe_right').length;
  const hookCount         = teeMetrics.filter(t => t === 'severe_left').length;
  const teeMissRightCount = teeMetrics.filter(t => t === 'miss_right' || t === 'severe_right').length;
  const teeMissLeftCount  = teeMetrics.filter(t => t === 'miss_left'  || t === 'severe_left').length;

  const half = Math.floor(holeCount / 2);
  const frontNineScoreToPar = holes.slice(0, half).reduce((s, h) => s + (h.score - h.par), 0);
  const backNineScoreToPar  = holes.slice(half).reduce((s, h)  => s + (h.score - h.par), 0);

  const recoveryCount     = metrics.filter(x => x.m.recoveryCategory !== 'no_recovery').length;
  const catastrophicCount = metrics.filter(x => x.m.damageCategory === 'catastrophic').length;

  // ── 샷·퍼트 상세 기반 지표 ──
  const scrambleAttempts = holes.filter(h => h.gir === false).length;
  const scrambleSaves    = holes.filter(h => h.gir === false && (h.score - h.par) <= 0).length;
  const girConvertAttempts = girCount;
  const girBirdieCount   = holes.filter(h => h.gir === true && (h.score - h.par) <= -1).length;
  const lagGreatCount    = metrics.filter(x => x.m.lagGreat).length;
  const longPuttMadeCount = metrics.filter(x => x.m.longPuttMade).length;
  const birdieChanceMissedCount = metrics.filter(x => x.m.birdieChanceMissed).length;
  const approachCloseCount = metrics.filter(x => x.m.approachClose).length;
  const driverPenaltyCount = metrics.filter(x => x.m.driverPenalty).length;
  const teePenaltyCount = metrics.filter(x => x.m.teePenalty === true).length;
  const approachPenaltyCount = metrics.filter(x => x.m.approachPenalty === true).length;
  const obForwardCount = metrics.reduce((s, x) => s + x.m.obForwardCount, 0);
  const obReplayCount = metrics.reduce((s, x) => s + x.m.obReplayCount, 0);
  const upAndDownCount = metrics.filter(x => x.m.upAndDown).length;
  const chipInCount = metrics.filter(x => x.m.chipIn).length;
  const offGreenPuttCount = metrics.filter(x => x.m.offGreenPutt).length;

  // 페어웨이 적중/미스에 따른 GIR
  const withFw = fairwayRecorded.filter(h => h.gir != null);
  const fwHit = withFw.filter(h => h.fairwayHit === true);
  const fwMiss = withFw.filter(h => h.fairwayHit === false);
  const girAfterFairwayN = fwHit.length;
  const girAfterMissN = fwMiss.length;
  const girAfterFairwayRate = safe(fwHit.filter(h => h.gir === true).length, fwHit.length);
  const girAfterMissRate = safe(fwMiss.filter(h => h.gir === true).length, fwMiss.length);

  // ── 흐름(연속 홀) 지표 — 라운드가 이어 붙은 경우(holeNumber가 줄어듦)에는 거기서 끊는다 ──
  let bogeyStreak = 0, bogeyStreakMax = 0, parStreak = 0, parStreakMax = 0;
  let bounceBackCount = 0, birdieThenBogeyCount = 0;
  let prev = null;
  holes.forEach((h) => {
    const d = h.score - h.par;
    const newRound = prev == null || (h.holeNumber != null && prev.holeNumber != null && h.holeNumber <= prev.holeNumber);
    if (newRound) { bogeyStreak = 0; parStreak = 0; }
    bogeyStreak = d >= 1 ? bogeyStreak + 1 : 0;
    parStreak = d <= 0 ? parStreak + 1 : 0;
    bogeyStreakMax = Math.max(bogeyStreakMax, bogeyStreak);
    parStreakMax = Math.max(parStreakMax, parStreak);
    if (!newRound && prev) {
      const pd = prev.score - prev.par;
      if (pd >= 2 && d <= 0) bounceBackCount++;
      if (pd <= -1 && d >= 1) birdieThenBogeyCount++;
    }
    prev = h;
  });
  const firstThree = holes.slice(0, Math.min(3, holeCount));
  const lastThree = holes.slice(Math.max(0, holeCount - 3));
  const firstThreeAvgDiff = avgDiff(firstThree);
  const lastThreeAvgDiff = avgDiff(lastThree);

  const parTypes = [3, 4, 5].map(p => ({ p, n: holes.filter(h => h.par === p).length, d: avgDiff(holes.filter(h => h.par === p)) })).filter(x => x.n >= 2);
  const bestParType = parTypes.length ? parTypes.reduce((a, b) => (b.d < a.d ? b : a)).p : null;
  const worstParType = parTypes.length ? parTypes.reduce((a, b) => (b.d > a.d ? b : a)).p : null;

  return {
    holeCount, totalScore, totalPar,
    scoreToPar: totalScore - totalPar,
    birdieCount, parCount, bogeyCount, doubleCount, triplePlusCount,
    birdieRate:        safe(birdieCount, holeCount),
    parOrBetterRate:   safe(birdieCount + parCount, holeCount),
    doubleOrWorseRate: safe(doubleCount + triplePlusCount, holeCount),
    girCount, girRate: safe(girCount, holeCount),
    fairwayHoleCount: fairwayHoles.length,
    fairwayRecordedCount: fairwayRecorded.length,
    fairwayHitCount,  fairwayHitRate: safe(fairwayHitCount, fairwayRecorded.length),
    totalPutts, avgPutts: safe(totalPutts, holeCount),
    onePuttCount, threePuttCount, threePuttRate: safe(threePuttCount, holeCount),
    fourPuttCount,
    // 3퍼트 원인
    threePuttLag: causes.counts.lag, threePuttShort: causes.counts.short, threePuttBoth: causes.counts.both,
    threePuttMid: causes.counts.mid, threePuttClose: causes.counts.close, threePuttUnknown: causes.counts.unknown,
    threePuttKnown: causes.known,
    threePuttLagTotal: causes.lagTotal, threePuttShortTotal: causes.shortTotal,
    threePuttDominant: causes.dominant,
    puttHoleCount: coverage.holes, puttDistCoverage: coverage.rate ?? 1,
    lagGreatCount, longPuttMadeCount, birdieChanceMissedCount, approachCloseCount,
    totalOB, totalHazard, totalUnplayable, totalPenalties: totalOB + totalHazard + totalUnplayable,
    holesWithOB, holesWithPenalty, penaltyStrokes,
    driverPenaltyCount, teePenaltyCount, approachPenaltyCount, obForwardCount, obReplayCount,
    par3Count: par3.length, par4Count: par4.length, par5Count: par5.length,
    par3AvgDiff: avgDiff(par3), par4AvgDiff: avgDiff(par4), par5AvgDiff: avgDiff(par5),
    bestParType, worstParType,
    greenMissTotal, greenMissLeft, greenMissRight, greenMissShort, greenMissLong,
    greenMissLeftRate:  safe(greenMissLeft,  greenMissTotal),
    greenMissRightRate: safe(greenMissRight, greenMissTotal),
    greenMissShortRate: safe(greenMissShort, greenMissTotal),
    greenMissLongRate:  safe(greenMissLong,  greenMissTotal),
    sliceCount, hookCount, teeMissRightCount, teeMissLeftCount,
    frontNineScoreToPar, backNineScoreToPar,
    backFade: backNineScoreToPar - frontNineScoreToPar,
    recoveryCount, catastrophicCount,
    // 숏게임·전환
    scrambleAttempts, scrambleSaves, scrambleRate: safe(scrambleSaves, scrambleAttempts),
    girBirdieCount, girBirdieRate: safe(girBirdieCount, girConvertAttempts),
    upAndDownCount, chipInCount, offGreenPuttCount,
    girAfterFairwayN, girAfterMissN, girAfterFairwayRate, girAfterMissRate,
    girFairwayGap: girAfterFairwayRate - girAfterMissRate,
    // 흐름
    bogeyStreakMax, parStreakMax, bounceBackCount, birdieThenBogeyCount,
    firstThreeAvgDiff, lastThreeAvgDiff,
  };
}
