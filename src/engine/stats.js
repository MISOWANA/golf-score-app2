// ─── Generic statistics helpers ──────────────────────────────────────────────
// Pure math only — no app-shape knowledge. Used by scoreBreakdown/clubDistance
// and the round-count reliability gate described in the insights spec (§5).

export function median(nums) {
  if (!nums || nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

// Linear-interpolation quartiles (matches common "exclusive" method closely enough
// for small samples; good enough for a UI reliability signal, not lab statistics).
function quartile(sorted, q) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function iqr(nums) {
  if (!nums || nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const q1 = quartile(s, 0.25);
  const q3 = quartile(s, 0.75);
  return { q1, q3, width: q3 - q1 };
}

// ─── Wilson score interval (95%) ──────────────────────────────────────────────
// §5-2: 비율 지표의 신뢰도는 표본 크기 자체가 아니라 Wilson 95% 신뢰구간의 폭으로 판정한다.
const Z = 1.96;

export function wilsonInterval(successes, n) {
  if (!n || n <= 0) return null;
  const p = successes / n;
  const z2n = (Z * Z) / n;
  const center = (p + z2n / 2) / (1 + z2n);
  const margin = (Z * Math.sqrt((p * (1 - p)) / n + z2n / (4 * n))) / (1 + z2n);
  const low = Math.max(0, center - margin);
  const high = Math.min(1, center + margin);
  return { p, low, high, widthPct: (high - low) * 100 };
}

// ─── Reliability tiers (§5-2) ─────────────────────────────────────────────────
// 낮음 / 중간 / 높음 — 절대 숨기지 않고 항상 배지로 표기한다 (§5-3).
export const TIER = { LOW: 'low', MID: 'mid', HIGH: 'high' };
export const TIER_LABEL = { low: '낮음', mid: '중간', high: '높음' };

export function rateTier(successes, n) {
  const ci = wilsonInterval(successes, n);
  if (!ci) return TIER.LOW;
  if (ci.widthPct <= 20) return TIER.HIGH;
  if (ci.widthPct <= 40) return TIER.MID;
  return TIER.LOW;
}

export function distanceTier(samples) {
  const n = samples?.length ?? 0;
  if (n === 0) return TIER.LOW;
  const med = median(samples);
  const range = iqr(samples);
  if (n >= 15 && med > 0 && range.width <= med * 0.08) return TIER.HIGH;
  if (n >= 8) return TIER.MID;
  return TIER.LOW;
}

// ─── §5-3 라운드 수 기반 공개 단계 ─────────────────────────────────────────────
// 1: 관찰 지표만. 2~4: 반복여부. 5~9: 경향. 10+: 매트릭스 확정.
export function roundCountStage(roundCount) {
  if (roundCount >= 10) return 4;
  if (roundCount >= 5) return 3;
  if (roundCount >= 2) return 2;
  return 1;
}

// ─── §5-5 추가 라운드 필요 문구 ───────────────────────────────────────────────
// "표본 5회 → 거리 통계까지 약 4라운드" 식의 성장 안내. 결핍이 아닌 진행 상태로 노출한다.
export function estimateRoundsToSampleTarget(currentSamples, roundsSoFar, targetSamples) {
  if (roundsSoFar <= 0) return null;
  const perRound = currentSamples / roundsSoFar;
  if (currentSamples >= targetSamples) return 0;
  if (perRound <= 0) return null;
  return Math.ceil((targetSamples - currentSamples) / perRound);
}

export function estimateRoundsToRateTarget(successes, n, roundsSoFar, targetWidthPct = 20) {
  if (roundsSoFar <= 0 || n <= 0) return null;
  if (rateTier(successes, n) === TIER.HIGH) return 0;
  const p = successes / n;
  const perRoundN = n / roundsSoFar;
  if (perRoundN <= 0) return null;
  let testN = n;
  for (let i = 0; i < 400; i++) {
    testN += perRoundN;
    const ci = wilsonInterval(Math.round(p * testN), testN);
    if (ci && ci.widthPct <= targetWidthPct) return i + 1;
  }
  return null;
}
