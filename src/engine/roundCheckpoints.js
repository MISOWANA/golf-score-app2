// 결과 화면 아래쪽 "짚어 볼 곳" — 라운드 요약 카드가 이미 말한 것 말고, 홀 단위로 다시 볼 문제만 모은다.
import { toHoleInput, analyzeRound } from './engine.js';
import { HOLE_RULES } from './rules/holeRules.js';
import { ROUND_RULES } from './rules/roundRules.js';
import { localizeDeep } from './units.js';

const ORDER = { critical: 0, warning: 1 };
export const MAX_CHECKPOINTS = 4;

// said: 위 요약 카드가 이미 말한 항목들 [{ title, hole }] (hole 은 카드에 홀 번호가 적혀 있을 때만 숫자).
//   · 라운드 전체 문제는 제목이 같으면 이미 말한 것이다.
//   · 홀 단위 문제는 카드가 "그 홀"까지 말했을 때만 뺀다 — "티샷 러프" 만 적혀 있으면 어느 홀인지는 여기서 알려 준다.
// 같은 문제(제목이 같은 것)가 여러 홀에서 났으면 한 카드로 묶고 홀 번호만 모은다 — "HOLE 1 티샷 러프" "HOLE 2 티샷 러프" 를 따로 두 번 보이지 않게.
// 잘한 점은 위 요약 카드(그리고 인사이트 탭)가 말하므로 여기서는 짚어 볼 것만 둔다.
export function buildCheckpoints(round, player, said = []) {
  const holeInputs = round.holes.map((h) => toHoleInput(h, player));
  const { roundInsights, holeInsights } = localizeDeep(analyzeRound(holeInputs, HOLE_RULES, ROUND_RULES));
  const covered = (i) => said.some((p) => p.title === i.title && (i.holeNumber == null || (p.hole != null && p.hole === i.holeNumber)));
  const worth = (i) => (i.severity === 'critical' || i.severity === 'warning') && !covered(i);

  const groups = new Map();
  const add = (ins, hole) => {
    const g = groups.get(ins.title) ?? { key: ins.title, title: ins.title, summary: ins.summary, recommendation: ins.recommendation, severity: ins.severity, holes: [] };
    if (hole != null && !g.holes.includes(hole)) g.holes.push(hole);
    if ((ORDER[ins.severity] ?? 2) < (ORDER[g.severity] ?? 2)) g.severity = ins.severity;
    groups.set(ins.title, g);
  };
  roundInsights.filter(worth).forEach((i) => add(i, null));
  holeInsights.forEach((list) => {
    const first = list.find(worth);   // 홀마다 가장 먼저 걸린 문제 하나
    if (first) add(first, first.holeNumber ?? null);
  });
  return [...groups.values()]
    .sort((a, b) => (ORDER[a.severity] ?? 2) - (ORDER[b.severity] ?? 2) || b.holes.length - a.holes.length)
    .slice(0, MAX_CHECKPOINTS)
    .map((g) => ({ ...g, holes: [...g.holes].sort((a, b) => a - b) }));
}
