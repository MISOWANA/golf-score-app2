// ─── 그린을 놓친 방향 ──────────────────────────────────────────────────────────
//
// 규정 타수 안에 그린에 올리지 못한 홀(GIR 실패)에서, 공이 핀 기준으로 어느 쪽으로 빠졌는지를 한 번 고른다.
//   score.greenMiss = 'long' | 'right' | 'short' | 'left'   (선택 입력 — 비워 둬도 흐름을 막지 않는다)
//
// '온그린 랜딩 방향'(score.onGreenLanding, 1~12시)은 그린에 *올라간* 홀의 공 위치다. 이것은 그린을 *놓친* 홀의
// 방향이라 따로 둔다. 인사이트 규칙(그린 미스 방향 편중 · 숏/롱 반복)이 이 값을 쓴다.

export const GREEN_MISS_DIRS = [
  { id: 'long', label: '롱' },
  { id: 'right', label: '라이트' },
  { id: 'short', label: '숏' },
  { id: 'left', label: '레프트' },
];
const IDS = new Set(GREEN_MISS_DIRS.map((d) => d.id));

// 이 홀이 '그린을 놓친 홀'인지 — 방향을 물을지 정한다.
//   gir 가 false 면 놓친 홀이다 (파3 티샷 실패 · 파4 세컨샷 실패 …).
//   파5 이상은 세컨샷 뒤 온그린이 GIR 이 아니라 2온이라 gir 가 바뀌지 않으므로, 규정 타수인 세 번째 샷
//   (추가 샷 첫 번째)이 그린을 놓쳤는지를 추가 샷 기록으로 본다.
export function greenMissed(score, par) {
  if (!score) return false;
  if (score.gir === false) return true;
  return par >= 5 && score.extraShots?.[0]?.onGreen === false;
}

// 문장 속 표현 — '그린을 오른쪽 방향으로 놓쳤습니다'
export const GREEN_MISS_WORD = { long: '뒤쪽', right: '오른쪽', short: '앞쪽', left: '왼쪽' };

// 저장된 방향 (알 수 없는 값이면 null)
export const greenMissOf = (score) => (IDS.has(score?.greenMiss) ? score.greenMiss : null);

// 인사이트 엔진에 넘기는 방향 — 그린을 놓친 홀에서만. 놓치지 않은 홀에 남은 값(방향을 고른 뒤 성공으로 고침)은 무시한다.
export const effectiveGreenMiss = (score, par) => (greenMissed(score, par) ? greenMissOf(score) : null);

// 스탯 어프로치 탭용 — 그린을 놓친 홀 수와, 그중 방향을 기록한 홀의 방향별 횟수.
// 입력한(touched) 홀만 센다. 인사이트의 그린 미스 규칙(metrics.greenMissTotal …)과 같은 정의다 → 같은 숫자.
export function buildGreenMissStats(rounds) {
  const counts = { long: 0, right: 0, short: 0, left: 0 };
  let missed = 0;
  let recorded = 0;
  rounds.forEach((r) => {
    const p = r.players[0];
    r.holes.forEach((h) => {
      const s = h.scores?.[p];
      if (!s || !s.touched || !greenMissed(s, h.par)) return;
      missed++;
      const dir = greenMissOf(s);
      if (dir) { counts[dir]++; recorded++; }
    });
  });
  let top = null;
  GREEN_MISS_DIRS.forEach((d) => { if (counts[d.id] > 0 && (top == null || counts[d.id] > counts[top])) top = d.id; });
  return { missed, recorded, counts, top };
}
