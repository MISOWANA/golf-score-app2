import { describe, it, expect } from 'vitest';
import { applyParEdit } from './parEdit.js';
import { makeFullRound, makeHalfRound, makeMultiRound, played, PARS } from '../test/fixtures.js';

const ME = '테스터';

describe('applyParEdit', () => {
  it('pars 와 각 홀의 par 를 함께 바꾼다', () => {
    const round = makeFullRound(1);
    const next = [...PARS]; next[0] = 5;
    const out = applyParEdit(round, next);
    expect(out.pars[0]).toBe(5);
    expect(out.holes[0].par).toBe(5);
    expect(out.holes[1].par).toBe(PARS[1]);
  });

  it('바뀌지 않은 홀은 같은 객체로 둔다', () => {
    const round = makeFullRound(1);
    const next = [...PARS]; next[0] = 5;
    const out = applyParEdit(round, next);
    expect(out.holes[3]).toBe(round.holes[3]);
  });

  it('입력하지 않은 홀은 새 파 기준 기본값(파·2퍼트)으로 맞춘다 — 가짜 버디·보기가 생기지 않는다', () => {
    const round = makeHalfRound(1);
    const next = [...PARS]; next[12] = 4;   // 13번 홀(미입력) 파5 → 파4
    const s = applyParEdit(round, next).holes[12].scores[ME];
    expect(s.strokes).toBe(4);
    expect(s.putts).toBe(2);
    expect(s.gir).toBe(true);
    expect(s.touched).toBe(false);
  });

  it('입력한 홀은 타수를 그대로 두고, 자동 계산된 GIR 만 새 파로 다시 계산한다', () => {
    const round = makeFullRound(1);
    // 파4, 5타, 2퍼트 → GIR 아님(5-2=3 > 2). 파5로 고치면 GIR(3 <= 3)
    round.holes[0].scores[ME] = played(4, { strokes: 5, putts: 2, gir: false, girAuto: true });
    const next = [...PARS]; next[0] = 5;
    const s = applyParEdit(round, next).holes[0].scores[ME];
    expect(s.strokes).toBe(5);
    expect(s.gir).toBe(true);
  });

  it('사용자가 직접 고른 GIR(girAuto:false)은 건드리지 않는다', () => {
    const round = makeFullRound(1);
    round.holes[0].scores[ME] = played(4, { strokes: 5, putts: 2, gir: false, girAuto: false });
    const next = [...PARS]; next[0] = 5;
    expect(applyParEdit(round, next).holes[0].scores[ME].gir).toBe(false);
  });

  it('그린 밖에서 다시 친 칩은 GIR 계산에서 뺀다', () => {
    const round = makeFullRound(1);
    round.holes[0].scores[ME] = played(4, {
      strokes: 5, putts: 1, gir: false, girAuto: true,
      puttDetails: [{ distance: 2, lie: 'flat', holein: 'offgreen' }],
      offGreen: [{ after: 0, club: 'wedge', subClub: '52', onGreen: 'chip-in' }],
    });
    const next = [...PARS]; next[0] = 5;
    // 5 - 1(퍼트) - 1(칩) = 3 <= 5-2 → GIR
    expect(applyParEdit(round, next).holes[0].scores[ME].gir).toBe(true);
  });

  it('동반자가 있는 라운드는 모든 플레이어에 적용한다', () => {
    const round = makeMultiRound(1);
    const next = [...PARS]; next[2] = 4;
    const out = applyParEdit(round, next);
    expect(out.holes[2].par).toBe(4);
    expect(Object.keys(out.holes[2].scores)).toEqual(['테스터', '친구']);
  });

  it('파가 하나도 안 바뀌면 같은 라운드를 돌려준다', () => {
    const round = makeFullRound(1);
    expect(applyParEdit(round, [...PARS])).toBe(round);
  });
});
