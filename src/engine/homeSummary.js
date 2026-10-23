// ─── 홈 요약 ─────────────────────────────────────────────────────────────────────
//
// 홈 화면에 보이는 "내 폼": 핸디캡 · 최근 5라운드 평균과 이전 5라운드 대비 · 약점/강점 1순위.
//   · 핸디캡과 평균 스코어는 점수만으로 계산되므로 18홀 라운드 전부(동반자와 함께 친 것 포함)를 내 점수로 센다.
//   · 약점/강점은 샷 단위 분석이라 통계와 같은 라운드(1인 18홀)만 쓴다 (3라운드 이상일 때).

import { buildHandicap } from './handicap.js';
import { buildSkillBalance } from './statsReport.js';
import { isFullRound } from './nines.js';
import { myPlayer } from './players.js';

export const RECENT_N = 5;
export const FORM_MIN_ROUNDS = 3;
export const SKILL_NAME = { tee: '티샷', approach: '어프로치', shortGame: '숏게임', putting: '퍼팅', penalty: '벌타' };

const sortDesc = (a, b) => new Date(b.date) - new Date(a.date);
const avg = (list) => list.reduce((s, v) => s + v, 0) / list.length;
const round1 = (n) => Math.round(n * 10) / 10;

// allRounds: 모든 라운드 · statRounds: 통계에 들어가는 라운드 · userName: 동반자 라운드에서 "나"를 찾는 이름
export function buildHomeSummary(allRounds, statRounds, userName) {
  const full = (allRounds || []).filter(isFullRound).sort(sortDesc);
  const totalOf = (r) => {
    const me = myPlayer(r, userName);
    return r.holes.reduce((s, h) => s + (h.scores?.[me]?.strokes || 0), 0);
  };
  const recent = full.slice(0, RECENT_N).map(totalOf);
  const prev = full.slice(RECENT_N, RECENT_N * 2).map(totalOf);
  const hasForm = recent.length >= FORM_MIN_ROUNDS;
  const recentAvg = hasForm ? round1(avg(recent)) : null;
  const prevAvg = hasForm && prev.length >= FORM_MIN_ROUNDS ? round1(avg(prev)) : null;

  const h = buildHandicap(allRounds, userName);
  const balance = (statRounds || []).length >= FORM_MIN_ROUNDS ? buildSkillBalance(statRounds) : null;
  return {
    handicap: { index: h.index, delta: h.delta, count: h.count },
    recent: { n: recent.length, avg: recentAvg, prevAvg, delta: recentAvg != null && prevAvg != null ? round1(recentAvg - prevAvg) : null },
    weakest: balance?.weakest ? { id: balance.weakest, label: SKILL_NAME[balance.weakest] ?? balance.weakest } : null,
    strongest: balance?.strongest ? { id: balance.strongest, label: SKILL_NAME[balance.strongest] ?? balance.strongest } : null,
    hasForm,
  };
}
