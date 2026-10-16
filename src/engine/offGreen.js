// ─── 그린 밖으로 나간 퍼트 뒤 다시 친 샷(칩) ──────────────────────────────────────
//
// 그린 위에서 친 퍼트가 그린 밖으로 나가면 그 퍼트는 퍼팅 1타이고, 다시 올리려고 친
// 칩·어프로치는 퍼팅이 아니라 "필드샷"이다. 그런데 스코어 계산은 '티샷 + 필드샷 + 퍼팅
// + 벌타'로 하고 GIR은 (스코어 − 퍼팅) ≤ 파 − 2 로 판정하므로, 이 칩을 퍼팅으로 세면
// 3퍼트가 되고, 필드샷으로 세면 GIR이 사라진다. 그래서 따로 기록한다.
//
//   score.offGreen = [{ after, club, subClub, onGreen }, ...]
//     after    몇 번째 퍼트(0부터) 뒤에 친 샷인지. 같은 퍼트 뒤에 칩이 여러 번이면
//              같은 값이 이어진다 (칩 → 그린 놓침 → 다시 칩)
//     club     쓴 클럽 (선택 입력) · subClub 웨지 각도·아이언 번호 등
//     onGreen  null(아직 결과 없음) | true(온그린) | false(그린 놓침) | 'chip-in'
//   score.puttDetails[after].holein === 'offgreen'   — 그 퍼트가 그린 밖으로 나갔다는 표시
//
// 두 기록은 함께 있어야 유효하다. 퍼팅 수를 바꾸면서 퍼팅별 상세가 비워지거나 잘려
// 나가면 칩 기록도 함께 사라진다 (남아 있던 기록이 나중에 퍼팅 수를 다시 늘릴 때
// 되살아나지 않게).
//
// 이 샷은 스코어에는 들어가지만 퍼팅 수·GIR 계산에서는 빠진다.
// 칩인('chip-in')이면 그 퍼트까지가 퍼팅이고 홀이 끝난다.

export const OFF_GREEN_CLUBS = [
  { id: 'wedge', label: 'WEDGE' },
  { id: 'iron', label: 'IRON' },
  { id: 'hybrid', label: 'HYBRID' },
  { id: 'putter', label: 'PUTTER' },
];

export const emptyOffGreenShot = (after) => ({ after, club: null, subClub: null, onGreen: null });

// 유효한 기록만 — 그 퍼트가 실제로 있고, 그린 밖으로 나갔다고 표시돼 있어야 한다.
// 퍼트 순서(after)대로, 같은 퍼트 뒤에서는 기록한 순서대로 돌려준다.
export function offGreenShots(score) {
  const putts = Number.isFinite(score?.putts) ? score.putts : 0;
  const details = Array.isArray(score?.puttDetails) ? score.puttDetails : [];
  const list = Array.isArray(score?.offGreen) ? score.offGreen : [];
  return list
    .filter((r) => r && Number.isInteger(r.after) && r.after >= 0 && r.after < putts && details[r.after]?.holein === 'offgreen')
    // 결과(onGreen) 필드가 없던 예전 기록: 칩 뒤에 퍼트가 있으면 온그린, 없으면 칩인으로 읽는다
    .map((r) => (r.onGreen === undefined ? { ...r, onGreen: r.after === putts - 1 ? 'chip-in' : true } : r))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.after - b.r.after) || (a.i - b.i))
    .map((x) => x.r);
}

export const offGreenCount = (score) => offGreenShots(score).length;

// 한 퍼트 뒤에 친 칩들 (순서대로)
export const offGreenChain = (score, puttIdx) => offGreenShots(score).filter((r) => r.after === puttIdx);

// 퍼트 뒤에 친 칩이 그대로 홀에 들어갔다.
export const offGreenHoled = (score) => offGreenShots(score).some((r) => r.onGreen === 'chip-in');

// 칩이 그린에 올라간 결과를 아직 입력하지 않은 퍼트 — 그 뒤의 퍼트는 기록할 수 없다.
// 없으면 null.
export function offGreenPendingAfter(score) {
  const shots = offGreenShots(score);
  const afters = [...new Set(shots.map((r) => r.after))];
  for (const a of afters) {
    const chain = shots.filter((r) => r.after === a);
    const last = chain[chain.length - 1];
    if (last.onGreen !== true && last.onGreen !== 'chip-in') return a;
  }
  return null;
}
