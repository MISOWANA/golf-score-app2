import { describe, it, expect } from 'vitest';
import { createRound, defaultHoleScore } from './newRound.js';
import { isValidRound } from './roundValidation.js';
import { defaultScore, PARS } from '../test/fixtures.js';

const base = { id: '1', players: ['나'], courseName: 'CC', pars: PARS, teeBox: '화이트티', date: '2026-10-01T12:00:00.000Z' };

describe('createRound', () => {
  it('18홀: 1~18번 홀과 전체 파', () => {
    const r = createRound(base);
    expect(r.holes).toHaveLength(18);
    expect(r.holes.map((h) => h.holeNumber)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(r.pars).toEqual(PARS);
    expect(r.nine).toBeUndefined();
    expect(isValidRound(r)).toBe(true);
  });

  it('OUT 코스 9홀: 1~9번 홀 9개와 앞 9개 파', () => {
    const r = createRound({ ...base, nine: 'out' });
    expect(r.holes).toHaveLength(9);
    expect(r.holes.map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(r.pars).toEqual(PARS.slice(0, 9));
    expect(r.holes.map((h) => h.par)).toEqual(PARS.slice(0, 9));
    expect(r.nine).toBe('out');
    expect(isValidRound(r)).toBe(true);
  });

  it('IN 코스 9홀: 홀 번호는 1~9 (10~18 이 아니다)이고 파는 뒤 9개', () => {
    const r = createRound({ ...base, nine: 'in' });
    expect(r.holes.map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(r.pars).toEqual(PARS.slice(9));
    expect(r.nine).toBe('in');
    expect(r.currentHole).toBe(0);
  });

  it('입력하지 않은 홀의 기본값은 파·2퍼트·GIR 성공이고 touched 는 false', () => {
    const r = createRound({ ...base, nine: 'in' });
    expect(r.holes[0].scores['나']).toEqual(defaultScore(r.holes[0].par));
    expect(defaultHoleScore(4).touched).toBe(false);
  });

  it('여러 플레이어는 모두 기본값을 받는다', () => {
    const r = createRound({ ...base, players: ['나', '친구'], nine: 'out' });
    expect(Object.keys(r.holes[0].scores)).toEqual(['나', '친구']);
  });

  it('OUT·IN 코스 이름을 비우면 OUT·IN 으로 저장한다', () => {
    const r = createRound({ ...base, outCourseName: '', inCourseName: undefined });
    expect([r.outCourseName, r.inCourseName]).toEqual(['OUT', 'IN']);
  });

  it('그린 스피드는 유효한 값만 저장하고, 클럽 추천은 false 일 때만 끈다', () => {
    expect(createRound({ ...base, greenSpeed: 10.5 }).greenSpeed).toBe(10.5);
    expect(createRound({ ...base, greenSpeed: 99 }).greenSpeed).toBeNull();
    expect(createRound({ ...base, clubRecommend: false }).clubRecommend).toBe(false);
    expect(createRound({ ...base }).clubRecommend).toBe(true);
  });
});
