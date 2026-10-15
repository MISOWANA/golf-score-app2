import { buildDerivedHoleMetrics, buildRoundMetrics } from './metrics.js';

// ─── App data → engine format ─────────────────────────────────────────────────

export function toHoleInput(h, player) {
  const s = h.scores?.[player] ?? {};
  return {
    holeNumber:         h.holeNumber,
    par:                h.par,
    score:              s.strokes ?? h.par,
    teeShotShape:       s.shotShape   ?? null,
    fairwayHit:         s.fairway     ?? null,
    // 티샷 랜딩 L/C/R — 앱은 s.fairwayHit에 문자열로 저장한다 (s.landingPoint는 예전 이름)
    landingPoint:       typeof s.fairwayHit === 'string' ? s.fairwayHit : (s.landingPoint ?? null),
    gir:                s.gir         ?? null,
    greenMissDirection: s.greenMiss   ?? null,
    obCount:            s.ob          ?? 0,
    hazardCount:        s.hazard      ?? 0,
    unplayableCount:    s.unplayable  ?? 0,
    putts:              s.putts       ?? null,
    memo:               s.memo        ?? null,
    // ── 샷 단위 상세 (없으면 해당 지표는 판단 보류) ──
    puttDetails:        Array.isArray(s.puttDetails) ? s.puttDetails : [],
    penalties:          Array.isArray(s.penalties) ? s.penalties : [],
    teeClub:            s.teeClub     ?? null,
    secondClub:         s.secondClub  ?? null,
    teeGIR:             s.teeGIR === true,
    // 입력하지 않은 홀(touched === false)은 기본값(파·2퍼트)이라 홀 단위 인사이트를 만들지 않는다
    touched:            s.touched !== false,
  };
}

// ─── Condition evaluation ────────────────────────────────────────────────────

function evalCondition(cond, ctx) {
  const val = ctx[cond.field];
  switch (cond.operator) {
    case 'eq':     return val === cond.value;
    case 'neq':    return val !== cond.value;
    case 'gt':     return val != null && val >  cond.value;
    case 'gte':    return val != null && val >= cond.value;
    case 'lt':     return val != null && val <  cond.value;
    case 'lte':    return val != null && val <= cond.value;
    case 'in':     return Array.isArray(cond.value) && cond.value.includes(val);
    case 'not_in': return Array.isArray(cond.value) && !cond.value.includes(val);
    default:       return false;
  }
}

// ─── Template rendering ───────────────────────────────────────────────────────

export function renderInsightText(template, ctx) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = ctx[key];
    return val != null ? String(val) : `{${key}}`;
  });
}

// ─── Hole-level matching ──────────────────────────────────────────────────────

export function matchHoleInsightRules(input, metrics, rules) {
  const ctx = { ...input, ...metrics };
  const matched = rules
    .filter(r => r.scope === 'hole' && r.enabled)
    .filter(r => r.conditions.every(c => evalCondition(c, ctx)));
  // 더 구체적인 룰이 맞으면 그 룰이 대신하는(supersedes) 일반 룰은 내지 않는다 — 같은 말을 두 번 하지 않게
  const superseded = new Set(matched.flatMap(r => r.supersedes || []));
  return matched
    .filter(r => !superseded.has(r.id))
    .sort((a, b) => a.priority - b.priority)
    .map(r => ({
      id:             r.id,
      scope:          'hole',
      priority:       r.priority,
      holeNumber:     input.holeNumber,
      par:            input.par,
      insightType:    r.result.insightType,
      severity:       r.result.severity,
      category:       r.result.category ?? null,
      title:          renderInsightText(r.result.title, ctx),
      summary:        renderInsightText(r.result.summaryTemplate, ctx),
      recommendation: renderInsightText(r.result.recommendationTemplate, ctx),
      tags:           r.result.tags,
    }));
}

// ─── Round-level matching ─────────────────────────────────────────────────────

export function matchRoundInsightRules(rm, rules) {
  const ctx = {
    ...rm,
    // display-only helpers (numeric versions remain for condition eval)
    girRatePct:            Math.round(rm.girRate * 100),
    fairwayHitRatePct:     Math.round(rm.fairwayHitRate * 100),
    greenMissLeftRatePct:  Math.round(rm.greenMissLeftRate * 100),
    greenMissRightRatePct: Math.round(rm.greenMissRightRate * 100),
    greenMissShortRatePct: Math.round(rm.greenMissShortRate * 100),
    avgPuttsStr:           rm.avgPutts.toFixed(2),
    par3AvgDiffStr:        (rm.par3AvgDiff >= 0 ? '+' : '') + rm.par3AvgDiff.toFixed(2),
    par4AvgDiffStr:        (rm.par4AvgDiff >= 0 ? '+' : '') + rm.par4AvgDiff.toFixed(2),
    par5AvgDiffStr:        (rm.par5AvgDiff >= 0 ? '+' : '') + rm.par5AvgDiff.toFixed(2),
    backFadeAbs:           Math.abs(rm.backFade),
    scrambleRatePct:       Math.round(rm.scrambleRate * 100),
    girAfterFairwayRatePct: Math.round(rm.girAfterFairwayRate * 100),
    girAfterMissRatePct:   Math.round(rm.girAfterMissRate * 100),
    puttDistCoveragePct:   Math.round(rm.puttDistCoverage * 100),
    firstThreeAvgDiffStr:  (rm.firstThreeAvgDiff >= 0 ? '+' : '') + rm.firstThreeAvgDiff.toFixed(1),
    lastThreeAvgDiffStr:   (rm.lastThreeAvgDiff >= 0 ? '+' : '') + rm.lastThreeAvgDiff.toFixed(1),
    girBirdieRatePct:      Math.round(rm.girBirdieRate * 100),
  };
  return rules
    .filter(r => r.scope === 'round' && r.enabled)
    .filter(r => r.conditions.every(c => evalCondition(c, ctx)))
    .sort((a, b) => a.priority - b.priority)
    .map(r => ({
      id:             r.id,
      scope:          'round',
      priority:       r.priority,
      insightType:    r.result.insightType,
      severity:       r.result.severity,
      category:       r.result.category ?? null,
      title:          renderInsightText(r.result.title, ctx),
      summary:        renderInsightText(r.result.summaryTemplate, ctx),
      recommendation: renderInsightText(r.result.recommendationTemplate, ctx),
      tags:           r.result.tags,
    }));
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

export function analyzeRound(holeInputs, holeRules, roundRules) {
  const holeInsights = holeInputs.map(h => {
    // 입력하지 않은 홀은 기본값뿐이라 홀 단위 인사이트를 만들지 않는다
    if (h.touched === false) return [];
    const metrics = buildDerivedHoleMetrics(h);
    return matchHoleInsightRules(h, metrics, holeRules);
  });
  const rm = buildRoundMetrics(holeInputs);
  const roundInsights = rm ? matchRoundInsightRules(rm, roundRules) : [];
  return { holeInsights, roundInsights };
}
