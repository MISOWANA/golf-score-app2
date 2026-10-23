// ─── 개인 기록 갱신 ──────────────────────────────────────────────────────────────
//
// 라운드 리포트에서 "이번 라운드가 내 기록을 깼는지" 알려 준다.
//   · 이 라운드보다 먼저 친 18홀 라운드와 견준다 (이전 기록을 엄격히 넘어야 한다 — 같으면 갱신이 아니다).
//   · 일반 기록은 이전 18홀 라운드가 3개 이상 쌓인 뒤부터 — 처음 몇 라운드가 전부 "신기록"이 되지 않게.
//     코스 베스트는 같은 코스를 이전에 2번 이상 쳤을 때부터.
//   · 스코어는 동반자와 함께 친 라운드도 내 점수로 센다. GIR · 퍼트 · 버디는 입력한 홀 기준이라 1인 라운드만 본다.
//     입력하지 않은 홀이 있는 라운드는 지표 기록의 비교 대상에서 뺀다 (홀이 비어서 낮게 나온 값과 견주지 않으려고).

import { summarizeRound } from './roundSummary.js';
import { compareValues } from './roundCard.js';
import { myPlayer } from './players.js';
import { isFullRound } from './nines.js';
import { courseKey } from './courseHistory.js';

export const RECORD_MIN_ROUNDS = 3;
export const COURSE_RECORD_MIN_ROUNDS = 2;
const FULL_HOLES = 18;

const earlier = (a, b) => new Date(a.date) < new Date(b.date);

function scoreOf(round, userName) {
  const me = myPlayer(round, userName);
  return round.holes.reduce((s, h) => s + (h.scores?.[me]?.strokes || 0), 0);
}

// 갱신한 기록들 [{ id, label, value, previous, unit }] — 없으면 []
//   id: score(베스트 스코어) · course(이 코스 베스트) · putts(최소 퍼트) · gir(최다 GIR) · birdies(최다 버디)
export function buildRoundRecords(round, rounds, userName) {
  if (!round || !isFullRound(round)) return [];
  const prior = (rounds || []).filter((r) => r.id !== round.id && isFullRound(r) && r.completed !== false && earlier(r, round));
  const out = [];

  // 베스트 스코어(전체) — 못 깼으면 이 코스 베스트
  const total = scoreOf(round, userName);
  if (total > 0 && prior.length >= RECORD_MIN_ROUNDS) {
    const prev = Math.min(...prior.map((r) => scoreOf(r, userName)).filter((n) => n > 0));
    if (Number.isFinite(prev) && total < prev) out.push({ id: 'score', label: '베스트 스코어', value: total, previous: prev, unit: '타' });
  }
  if (total > 0 && !out.some((x) => x.id === 'score')) {
    const sameCourse = prior.filter((r) => courseKey(r.courseName) === courseKey(round.courseName));
    if (sameCourse.length >= COURSE_RECORD_MIN_ROUNDS) {
      const prev = Math.min(...sameCourse.map((r) => scoreOf(r, userName)).filter((n) => n > 0));
      if (Number.isFinite(prev) && total < prev) out.push({ id: 'course', label: '이 코스 베스트', value: total, previous: prev, unit: '타' });
    }
  }

  // 1인 라운드의 상세 지표 기록 — 18홀을 모두 입력한 라운드끼리만 견준다
  if (round.players.length === 1) {
    const mineS = summarizeRound(round, round.players[0]);
    const solo = prior
      .filter((r) => r.players.length === 1)
      .map((r) => ({ c: compareValues(r), s: summarizeRound(r, r.players[0]) }))
      .filter((v) => v.s.playedCount === FULL_HOLES);
    if (mineS.playedCount === FULL_HOLES && solo.length >= RECORD_MIN_ROUNDS) {
      const mine = compareValues(round);
      const prevPutts = Math.min(...solo.map((v) => v.c.putts));
      if (mine.putts != null && mine.putts < prevPutts) out.push({ id: 'putts', label: '최소 퍼트', value: mine.putts, previous: prevPutts, unit: '개' });

      const prevGir = Math.max(...solo.map((v) => v.s.girHoles));
      if (mineS.girHoles > prevGir) out.push({ id: 'gir', label: '최다 GIR', value: mineS.girHoles, previous: prevGir, unit: '개' });

      const birdies = (s) => s.birdies + s.eagles;
      const prevBirdies = Math.max(...solo.map((v) => birdies(v.s)));
      if (birdies(mineS) > prevBirdies && birdies(mineS) > 0) out.push({ id: 'birdies', label: '최다 버디', value: birdies(mineS), previous: prevBirdies, unit: '개' });
    }
  }
  return out;
}

// 기록 한 줄 문구 — "베스트 스코어 74타 (이전 76타)"
export const recordText = (r) => `${r.label} ${r.value}${r.unit} (이전 ${r.previous}${r.unit})`;
