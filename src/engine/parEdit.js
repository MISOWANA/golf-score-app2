// 라운드의 파를 고친 뒤 홀 데이터를 맞춘다 (라운드 중 '파 수정'과 리포트의 '라운드 정보 수정'이 함께 쓴다).
//
// 파가 바뀐 홀만 손댄다:
//   · 입력하지 않은 홀 (touched === false) — 기본값(파·2퍼트·GIR 성공)을 새 파 기준으로 다시 맞춘다.
//     그대로 두면 예전 파 타수가 남아 새 파 대비 가짜 버디·보기가 된다.
//   · 입력한 홀 — 타수·퍼트는 사용자 기록이라 그대로 두고, 자동 계산된 GIR(girAuto !== false)만
//     새 파로 다시 계산한다. 직접 고른 GIR 은 건드리지 않는다.
import { offGreenCount } from './offGreen.js';

const rescoreScore = (score, newPar) => {
  if (!score) return score;
  if (score.touched === false) {
    return { ...score, strokes: newPar, putts: 2, fairway: null, gir: true };
  }
  if (score.girAuto === false || score.gir == null || !Number.isFinite(score.strokes) || !Number.isFinite(score.putts)) return score;
  const gir = (score.strokes - score.putts - (Array.isArray(score.offGreen) ? offGreenCount(score) : 0)) <= newPar - 2;
  return gir === score.gir ? score : { ...score, gir };
};

export function applyParEdit(round, newPars) {
  let changed = false;
  const holes = round.holes.map((hole, i) => {
    const newPar = newPars[i];
    if (newPar == null || newPar === hole.par) return hole;
    changed = true;
    const scores = Object.fromEntries(Object.entries(hole.scores ?? {}).map(([p, s]) => [p, rescoreScore(s, newPar)]));
    return { ...hole, par: newPar, scores };
  });
  const parsSame = Array.isArray(round.pars) && round.pars.length === newPars.length && round.pars.every((p, i) => p === newPars[i]);
  if (!changed && parsSame) return round;
  return { ...round, pars: [...newPars], holes };
}
