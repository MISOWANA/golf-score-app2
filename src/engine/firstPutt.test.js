import { describe, it, expect } from 'vitest';
import { sanitizeFirstPutt, newPuttDetail, PUTT_MIN_M, PUTT_MAX_M } from './firstPutt.js';
import { sanitizePrefs } from './units.js';
import { emptyOffGreenShot, offGreenShots } from './offGreen.js';
import { buildHoleReview } from './holeReview.js';
import { makeActiveRound } from '../test/fixtures.js';

describe('첫 퍼팅 기본 거리 — 값 검사', () => {
  it('범위 안의 숫자만 쓴다 (소수 둘째 자리까지)', () => {
    expect(sanitizeFirstPutt(5)).toBe(5);
    expect(sanitizeFirstPutt(6.1234)).toBe(6.12);
    expect(sanitizeFirstPutt(PUTT_MIN_M)).toBe(0.5);
    expect(sanitizeFirstPutt(PUTT_MAX_M)).toBe(30);
  });

  it('범위 밖 · 숫자가 아닌 값 · 없음은 null (쓰지 않음)', () => {
    for (const v of [0, 0.4, 30.1, -3, NaN, Infinity, '5', null, undefined, {}]) expect(sanitizeFirstPutt(v)).toBeNull();
  });
});

describe('퍼트를 처음 만들 때', () => {
  it('첫 퍼팅만 기본 거리가 들어가고, 조준 거리도 같은 값이다', () => {
    expect(newPuttDetail(0, 6)).toEqual({ distance: 6, aimDistance: 6, lie: [] });
    expect(newPuttDetail(1, 6)).toEqual({ distance: null, aimDistance: null, lie: [] });
    expect(newPuttDetail(2, 6)).toEqual({ distance: null, aimDistance: null, lie: [] });
  });

  it('정하지 않았으면 첫 퍼팅도 비어 있다 (예전과 같다)', () => {
    expect(newPuttDetail(0)).toEqual({ distance: null, aimDistance: null, lie: [] });
    expect(newPuttDetail(0, null)).toEqual({ distance: null, aimDistance: null, lie: [] });
    expect(newPuttDetail(0, 99)).toEqual({ distance: null, aimDistance: null, lie: [] });   // 범위 밖은 쓰지 않는다
  });
});

describe('설정 저장값 검사', () => {
  it('첫 퍼팅 기본 거리를 정한 사람만 키가 있다 — 안 정했으면 { unit } 그대로', () => {
    expect(sanitizePrefs({ unit: 'yd' })).toEqual({ unit: 'yd' });
    expect(sanitizePrefs({ unit: 'yd', firstPutt: null })).toEqual({ unit: 'yd' });
    expect(sanitizePrefs({ unit: 'm', firstPutt: 6 })).toEqual({ unit: 'm', firstPutt: 6 });
    expect(sanitizePrefs({ unit: 'm', firstPutt: 99 })).toEqual({ unit: 'm' });
    expect(sanitizePrefs(undefined)).toEqual({ unit: 'm' });
  });
});

describe('그린 밖 칩 — 지형 · 남은 거리', () => {
  it('새 칩은 지형 · 남은 거리가 비어 있다', () => {
    expect(emptyOffGreenShot(0)).toEqual({ after: 0, club: null, subClub: null, onGreen: null, surface: null, remainingDistance: null });
  });

  it('기록한 지형 · 거리는 유효한 칩 목록을 거쳐도 남는다', () => {
    const score = { putts: 1, puttDetails: [{ holein: 'offgreen' }], offGreen: [{ ...emptyOffGreenShot(0), surface: 'rough', remainingDistance: 12, onGreen: true }] };
    expect(offGreenShots(score)[0]).toMatchObject({ surface: 'rough', remainingDistance: 12 });
  });

  it('복기에도 지형과 남은 거리가 실린다 (안 적었으면 null)', () => {
    const round = makeActiveRound('me', { currentHole: 0 });
    const hole = round.holes[0];
    hole.scores.me = {
      ...hole.scores.me, putts: 2, puttsManual: true,
      puttDetails: [{ distance: 4, holein: 'offgreen' }, { distance: 1, holein: 'success' }],
      offGreen: [{ ...emptyOffGreenShot(0), surface: 'bunker', remainingDistance: 15, onGreen: true }],
    };
    const chips = buildHoleReview(hole, 'me', 0).putts[0].chips;
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({ surface: '벙커', from: 15, result: 'on' });
    hole.scores.me.offGreen = [{ ...emptyOffGreenShot(0), onGreen: true }];
    expect(buildHoleReview(hole, 'me', 0).putts[0].chips[0]).toMatchObject({ surface: null, from: null });
  });
});
