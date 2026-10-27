import { describe, it, expect } from 'vitest';
import { clubConsistency, MIN_CONSISTENCY_N, MIN_CONSISTENCY_CLUBS } from './statsReport.js';

// 클럽 리포트의 한 줄 (buildClubReport 의 rows)
const row = (key, median, q1, q3, n = 8) => ({ key, label: key.toUpperCase(), n, median, q1, q3 });

describe('clubConsistency — 클럽별 거리 일관성 (클럽 사이 간격은 판정하지 않는다)', () => {
  it('중간 절반의 폭을 중앙값에 견준 비율이 작은 클럽부터 줄을 세운다', () => {
    const c = clubConsistency([
      row('driver', 220, 205, 235),     // 폭 30 · 13.6%
      row('iron7', 130, 126, 134),      // 폭 8 · 6.2%
      row('iron9', 110, 100, 120),      // 폭 20 · 18.2%
    ]);
    expect(c.enough).toBe(true);
    expect(c.list.map((x) => x.key)).toEqual(['iron7', 'driver', 'iron9']);
    expect(c.steadiest).toMatchObject({ key: 'iron7', width: 8 });
    expect(c.widest).toMatchObject({ key: 'iron9', width: 20 });
  });

  it('긴 클럽이 폭이 절대값으로 커도 비율이 같으면 같은 정도로 본다', () => {
    const c = clubConsistency([row('a', 200, 190, 210), row('b', 100, 95, 105), row('c', 150, 140, 160)]);
    expect(c.list.map((x) => Math.round(x.spread * 100) / 100)).toEqual([0.1, 0.1, 0.13]);
    expect(c.list[2].key).toBe('c');
  });

  it(`샷이 ${MIN_CONSISTENCY_N}번 미만이거나 60m 안쪽(칩·피치) 클럽, 범위가 없는 클럽은 뺀다`, () => {
    const c = clubConsistency([
      row('few', 150, 140, 160, MIN_CONSISTENCY_N - 1),
      row('short', 50, 45, 55),
      { key: 'noiqr', label: 'NOIQR', n: 9, median: 140, q1: null, q3: null },
      row('ok', 130, 126, 134),
    ]);
    expect(c.list.map((x) => x.key)).toEqual(['ok']);
  });

  it(`클럽이 ${MIN_CONSISTENCY_CLUBS}개 미만이면 비교하지 않는다 — 가장 일정한·들쭉날쭉한 클럽을 말하지 않는다`, () => {
    const c = clubConsistency([row('a', 130, 126, 134), row('b', 110, 100, 120)]);
    expect(c).toMatchObject({ enough: false, steadiest: null, widest: null });
    expect(c.list).toHaveLength(2);
  });

  it('비어 있어도 안전하다', () => {
    expect(clubConsistency([])).toMatchObject({ list: [], enough: false });
    expect(clubConsistency(undefined)).toMatchObject({ list: [], enough: false });
  });
});
