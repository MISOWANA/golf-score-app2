// ─── 9홀 · 18홀 ────────────────────────────────────────────────────────────────
//
// 라운드는 18홀(holes 18개) 또는 9홀(holes 9개)이다. 9홀 라운드는 처음부터 홀 9개만 가진다 — 입력하지 않은
// 홀을 '파로 채운 18홀'이 아니라서 합계·파 대비가 실제 친 홀만 센다.
//
// 9홀 라운드의 홀 번호는 항상 1~9 이다 ('후반 9홀'을 쳐도 10~18번을 보여 주지 않는다). round.nine('out' | 'in')은
// 어느 코스의 파·이름을 쓰는지만 기억한다. 18홀 라운드는 1~9번 = 전반(OUT), 10~18번 = 후반(IN).
//
// 스탯·인사이트·마이백 실측은 18홀을 끝낸 라운드만 집계한다 (GolfScoringApp 이 9홀 라운드를 거른다).

export const FULL_ROUND_HOLES = 18;
export const NINE_HOLES = 9;

// 18홀 라운드에서 전반(1~9번)·후반(10~18번)을 가른다. 번호가 없는 예전 기록은 순서(앞 9개 / 나머지)로 가른다.
export const isBackHole = (hole, index) => (Number.isInteger(hole?.holeNumber) ? hole.holeNumber > 9 : index >= 9);

export const isNineHoleRound = (round) => (round?.holes?.length ?? 0) <= NINE_HOLES;
export const isFullRound = (round) => !isNineHoleRound(round);

// 화면에 보이는 홀 번호 — holeNumber 가 없으면 배열 위치 + 1
export const holeNoOf = (round, index) => round?.holes?.[index]?.holeNumber ?? index + 1;

// 9홀 라운드가 쓴 코스: 'in'(후반 코스의 파·이름) 아니면 'out'
export const nineSideOf = (round) => (round?.nine === 'in' ? 'in' : 'out');

// 라운드의 9홀 묶음 (코스 이름 · 홀 목록 표시용).
//   18홀: OUT·IN 두 묶음.
//   9홀:  한 묶음 — 코스 이름이 있으면 그 이름, 기본값(OUT·IN)이면 '9홀'. 홀 번호가 1~9 라서 OUT/IN 을 내세우지 않는다.
// 각 묶음: { key: 'out' | 'in', label, holes: [{ hole, index }] } — index 는 round.holes 안의 위치
export function ninesOf(round) {
  const holes = round?.holes ?? [];
  if (isNineHoleRound(round)) {
    if (holes.length === 0) return [];
    const side = nineSideOf(round);
    const name = side === 'in' ? round.inCourseName : round.outCourseName;
    const isDefault = !name || name === 'OUT' || name === 'IN';
    return [{ key: side, label: isDefault ? '9홀' : name, holes: holes.map((hole, index) => ({ hole, index })) }];
  }
  const out = [];
  const inn = [];
  holes.forEach((hole, index) => (isBackHole(hole, index) ? inn : out).push({ hole, index }));
  return [
    { key: 'out', label: round?.outCourseName || 'OUT', holes: out },
    { key: 'in', label: round?.inCourseName || 'IN', holes: inn },
  ].filter((n) => n.holes.length > 0);
}

// 새 라운드의 홀 구성. nine: null(18홀) | 'out' | 'in'. pars 는 18홀 전체 파 배열.
// 9홀은 어느 쪽 파를 쓰든 홀 번호가 1~9 다. 반환: [{ holeNumber, par }]
export function holePlan(pars, nine) {
  if (nine === 'out') return pars.slice(0, 9).map((par, i) => ({ holeNumber: i + 1, par }));
  if (nine === 'in') return pars.slice(9, 18).map((par, i) => ({ holeNumber: i + 1, par }));
  return pars.slice(0, 18).map((par, i) => ({ holeNumber: i + 1, par }));
}

// 라운드 종류 이름 — '9홀' · '18홀'
export const roundKindLabel = (round) => (isNineHoleRound(round) ? '9홀' : '18홀');
