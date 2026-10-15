// 인사이트 분류 — 검색·복기 필터와 리포트 묶음에서 쓴다.
// 룰에 category가 직접 적혀 있으면 그것을 쓰고, 없으면 tags에서 정한다.

export const INSIGHT_CATEGORY_LABEL = {
  score: '스코어',
  putting: '퍼팅',
  tee: '티샷',
  approach: '어프로치',
  shortgame: '숏게임',
  penalty: '페널티',
  recovery: '회복·멘탈',
  pace: '흐름',
  data: '기록 보완',
};
export const INSIGHT_CATEGORY_ORDER = ['putting', 'tee', 'approach', 'shortgame', 'penalty', 'score', 'recovery', 'pace', 'data'];

export function categoryFromTags(tags = []) {
  const has = (...t) => t.some(x => tags.includes(x));
  if (has('data')) return 'data';
  if (has('putting', 'three_putt', 'one_putt')) return 'putting';
  if (has('penalty')) return 'penalty';
  if (has('tee_shot', 'hook', 'slice', 'fairway')) return 'tee';
  if (has('short_game', 'scramble')) return 'shortgame';
  if (has('green_miss', 'gir', 'iron', 'approach')) return 'approach';
  if (has('recovery', 'mental', 'damage', 'streak')) return 'recovery';
  if (has('pace', 'stamina', 'flow')) return 'pace';
  return 'score';
}

export const withCategory = (rule) => ({
  ...rule,
  result: { ...rule.result, category: rule.result.category ?? categoryFromTags(rule.result.tags) },
});
