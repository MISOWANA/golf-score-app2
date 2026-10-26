import { describe, it, expect } from 'vitest';
import { filterHistory, matchesQuery, roundYears, isFiltered, diffOf, HISTORY_SORTS } from './historyFilter.js';
import { makeFullRound, makeNineRound, played } from '../test/fixtures.js';

const ME = '테스터';
// 최신 → 오래된 순으로 들어온다
const rounds = [
  makeFullRound(1, ME, { id: 'a', courseName: '남서울CC', date: new Date(2026, 8, 25).toISOString() }),
  makeNineRound(2, 'out', ME, { id: 'b', courseName: '버치힐', date: new Date(2026, 5, 3).toISOString() }),
  makeFullRound(3, ME, { id: 'c', courseName: '버치힐', date: new Date(2025, 10, 11).toISOString() }),
  makeFullRound(4, ME, { id: 'd', courseName: '핀크스', date: new Date(2025, 4, 1).toISOString() }),
];
const ids = (list) => list.map((r) => r.id);

describe('filterHistory', () => {
  it('아무것도 고르지 않으면 그대로', () => {
    expect(ids(filterHistory(rounds, ME))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('코스 이름으로 찾는다 (대소문자 · 부분 일치)', () => {
    expect(ids(filterHistory(rounds, ME, { query: '버치' }))).toEqual(['b', 'c']);
    expect(ids(filterHistory(rounds, ME, { query: 'cc' }))).toEqual(['a']);
    expect(ids(filterHistory(rounds, ME, { query: '없는코스' }))).toEqual([]);
  });

  it('공백으로 나눈 낱말이 모두 있어야 한다', () => {
    expect(ids(filterHistory(rounds, ME, { query: '버치 힐' }))).toEqual(['b', 'c']);
    expect(ids(filterHistory(rounds, ME, { query: '버치 핀크스' }))).toEqual([]);
  });

  it('홀 메모에서도 찾는다', () => {
    const r = makeFullRound(5, ME, { id: 'm', courseName: '메모CC' });
    r.holes[3].scores[ME] = played(r.holes[3].par, { memo: '티샷 OB 조심' });
    expect(matchesQuery(r, 'ob')).toBe(true);
    expect(matchesQuery(r, '벙커')).toBe(false);
    expect(ids(filterHistory([...rounds, r], ME, { query: 'ob' }))).toEqual(['m']);
  });

  it('연도 · 9홀/18홀로 좁힌다', () => {
    expect(ids(filterHistory(rounds, ME, { year: 2025 }))).toEqual(['c', 'd']);
    expect(ids(filterHistory(rounds, ME, { kind: 'nine' }))).toEqual(['b']);
    expect(ids(filterHistory(rounds, ME, { kind: 'full' }))).toEqual(['a', 'c', 'd']);
    expect(ids(filterHistory(rounds, ME, { year: 2026, kind: 'full', query: '남서울' }))).toEqual(['a']);
  });

  it('정렬: 최신순은 들어온 순서, 오래된순은 거꾸로, 잘 친 순은 파 대비 순(같으면 최신 먼저)', () => {
    expect(ids(filterHistory(rounds, ME, { sort: 'old' }))).toEqual(['d', 'c', 'b', 'a']);
    const best = filterHistory(rounds, ME, { sort: 'best' });
    const diffs = best.map((r) => diffOf(r, ME));
    expect(diffs).toEqual([...diffs].sort((x, y) => x - y));
    expect(new Set(ids(best))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('입력 배열은 바꾸지 않는다', () => {
    const copy = [...rounds];
    filterHistory(rounds, ME, { sort: 'old' });
    filterHistory(rounds, ME, { sort: 'best' });
    expect(rounds).toEqual(copy);
  });
});

describe('도움 함수', () => {
  it('roundYears: 최근 연도부터, 중복 없이', () => {
    expect(roundYears(rounds)).toEqual([2026, 2025]);
    expect(roundYears([])).toEqual([]);
  });

  it('isFiltered: 걸린 조건이 있는지 (정렬은 조건이 아니다)', () => {
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ query: '  ' })).toBe(false);
    expect(isFiltered({ query: '버치' })).toBe(true);
    expect(isFiltered({ year: 2025 })).toBe(true);
    expect(isFiltered({ kind: 'nine' })).toBe(true);
    expect(isFiltered({ sort: 'best' })).toBe(false);
  });

  it('정렬 선택지는 3개', () => {
    expect(HISTORY_SORTS.map((s) => s.id)).toEqual(['recent', 'old', 'best']);
  });
});
