// ─── Individual metric getters ───────────────────────────────────────────────

export function getScoreToPar(h) {
  return h.score - h.par;
}

export function getHasPenalty(h) {
  return (h.obCount ?? 0) > 0 || (h.hazardCount ?? 0) > 0;
}

export function getTotalPenaltyStrokes(h) {
  return (h.obCount ?? 0) + (h.hazardCount ?? 0);
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
    return 'miss_left';
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
  if (diff <= 2 || penalty <= 2)  return 'major';
  return 'catastrophic';
}

// ─── Aggregate builder ───────────────────────────────────────────────────────

export function buildDerivedHoleMetrics(h) {
  return {
    scoreToPar:          getScoreToPar(h),
    hasPenalty:          getHasPenalty(h),
    totalPenaltyStrokes: getTotalPenaltyStrokes(h),
    puttCategory:        getPuttCategory(h),
    scoreCategory:       getScoreCategory(h),
    teeMissCategory:     getTeeMissCategory(h),
    girResultCategory:   getGIRResultCategory(h),
    recoveryCategory:    getRecoveryCategory(h),
    damageCategory:      getDamageCategory(h),
    parType:             `par${h.par}`,
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

  const girCount        = holes.filter(h => h.gir === true).length;
  const fairwayHoles    = holes.filter(h => h.par >= 4);
  const fairwayHitCount = fairwayHoles.filter(h => h.fairwayHit === true).length;

  const totalPutts      = holes.reduce((s, h) => s + (h.putts ?? 2), 0);
  const onePuttCount    = metrics.filter(x => x.m.puttCategory === 'one_putt').length;
  const threePuttCount  = metrics.filter(x => x.m.puttCategory === 'three_putt_plus').length;

  const totalOB          = holes.reduce((s, h) => s + (h.obCount ?? 0), 0);
  const totalHazard      = holes.reduce((s, h) => s + (h.hazardCount ?? 0), 0);
  const holesWithOB      = holes.filter(h => (h.obCount ?? 0) > 0).length;
  const holesWithPenalty = metrics.filter(x => x.m.hasPenalty).length;

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

  return {
    holeCount, totalScore, totalPar,
    scoreToPar: totalScore - totalPar,
    birdieCount, parCount, bogeyCount, doubleCount, triplePlusCount,
    birdieRate:        safe(birdieCount, holeCount),
    parOrBetterRate:   safe(birdieCount + parCount, holeCount),
    doubleOrWorseRate: safe(doubleCount + triplePlusCount, holeCount),
    girCount, girRate: safe(girCount, holeCount),
    fairwayHoleCount: fairwayHoles.length,
    fairwayHitCount,  fairwayHitRate: safe(fairwayHitCount, fairwayHoles.length),
    totalPutts, avgPutts: safe(totalPutts, holeCount),
    onePuttCount, threePuttCount, threePuttRate: safe(threePuttCount, holeCount),
    totalOB, totalHazard, totalPenalties: totalOB + totalHazard,
    holesWithOB, holesWithPenalty,
    par3Count: par3.length, par4Count: par4.length, par5Count: par5.length,
    par3AvgDiff: avgDiff(par3), par4AvgDiff: avgDiff(par4), par5AvgDiff: avgDiff(par5),
    greenMissTotal, greenMissLeft, greenMissRight, greenMissShort, greenMissLong,
    greenMissLeftRate:  safe(greenMissLeft,  greenMissTotal),
    greenMissRightRate: safe(greenMissRight, greenMissTotal),
    greenMissShortRate: safe(greenMissShort, greenMissTotal),
    greenMissLongRate:  safe(greenMissLong,  greenMissTotal),
    sliceCount, hookCount, teeMissRightCount, teeMissLeftCount,
    frontNineScoreToPar, backNineScoreToPar,
    backFade: backNineScoreToPar - frontNineScoreToPar,
    recoveryCount, catastrophicCount,
  };
}
