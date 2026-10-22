import { describe, it, expect } from 'vitest';
import { isBackHole, isNineHoleRound, isFullRound, holeNoOf, ninesOf, holePlan, roundKindLabel, nineSideOf } from './nines.js';
import { makeFullRound, makeNineRound, PARS } from '../test/fixtures.js';

describe('9홀 · 18홀 구분', () => {
  it('holes 개수로 9홀 라운드를 안다', () => {
    expect(isNineHoleRound(makeFullRound(1))).toBe(false);
    expect(isFullRound(makeFullRound(1))).toBe(true);
    expect(isNineHoleRound(makeNineRound(1, 'out'))).toBe(true);
    expect(isNineHoleRound(makeNineRound(1, 'in'))).toBe(true);
  });

  it('18홀의 전반·후반은 홀 번호로 가른다 (번호가 없으면 순서로)', () => {
    expect(isBackHole({ holeNumber: 9 }, 0)).toBe(false);
    expect(isBackHole({ holeNumber: 10 }, 0)).toBe(true);
    expect(isBackHole({}, 8)).toBe(false);
    expect(isBackHole({}, 9)).toBe(true);
  });

  it('holeNoOf: 9홀은 후반 코스를 쳐도 1~9번', () => {
    expect(holeNoOf(makeNineRound(1, 'in'), 0)).toBe(1);
    expect(holeNoOf(makeNineRound(1, 'in'), 8)).toBe(9);
    expect(holeNoOf({ holes: [{}, {}] }, 1)).toBe(2);
  });

  it('nineSideOf: 어느 코스의 파를 썼는지', () => {
    expect(nineSideOf(makeNineRound(1, 'in'))).toBe('in');
    expect(nineSideOf(makeNineRound(1, 'out'))).toBe('out');
    expect(nineSideOf({ holes: [] })).toBe('out');
  });
});

describe('ninesOf', () => {
  it('18홀은 OUT·IN 두 묶음이고 index 는 배열 위치다', () => {
    const [out, inn] = ninesOf(makeFullRound(1));
    expect([out.key, inn.key]).toEqual(['out', 'in']);
    expect(out.holes.map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(inn.holes.map((x) => x.index)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('9홀 라운드는 한 묶음 — 코스 이름이 기본값(OUT·IN)이면 "9홀"로 부른다', () => {
    const nines = ninesOf(makeNineRound(1, 'out'));
    expect(nines).toHaveLength(1);
    expect(nines[0].holes).toHaveLength(9);
    expect(nines[0].label).toBe('9홀');
  });

  it('9홀 라운드에 코스 이름이 있으면 그 이름을 쓴다 (후반 코스는 inCourseName)', () => {
    const inn = makeNineRound(1, 'in', '테스터', { inCourseName: '레이크', outCourseName: '파인' });
    expect(ninesOf(inn)[0]).toMatchObject({ key: 'in', label: '레이크' });
    const out = makeNineRound(2, 'out', '테스터', { inCourseName: '레이크', outCourseName: '파인' });
    expect(ninesOf(out)[0]).toMatchObject({ key: 'out', label: '파인' });
  });

  it('후반 9홀 라운드도 홀 번호는 1~9 이고 배열 위치는 0~8', () => {
    const [n] = ninesOf(makeNineRound(1, 'in'));
    expect(n.holes.map((x) => x.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(n.holes.map((x) => x.hole.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('코스 이름이 없으면 18홀은 OUT·IN 을 쓴다', () => {
    const r = makeFullRound(1); r.outCourseName = ''; r.inCourseName = undefined;
    expect(ninesOf(r).map((n) => n.label)).toEqual(['OUT', 'IN']);
  });

  it('홀이 없으면 묶음도 없다', () => {
    expect(ninesOf({ holes: [] })).toEqual([]);
  });
});

describe('holePlan', () => {
  it('18홀: 1~18번 전체 파', () => {
    const plan = holePlan(PARS, null);
    expect(plan).toHaveLength(18);
    expect(plan[17]).toEqual({ holeNumber: 18, par: PARS[17] });
  });

  it('OUT 코스 9홀: 1~9번, 앞 9개 파', () => {
    expect(holePlan(PARS, 'out').map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(holePlan(PARS, 'out').map((h) => h.par)).toEqual(PARS.slice(0, 9));
  });

  it('IN 코스 9홀: 홀 번호는 1~9 (10~18 을 보여 주지 않는다), 파는 뒤 9개', () => {
    expect(holePlan(PARS, 'in').map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(holePlan(PARS, 'in').map((h) => h.par)).toEqual(PARS.slice(9));
  });
});

describe('roundKindLabel', () => {
  it('라운드 종류 이름은 18홀 · 9홀 (전반·후반을 내세우지 않는다)', () => {
    expect(roundKindLabel(makeFullRound(1))).toBe('18홀');
    expect(roundKindLabel(makeNineRound(1, 'out'))).toBe('9홀');
    expect(roundKindLabel(makeNineRound(1, 'in'))).toBe('9홀');
  });
});
