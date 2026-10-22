// ─── "18홀 중 9홀만 입력"한 예전 라운드 → 9홀 라운드 ──────────────────────────────
//
// 예전에는 9홀만 치고 끝내도 라운드가 18홀로 저장됐다 — 치지 않은 9홀이 파(2퍼트 · GIR 성공)로 채워져서
// 합계가 18홀 점수처럼 보이고 통계에 섞였다. 이런 라운드를 처음부터 9홀짜리 라운드로 바꾼다 (홀 번호는 1~9).
// 9홀 라운드는 스탯·인사이트 집계에서 빠지므로(GolfScoringApp) 18홀 통계가 오염되지 않는다.
//
// 확실한 경우만 바꾼다:
//   · 홀이 18개이고, 한쪽 9홀이 모두 입력됐고(touched === true) 다른 쪽 9홀은 모두 입력하지 않았다(touched === false).
//   · 모든 플레이어 기준이다 (동반자 라운드도 같다).
//   · touched 표시가 없는 예전 기록, 입력한 홀이 9개가 아닌 라운드(12홀만 입력 등)는 건드리지 않는다.
//
// 새로 끝내는 라운드(finishRound)와 가져오는 백업(handleImportData)에도 같은 변환을 건다.

const playedHole = (hole, players) => players.every((p) => hole.scores?.[p]?.touched === true);
const skippedHole = (hole, players) => players.every((p) => hole.scores?.[p]?.touched === false);

// 한쪽 9홀만 쳤으면 'out'(1~9번) | 'in'(10~18번), 아니면 null
export function playedNineOf(round) {
  if (!round || !Array.isArray(round.holes) || round.holes.length !== 18 || !Array.isArray(round.players) || round.players.length === 0) return null;
  const out = round.holes.slice(0, 9);
  const inn = round.holes.slice(9);
  const ps = round.players;
  if (out.every((h) => playedHole(h, ps)) && inn.every((h) => skippedHole(h, ps))) return 'out';
  if (inn.every((h) => playedHole(h, ps)) && out.every((h) => skippedHole(h, ps))) return 'in';
  return null;
}

// 반환: { round, changed } — 바꿀 게 없으면 같은 객체와 changed 0
export function convertPartialToNine(round) {
  const side = playedNineOf(round);
  if (!side) return { round, changed: 0 };
  const kept = side === 'out' ? round.holes.slice(0, 9) : round.holes.slice(9);
  const holes = kept.map((h, i) => ({ ...h, holeNumber: i + 1 }));   // 후반을 쳤어도 1~9번
  return {
    round: { ...round, holes, pars: holes.map((h) => h.par), nine: side, currentHole: holes.length - 1 },
    changed: 1,
  };
}
