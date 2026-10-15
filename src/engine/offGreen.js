// ─── 그린 밖으로 나간 퍼트 뒤 다시 친 샷(칩) ──────────────────────────────────────
//
// 그린 위에서 친 퍼트가 그린 밖으로 나가면 그 퍼트는 퍼팅 1타이고, 다시 올리려고 친
// 칩·어프로치는 퍼팅이 아니라 "필드샷"이다. 그런데 스코어 계산은 '티샷 + 필드샷 + 퍼팅
// + 벌타'로 하고 GIR은 (스코어 − 퍼팅) ≤ 파 − 2 로 판정하므로, 이 칩을 퍼팅으로 세면
// 3퍼트가 되고, 필드샷으로 세면 GIR이 사라진다. 그래서 따로 기록한다.
//
//   score.offGreen = [{ after: 0, club: 'wedge' | 'iron' | 'putter' | null }, ...]
//     after   몇 번째 퍼트(0부터) 뒤에 친 샷인지
//     club    쓴 클럽 (선택 입력)
//   score.puttDetails[after].holein === 'offgreen'   — 그 퍼트가 그린 밖으로 나갔다는 표시
//
// 두 기록은 함께 있어야 유효하다. 퍼팅 수를 바꾸면서 퍼팅별 상세가 비워지거나 잘려
// 나가면 칩 기록도 함께 사라진다 (남아 있던 기록이 나중에 퍼팅 수를 다시 늘릴 때
// 되살아나지 않게).
//
// 이 샷은 스코어에는 들어가지만 퍼팅 수·GIR 계산에서는 빠진다.
// 그 뒤에 퍼트가 없으면(= 마지막 샷이 칩) 칩인이다.

export const OFF_GREEN_CLUBS = [
  { id: 'wedge', label: '웨지' },
  { id: 'iron', label: '아이언' },
  { id: 'putter', label: '퍼터' },
];

export const offGreenClubLabel = (club) => OFF_GREEN_CLUBS.find((c) => c.id === club)?.label ?? null;

// 유효한 기록만 — 그 퍼트가 실제로 있고, 그린 밖으로 나갔다고 표시돼 있어야 한다.
// 같은 퍼트 뒤에는 하나뿐이다.
export function offGreenShots(score) {
  const putts = Number.isFinite(score?.putts) ? score.putts : 0;
  const details = Array.isArray(score?.puttDetails) ? score.puttDetails : [];
  const list = Array.isArray(score?.offGreen) ? score.offGreen : [];
  const byAfter = new Map();
  list.forEach((r) => {
    if (!r || !Number.isInteger(r.after) || r.after < 0 || r.after >= putts) return;
    if (details[r.after]?.holein !== 'offgreen') return;
    byAfter.set(r.after, r);
  });
  return [...byAfter.values()].sort((a, b) => a.after - b.after);
}

export const offGreenCount = (score) => offGreenShots(score).length;

export const offGreenAfter = (score, puttIdx) => offGreenShots(score).find((r) => r.after === puttIdx) ?? null;

// 마지막 샷이 칩 — 퍼트 뒤에 친 칩이 그대로 홀에 들어갔다.
export function offGreenHoled(score) {
  const putts = Number.isFinite(score?.putts) ? score.putts : 0;
  return putts > 0 && offGreenShots(score).some((r) => r.after === putts - 1);
}
