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
    landingPoint:       s.landingPoint ?? null,
    gir:                s.gir         ?? null,
    greenMissDirection: s.greenMiss   ?? null,
    obCount:            s.ob          ?? 0,
    hazardCount:        s.hazard      ?? 0,
    putts:              s.putts       ?? null,
    memo:               s.memo        ?? null,
  };
}

// ─── Condition evaluation ────────────────────────────────────────────────────

function evalCondition(cond, ctx) {
  const val = ctx[cond.field];
  switch (cond.operator) {
    case 'eq':     return val === cond.value;
    case 'neq':    return val !== cond.value;
    case 'gt':     return val >  cond.value;
    case 'gte':    return val >= cond.value;
    case 'lt':     return val <  cond.value;
    case 'lte':    return val <= cond.value;
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
  return rules
    .filter(r => r.scope === 'hole' && r.enabled)
    .filter(r => r.conditions.every(c => evalCondition(c, ctx)))
    .sort((a, b) => a.priority - b.priority)
    .map(r => ({
      holeNumber:     input.holeNumber,
      insightType:    r.result.insightType,
      severity:       r.result.severity,
      title:          r.result.title,
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
  };
  return rules
    .filter(r => r.scope === 'round' && r.enabled)
    .filter(r => r.conditions.every(c => evalCondition(c, ctx)))
    .sort((a, b) => a.priority - b.priority)
    .map(r => ({
      insightType:    r.result.insightType,
      severity:       r.result.severity,
      title:          r.result.title,
      summary:        renderInsightText(r.result.summaryTemplate, ctx),
      recommendation: renderInsightText(r.result.recommendationTemplate, ctx),
      tags:           r.result.tags,
    }));
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

export function analyzeRound(holeInputs, holeRules, roundRules) {
  const holeInsights = holeInputs.map(h => {
    const metrics = buildDerivedHoleMetrics(h);
    return matchHoleInsightRules(h, metrics, holeRules);
  });
  const rm = buildRoundMetrics(holeInputs);
  const roundInsights = rm ? matchRoundInsightRules(rm, roundRules) : [];
  return { holeInsights, roundInsights };
}
