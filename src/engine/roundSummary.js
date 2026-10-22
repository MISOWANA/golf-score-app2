// 라운드 리포트(분석 화면 상단)의 숫자들.
//
// 합계·전후반 타수·파 대비는 저장된 타수 그대로다 (홈·히스토리와 같다 — 입력하지 않은 홀은 파로 저장돼 있다).
// 반면 GIR·퍼트·페어웨이·버디/파/보기 구성은 입력한 홀(touched !== false)만 센다. 입력하지 않은 홀의
// 기본값(GIR 성공 · 2퍼트 · 파)이 섞이면 9홀만 친 라운드의 GIR 이 부풀고, 스탯 탭·인사이트와 숫자가 어긋난다.
// touched 표시가 없는 예전 기록은 입력한 홀로 본다 (engine.toHoleInput 과 같은 기준).
import { totalPar } from './players.js';
import { isBackHole } from './nines.js';

export const isPlayed = (score) => !!score && score.touched !== false;

export function summarizeRound(round, player) {
  const holes = round.holes;
  const scoreOf = (h) => h.scores?.[player];
  const played = holes.filter((h) => isPlayed(scoreOf(h)));
  const n = played.length;
  const sumStrokes = (list) => list.reduce((s, h) => s + (scoreOf(h)?.strokes || 0), 0);

  const total = sumStrokes(holes);
  const par = totalPar(round);
  const totalPutts = played.reduce((s, h) => s + (scoreOf(h).putts || 0), 0);
  const girHoles = played.filter((h) => scoreOf(h).gir === true).length;

  // 페어웨이는 O/X 를 기록한 홀만 센다 — 기록하지 않은 홀(간편 기록 등)을 미적중으로 세면 적중률이
  // 실제보다 낮게 나온다. 인사이트(metrics.js)와 같은 기준.
  const fairwayHoles = played.filter((h) => h.par > 3 && typeof scoreOf(h).fairway === 'boolean');
  const fairwaysHit = fairwayHoles.filter((h) => scoreOf(h).fairway === true).length;

  const diffOf = (h) => scoreOf(h).strokes - h.par;
  const withStrokes = played.filter((h) => scoreOf(h).strokes);
  return {
    total, totalPar: par, diff: total - par, totalPutts, playedCount: n,
    girHoles, girPct: n > 0 ? ((girHoles / n) * 100).toFixed(0) : '0',
    fairwaysHit, fairwayTotal: fairwayHoles.length,
    fairwayPct: fairwayHoles.length > 0 ? ((fairwaysHit / fairwayHoles.length) * 100).toFixed(0) : null,
    birdies: withStrokes.filter((h) => diffOf(h) === -1).length,
    eagles: withStrokes.filter((h) => diffOf(h) <= -2).length,
    pars: played.filter((h) => scoreOf(h).strokes === h.par).length,
    bogeys: withStrokes.filter((h) => diffOf(h) === 1).length,
    doubles: withStrokes.filter((h) => diffOf(h) >= 2).length,
    avgPutts: n > 0 ? (totalPutts / n).toFixed(1) : '0.0',
    // 전반(1~9번)·후반(10~18번) 타수 — 9홀 라운드는 1~9번뿐이라 front9 만 값이 있다 (리포트는 9홀이면 이 칸을 숨긴다)
    front9: sumStrokes(holes.filter((h, i) => !isBackHole(h, i))),
    back9: sumStrokes(holes.filter((h, i) => isBackHole(h, i))),
  };
}
