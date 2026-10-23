// ─── 같은 코스 과거 기록 ─────────────────────────────────────────────────────────
//
// 라운드 설정에서 코스를 고르면, 그 코스를 전에 쳤을 때의 기록을 보여 준다: 최근 스코어 · 베스트 · 어려웠던 홀 · 홀 메모.
//   · 같은 코스 = 골프장 이름이 같은 라운드 (공백·대소문자 무시).
//   · 홀 단위(어려웠던 홀 · 메모)는 "어느 9홀의 몇 번째 홀"까지 같아야 비교한다 — 27홀 골프장에서 이스트+웨스트를 쳤던 기록의
//     웨스트 3번 홀을 이번의 이스트+웨스트 후반 3번 홀과 섞지 않는다. 코스 이름을 비워 둔 9홀은 OUT · IN 으로 본다.
//   · 18홀과 9홀 라운드를 모두 쓰고, 동반자와 함께 친 라운드는 내 점수로 센다 (핸디캡 · 홈 평균과 같다).

import { myPlayer, totalPar } from './players.js';
import { isNineHoleRound, nineSideOf } from './nines.js';

export const RECENT_SHOWN = 3;
export const HARD_HOLES_SHOWN = 3;
export const MEMOS_SHOWN = 3;
export const MIN_HOLE_SAMPLES = 2;       // 어려웠던 홀로 꼽으려면 이 코스·이 홀을 이만큼은 쳐 봐야 한다
export const HARD_HOLE_MIN_DIFF = 0.5;   // 평균이 파보다 이만큼은 높아야 "어려웠던 홀"

export const courseKey = (name) => String(name ?? '').replace(/\s+/g, '').toLowerCase();

const nineLabel = (name, fallback) => (String(name ?? '').trim() || fallback);

// 라운드의 i번째 홀이 "어느 9홀의 몇 번째"인지 — 같은 홀끼리 같은 값이 나온다
function holeKeyOf(round, index) {
  if (isNineHoleRound(round)) {
    const side = nineSideOf(round);
    return `${courseKey(side === 'in' ? nineLabel(round.inCourseName, 'IN') : nineLabel(round.outCourseName, 'OUT'))}#${index + 1}`;
  }
  return index < 9
    ? `${courseKey(nineLabel(round.outCourseName, 'OUT'))}#${index + 1}`
    : `${courseKey(nineLabel(round.inCourseName, 'IN'))}#${index - 8}`;
}

// 설정 화면의 치려는 홀들 — [{ key, holeNumber }] (holeNumber 는 이번 라운드에서 부르는 번호)
export function plannedHoles({ nine, outName, inName, holeCount }) {
  const out = courseKey(nineLabel(outName, 'OUT'));
  const inn = courseKey(nineLabel(inName, 'IN'));
  if (nine === 'out') return Array.from({ length: 9 }, (_, i) => ({ key: `${out}#${i + 1}`, holeNumber: i + 1 }));
  if (nine === 'in') return Array.from({ length: 9 }, (_, i) => ({ key: `${inn}#${i + 1}`, holeNumber: i + 1 }));
  const n = holeCount ?? 18;
  return Array.from({ length: n }, (_, i) => ({ key: i < 9 ? `${out}#${i + 1}` : `${inn}#${i - 8}`, holeNumber: i + 1 }));
}

const byDateDesc = (a, b) => new Date(b.date) - new Date(a.date);

// rounds: 모든 라운드 · opts: { courseName, outName, inName, nine, userName }
// 이 코스를 친 기록이 없으면 null.
export function buildCourseHistory(rounds, { courseName, outName, inName, nine = null, userName } = {}) {
  const key = courseKey(courseName);
  if (!key) return null;
  const here = (rounds || []).filter((r) => courseKey(r.courseName) === key && r.completed !== false).sort(byDateDesc);
  if (here.length === 0) return null;

  const totalOf = (r) => { const me = myPlayer(r, userName); return r.holes.reduce((s, h) => s + (h.scores?.[me]?.strokes || 0), 0); };
  const summarize = (r) => {
    const total = totalOf(r);
    return { id: r.id, date: r.date, total, diff: total - totalPar(r), nine: isNineHoleRound(r), players: r.players.length };
  };

  const fulls = here.filter((r) => !isNineHoleRound(r)).map(summarize);
  const best = fulls.length ? fulls.reduce((a, b) => (b.total < a.total ? b : a)) : null;

  // 홀별 기록 — 치려는 홀과 같은 홀만, 입력한 홀만
  const planned = plannedHoles({ nine, outName, inName });
  const numberOf = new Map(planned.map((p) => [p.key, p.holeNumber]));
  const perHole = new Map();
  const memos = [];
  here.forEach((r) => {
    const me = myPlayer(r, userName);
    r.holes.forEach((h, i) => {
      const k = holeKeyOf(r, i);
      if (!numberOf.has(k)) return;
      const s = h.scores?.[me];
      if (!s || s.touched === false) return;
      if (!perHole.has(k)) perHole.set(k, []);
      perHole.get(k).push({ diff: (s.strokes ?? h.par) - h.par, par: h.par });
      if (s.memo && String(s.memo).trim()) memos.push({ holeNumber: numberOf.get(k), text: String(s.memo).trim(), date: r.date });
    });
  });

  const hardest = [...perHole.entries()]
    .map(([k, list]) => ({ holeNumber: numberOf.get(k), par: list[0].par, n: list.length, avgDiff: list.reduce((a, x) => a + x.diff, 0) / list.length }))
    .filter((x) => x.n >= MIN_HOLE_SAMPLES && x.avgDiff >= HARD_HOLE_MIN_DIFF)
    .sort((a, b) => b.avgDiff - a.avgDiff || a.holeNumber - b.holeNumber)
    .slice(0, HARD_HOLES_SHOWN)
    .map((x) => ({ ...x, avgDiff: Math.round(x.avgDiff * 10) / 10 }));

  return {
    count: here.length,
    best,
    recent: here.slice(0, RECENT_SHOWN).map(summarize),
    hardest,
    memos: memos.slice(0, MEMOS_SHOWN),     // here 가 최근 순이라 memos 도 최근 것부터
  };
}
