// ─── 저장된 기록 보정 ─────────────────────────────────────────────────────────
//
// 파3 타수 누락 보정 (2026-10-08 수정분)
//
// 예전 자동 계산식은 파3의 기본 필드샷을 항상 0개로 잡아서, 티샷이 그린을
// 놓친 뒤 친 어프로치(세컨샷)가 타수에서 빠졌다 — 그린 놓침 → 칩 온 → 2퍼트가
// 4타가 아니라 3타로 저장됐다. 또 그 3타로 GIR을 다시 계산해 gir=true가 붙었다.
//
// 보정 대상은 자동 계산으로 확정된 홀만이다:
//   - 파3, 상세 입력(티샷 클럽) + 홀인 성공(퍼팅 홀인 또는 칩인)
//   - 티샷이 그린을 놓친 흔적: 세컨샷 온그린 결과(onGreen) 또는 추가 샷이 있음
//     (gir는 위처럼 잘못 다시 계산됐을 수 있어 근거로 쓰지 않는다)
//   - 저장된 타수가 예전 계산식의 결과와 정확히 같을 때 — 사용자가 직접 고친
//     타수는 건드리지 않는다
// 고칠 때는 현재 계산식으로 다시 계산하고, 티샷 결과를 teeOnGreen=false로
// 남겨 이후 홀 확정 때 다시 흔들리지 않게 한다.

// 예전 계산식 두 가지 (파3, 티샷 그린 놓침 기준)
//   A: ~aa4d49a  — 해저드도 OB처럼 벌타+재샷
//   B: aa4d49a~aac33e6 — 해저드는 1벌타
const oldStrokesA = (s) => {
  const pen = (s.ob || 0) + (s.hazard || 0);
  return 1 + pen + (s.extraShots?.length || 0) + (s.putts || 0) + pen;
};
const oldStrokesB = (s) => {
  const ob = s.ob || 0;
  return 1 + ob + (s.extraShots?.length || 0) + (s.putts || 0) + ob + (s.hazard || 0);
};
// 현재 계산식 (ScoringView.calcAutoStrokes, 파3 티샷 그린 놓침)
const fixedStrokes = (s) => {
  const ob = s.ob || 0;
  return 1 + (1 + ob + (s.extraShots?.length || 0)) + (s.putts || 0) + ob + (s.hazard || 0);
};

const holedOut = (s) =>
  (Array.isArray(s.puttDetails) && s.puttDetails.some((p) => p?.holein === 'success'))
  || (s.extraShots || []).some((e) => e?.onGreen === 'chip-in');

function fixPar3Score(s) {
  if (!s || s.strokesManual || s.teeOnGreen != null) return null;
  if (!s.teeClub || !holedOut(s)) return null;
  const missedGreen = s.onGreen != null || (s.extraShots?.length ?? 0) > 0;
  if (!missedGreen) return null;
  if (s.strokes !== oldStrokesA(s) && s.strokes !== oldStrokesB(s)) return null;
  const strokes = fixedStrokes(s);
  if (strokes === s.strokes) return null;
  return { ...s, strokes, gir: (strokes - (s.putts || 0)) <= 1, girAuto: true, teeOnGreen: false };
}

// 반환: 고친 라운드와 고친 홀 수. 고칠 게 없으면 changed = 0이고 원본을 그대로 돌려준다.
export function fixPar3MissedGreenStrokes(round) {
  if (!round || !Array.isArray(round.holes) || !Array.isArray(round.players)) return { round, changed: 0 };
  let changed = 0;
  const holes = round.holes.map((h) => {
    if (h?.par !== 3 || !h.scores) return h;
    let scores = h.scores;
    round.players.forEach((p) => {
      const fixed = fixPar3Score(h.scores[p]);
      if (fixed) { scores = { ...scores, [p]: fixed }; changed++; }
    });
    return scores === h.scores ? h : { ...h, scores };
  });
  return changed > 0 ? { round: { ...round, holes }, changed } : { round, changed: 0 };
}
