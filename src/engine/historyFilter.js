// 히스토리 찾기 — 라운드가 쌓여도 코스 · 연도 · 9홀/18홀로 좁히고 정렬해서 볼 수 있게 한다.
import { myPlayer, totalPar } from './players.js';
import { isNineHoleRound } from './nines.js';

export const HISTORY_SORTS = [
  { id: 'recent', label: '최신순' },
  { id: 'old', label: '오래된순' },
  { id: 'best', label: '잘 친 순' },   // 파 대비가 낮은(잘 친) 라운드가 앞
];

export const HISTORY_KINDS = [
  { id: 'all', label: '전체' },
  { id: 'full', label: '18홀' },
  { id: 'nine', label: '9홀' },
];

// 히스토리 카드에 보이는 것과 같은 계산 (타수 − 파)
export function diffOf(round, userName) {
  const me = myPlayer(round, userName);
  const total = round.holes.reduce((s, h) => s + (h.scores?.[me]?.strokes || 0), 0);
  return total - totalPar(round);
}

const yearOf = (round) => {
  const d = new Date(round.date);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
};

// 기록이 있는 연도들 (최근 연도부터)
export const roundYears = (rounds) => [...new Set(rounds.map(yearOf).filter((y) => y != null))].sort((a, b) => b - a);

// 코스 이름(OUT · IN 코스 이름 포함)과 홀 메모에서 찾는다. 공백으로 나눈 낱말이 모두 들어 있어야 한다.
export function matchesQuery(round, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const memos = round.holes.flatMap((h) => Object.values(h.scores ?? {}).map((s) => s?.memo ?? ''));
  const haystack = [round.courseName, round.outCourseName, round.inCourseName, round.teeBox, ...memos]
    .filter(Boolean).join(' ').toLowerCase();
  return words.every((w) => haystack.includes(w));
}

export const isFiltered = ({ query = '', year = null, kind = 'all' } = {}) => query.trim() !== '' || year != null || kind !== 'all';

// rounds 는 지금 보이는 순서(최신순)로 들어온다. 'recent' 는 그 순서 그대로, 'old' 는 거꾸로, 'best' 는 파 대비 순 (같으면 최신이 앞).
export function filterHistory(rounds, userName, { query = '', year = null, kind = 'all', sort = 'recent' } = {}) {
  const kept = rounds.filter((r) => {
    if (year != null && yearOf(r) !== year) return false;
    if (kind === 'nine' && !isNineHoleRound(r)) return false;
    if (kind === 'full' && isNineHoleRound(r)) return false;
    return matchesQuery(r, query);
  });
  if (sort === 'old') return [...kept].reverse();
  if (sort === 'best') {
    return kept.map((r, i) => ({ r, i, d: diffOf(r, userName) })).sort((a, b) => a.d - b.d || a.i - b.i).map((x) => x.r);
  }
  return kept;
}
