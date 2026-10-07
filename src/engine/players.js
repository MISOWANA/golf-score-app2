// 라운드에서 "나"에 해당하는 플레이어.
// 로그인 이름과 같은 플레이어가 있으면 그 사람, 없으면 첫 번째 플레이어.
// 동반자와 함께 기록할 때 본인을 첫 칸에 넣지 않으면 홈·히스토리 스코어가
// 다른 사람 것으로 보이던 문제를 막는다.
const norm = (n) => (n || '').trim().toLowerCase();

export const myPlayer = (round, userName) =>
  round.players.find((p) => norm(p) === norm(userName)) ?? round.players[0];

// 18홀 파 합계 — round.pars 대신 holes에서 구한다(가져온 예전 데이터에 pars가 없을 수 있음).
export const totalPar = (round) => round.holes.reduce((a, h) => a + (h.par || 0), 0);
