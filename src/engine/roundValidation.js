// ─── 라운드 데이터 형식 검사 ─────────────────────────────────────────────────
//
// 화면들은 라운드가 아래 모양이라고 믿고 그린다 (hole.scores[player].strokes 등).
// 깨진 백업 파일을 가져오면 그 라운드가 DB에 남아 앱을 켤 때마다 화면이 죽으므로,
// 가져올 때 거르고, 읽어올 때도 한 번 더 걸러 화면에 넘기지 않는다.
//
//   { id: string, date: string, players: string[1+],
//     holes: [{ par: number, scores: { [player]: object } }, ...] }
//
// pars(홀별 파 배열)는 검사하지 않는다 — 예전 백업에는 없을 수 있다. 화면에 넘기기 전에
// normalizeRound 로 홀의 파에서 채운다 (스탯·인사이트·리포트가 round.pars 를 읽는다).

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

export function isValidRound(r) {
  if (!isObj(r)) return false;
  if (typeof r.id !== 'string' || typeof r.date !== 'string') return false;
  if (Number.isNaN(new Date(r.date).getTime())) return false;   // 'Invalid Date' 라운드는 정렬·표시가 깨진다
  if (!Array.isArray(r.players) || r.players.length === 0) return false;
  if (!r.players.every((p) => typeof p === 'string' && p.length > 0)) return false;
  if (!Array.isArray(r.holes) || r.holes.length === 0) return false;
  return r.holes.every((h) =>
    isObj(h)
    && typeof h.par === 'number'
    && isObj(h.scores)
    && r.players.every((p) => isObj(h.scores[p])));
}

// 화면이 기대하는 모양으로 맞춘다. 고칠 게 없으면 같은 객체를 돌려준다 (불필요한 리렌더 방지).
export function normalizeRound(r) {
  const holePars = r.holes.map((h) => h.par);
  const parsOk = Array.isArray(r.pars) && r.pars.length === holePars.length && r.pars.every((p) => typeof p === 'number');
  return parsOk ? r : { ...r, pars: holePars };
}
