import { describe, it, expect } from 'vitest';
import { playedNineOf, convertPartialToNine } from './nineConversion.js';
import { isValidRound } from './roundValidation.js';
import { makeFullRound, makeHalfRound, makeMultiRound, defaultScore, PARS } from '../test/fixtures.js';

const ME = '테스터';

// 후반 9홀만 친 예전 라운드: 앞 9홀은 입력 없음(파로 채움), 뒤 9홀은 입력
function backNineOnly() {
  const r = makeFullRound(1);
  r.holes.forEach((h, i) => { if (i < 9) h.scores[ME] = defaultScore(h.par); });
  return r;
}

describe('playedNineOf — 한쪽 9홀만 친 예전 라운드', () => {
  it('앞 9홀만 입력했으면 out', () => {
    expect(playedNineOf(makeHalfRound(1))).toBe('out');
  });

  it('뒤 9홀만 입력했으면 in', () => {
    expect(playedNineOf(backNineOnly())).toBe('in');
  });

  it('18홀을 모두 입력한 라운드는 아니다', () => {
    expect(playedNineOf(makeFullRound(1))).toBeNull();
  });

  it('입력한 홀이 9개가 아니면(12홀만 입력 등) 건드리지 않는다', () => {
    const r = makeHalfRound(1);
    r.holes[10].scores[ME] = { ...r.holes[10].scores[ME], touched: true };
    expect(playedNineOf(r)).toBeNull();
  });

  it('치른 쪽 9홀 중 한 홀이라도 입력하지 않았으면(건너뜀) 건드리지 않는다', () => {
    const r = makeHalfRound(1);
    r.holes[3].scores[ME] = { ...r.holes[3].scores[ME], touched: false };
    expect(playedNineOf(r)).toBeNull();
  });

  it('touched 표시가 없는 예전 기록은 건드리지 않는다 (입력 여부를 알 수 없다)', () => {
    const r = makeHalfRound(1);
    r.holes.forEach((h) => { delete h.scores[ME].touched; });
    expect(playedNineOf(r)).toBeNull();
  });

  it('이미 9홀이거나 형식이 이상하면 null', () => {
    expect(playedNineOf({ holes: Array(9).fill({}), players: [ME] })).toBeNull();
    expect(playedNineOf(null)).toBeNull();
    expect(playedNineOf({ holes: Array(18).fill({ scores: {} }), players: [] })).toBeNull();
  });

  it('동반자 라운드는 모든 플레이어가 같은 9홀을 쳤을 때만 변환 대상이다', () => {
    const multi = makeMultiRound(1);
    multi.holes.forEach((h, i) => { if (i >= 9) Object.keys(h.scores).forEach((p) => { h.scores[p] = defaultScore(h.par); }); });
    expect(playedNineOf(multi)).toBe('out');
    // 친구만 후반을 입력한 경우는 애매하므로 변환하지 않는다
    multi.holes[12].scores['친구'] = { ...multi.holes[12].scores['친구'], touched: true };
    expect(playedNineOf(multi)).toBeNull();
  });
});

describe('convertPartialToNine', () => {
  it('앞 9홀: 홀 9개 · 홀 번호 1~9 · 앞 9개 파 · nine=out', () => {
    const { round, changed } = convertPartialToNine(makeHalfRound(1));
    expect(changed).toBe(1);
    expect(round.holes).toHaveLength(9);
    expect(round.holes.map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(round.pars).toEqual(PARS.slice(0, 9));
    expect(round.nine).toBe('out');
    expect(round.currentHole).toBe(8);
    expect(isValidRound(round)).toBe(true);
  });

  it('뒤 9홀: 홀 번호는 10~18 이 아니라 1~9, 파는 뒤 9개, nine=in', () => {
    const { round } = convertPartialToNine(backNineOnly());
    expect(round.holes.map((h) => h.holeNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(round.pars).toEqual(PARS.slice(9));
    expect(round.nine).toBe('in');
  });

  it('친 홀의 기록(타수·퍼트·GPS 등)과 라운드 정보(코스·날짜·id)는 그대로다', () => {
    const src = backNineOnly();
    src.holes[10].scores[ME] = { ...src.holes[10].scores[ME], memo: '메모', gpsPin: { lat: 37, lng: 127, acc: 4, t: 1 } };
    const { round } = convertPartialToNine(src);
    expect(round.holes[1].scores[ME]).toEqual(src.holes[10].scores[ME]);
    expect(round).toMatchObject({ id: src.id, date: src.date, courseName: src.courseName, completed: true, players: src.players });
  });

  it('바꿀 게 없으면 같은 객체와 changed 0 을 돌려준다', () => {
    const full = makeFullRound(1);
    expect(convertPartialToNine(full)).toEqual({ round: full, changed: 0 });
  });

  it('원본 라운드를 바꾸지 않는다', () => {
    const src = makeHalfRound(1);
    convertPartialToNine(src);
    expect(src.holes).toHaveLength(18);
    expect(src.nine).toBeUndefined();
  });

  it('두 번 적용해도 같다 (멱등)', () => {
    const once = convertPartialToNine(makeHalfRound(1)).round;
    expect(convertPartialToNine(once)).toEqual({ round: once, changed: 0 });
  });
});
