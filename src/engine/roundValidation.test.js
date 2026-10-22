import { describe, it, expect } from 'vitest';
import { isValidRound, normalizeRound } from './roundValidation.js';
import { makeFullRound, makeNoParsRound, PARS } from '../test/fixtures.js';

describe('isValidRound', () => {
  it('정상 라운드를 통과시킨다', () => {
    expect(isValidRound(makeFullRound(1))).toBe(true);
  });

  it.each([
    ['id 없음', (r) => { delete r.id; }],
    ['플레이어 없음', (r) => { r.players = []; }],
    ['holes 없음', (r) => { r.holes = []; }],
    ['점수 객체 없음', (r) => { r.holes[0].scores = {}; }],
    ['날짜가 날짜가 아님', (r) => { r.date = 'not-a-date'; }],
  ])('깨진 라운드를 거른다: %s', (_, mutate) => {
    const r = makeFullRound(1);
    mutate(r);
    expect(isValidRound(r)).toBe(false);
  });

  it('pars 가 없는 예전 백업도 받는다 (normalizeRound 로 채운다)', () => {
    expect(isValidRound(makeNoParsRound(1))).toBe(true);
  });
});

describe('normalizeRound', () => {
  it('pars 가 없으면 홀의 파로 채운다', () => {
    const r = normalizeRound(makeNoParsRound(1));
    expect(r.pars).toEqual(PARS);
  });

  it('pars 길이가 홀 수와 다르면 홀의 파로 다시 만든다', () => {
    const r = makeFullRound(1); r.pars = [4, 4];
    expect(normalizeRound(r).pars).toEqual(PARS);
  });

  it('이미 맞는 라운드는 같은 객체를 돌려준다 (불필요한 리렌더 방지)', () => {
    const r = makeFullRound(1);
    expect(normalizeRound(r)).toBe(r);
  });

  it('원본을 바꾸지 않는다', () => {
    const r = makeNoParsRound(1);
    normalizeRound(r);
    expect(r.pars).toBeUndefined();
  });
});
