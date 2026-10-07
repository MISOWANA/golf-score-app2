// ─── 라운드 데이터 형식 검사 ─────────────────────────────────────────────────
//
// 화면들은 라운드가 아래 모양이라고 믿고 그린다 (hole.scores[player].strokes 등).
// 깨진 백업 파일을 가져오면 그 라운드가 DB에 남아 앱을 켤 때마다 화면이 죽으므로,
// 가져올 때 거르고, 읽어올 때도 한 번 더 걸러 화면에 넘기지 않는다.
//
//   { id: string, date: string, players: string[1+],
//     holes: [{ par: number, scores: { [player]: object } }, ...] }

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function isValidRound(r) {
  if (!isObj(r)) return false;
  if (typeof r.id !== 'string' || typeof r.date !== 'string') return false;
  if (!Array.isArray(r.players) || r.players.length === 0) return false;
  if (!r.players.every((p) => typeof p === 'string' && p.length > 0)) return false;
  if (!Array.isArray(r.holes) || r.holes.length === 0) return false;
  return r.holes.every((h) =>
    isObj(h)
    && typeof h.par === 'number'
    && isObj(h.scores)
    && r.players.every((p) => isObj(h.scores[p])));
}
