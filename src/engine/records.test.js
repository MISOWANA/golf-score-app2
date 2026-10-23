import { describe, it, expect } from 'vitest';
import { buildRoundRecords, recordText, RECORD_MIN_ROUNDS } from './records.js';
import { makeNineRound, makeMultiRound, played } from '../test/fixtures.js';
import { makeFullRound } from '../test/fixtures.js';

const ME = '테스터';

// i번째 라운드 (2026-01-i, 코스 course) — over: 파 + over, putts, gir, birdieHoles: 버디로 칠 홀 수
const mk = (i, { over = 1, putts = 2, gir = true, birdieHoles = 0, course = '남서울CC', extra = {} } = {}) => {
  const r = makeFullRound(i, ME, { id: `r${String(i).padStart(2, '0')}`, courseName: course, date: new Date(2026, 0, i, 12).toISOString(), ...extra });
  r.holes.forEach((h, idx) => { h.scores[ME] = played(h.par, { strokes: idx < birdieHoles ? h.par - 1 : h.par + over, putts, gir }); });
  return r;
};
const idsOf = (list) => list.map((x) => x.id).sort();

describe('buildRoundRecords — 베스트 스코어', () => {
  const history = (n) => Array.from({ length: n }, (_, k) => mk(k + 1, { over: 2 }));        // 108타 라운드 n 개

  it('이전 최고보다 적게 치면 갱신 — 이전 값을 함께 준다', () => {
    const better = mk(10, { over: 1 });                                                          // 90타
    const rec = buildRoundRecords(better, [...history(3), better], ME).find((r) => r.id === 'score');
    expect(rec).toMatchObject({ label: '베스트 스코어', value: 90, previous: 108, unit: '타' });
    expect(recordText(rec)).toBe('베스트 스코어 90타 (이전 108타)');
  });

  it('같거나 못 치면 갱신이 아니다', () => {
    const same = mk(10, { over: 2 });
    expect(buildRoundRecords(same, [...history(3), same], ME).find((r) => r.id === 'score')).toBeUndefined();
    const worse = mk(10, { over: 3 });
    expect(buildRoundRecords(worse, [...history(3), worse], ME).find((r) => r.id === 'score')).toBeUndefined();
  });

  it(`이전 라운드가 ${RECORD_MIN_ROUNDS}개 미만이면 기록으로 치지 않는다`, () => {
    const better = mk(10, { over: 0 });
    expect(buildRoundRecords(better, [...history(2), better], ME).find((r) => r.id === 'score')).toBeUndefined();
    const elsewhere = [1, 2].map((i) => mk(i, { over: 2, course: '다른CC' }));                  // 다른 코스 2개 — 코스 기록 후보도 아니다
    expect(buildRoundRecords(better, [...elsewhere, better], ME)).toEqual([]);
  });

  it('이 라운드보다 나중에 친 라운드는 비교 대상이 아니다 (당시 기록으로 본다)', () => {
    const mid = mk(5, { over: 1 });
    const later = mk(20, { over: 0 });                                                           // 이후에 더 잘 친 라운드
    expect(buildRoundRecords(mid, [...history(3), mid, later], ME).find((r) => r.id === 'score')).toMatchObject({ value: 90 });
  });

  it('9홀 라운드는 기록 대상이 아니다', () => {
    const nine = makeNineRound(9, 'out');
    expect(buildRoundRecords(nine, [...history(5), nine], ME)).toEqual([]);
    expect(buildRoundRecords(null, [], ME)).toEqual([]);
  });

  it('동반자와 함께 친 라운드는 내 점수로 센다 (스코어 기록은 되고, 지표 기록은 안 본다)', () => {
    const multi = makeMultiRound(50);
    multi.date = new Date(2026, 1, 1, 12).toISOString();
    multi.holes.forEach((h) => { h.scores[ME] = { ...h.scores[ME], strokes: h.par - 1 }; h.scores['친구'] = { ...h.scores['친구'], strokes: h.par + 5 }; });
    const rec = buildRoundRecords(multi, [...history(3), multi], ME);
    expect(rec.map((r) => r.id)).toEqual(['score']);
  });
});

describe('이 코스 베스트', () => {
  it('같은 코스를 2번 이상 쳤고 그중 최고를 넘으면 (전체 베스트는 아닐 때)', () => {
    const others = [1, 2, 3].map((i) => mk(i, { over: 0, course: '다른CC' }));                  // 다른 코스에서는 72타를 쳤다
    const here = [4, 5].map((i) => mk(i, { over: 2 }));                                          // 이 코스 108타
    const now = mk(6, { over: 1 });                                                              // 90타 — 전체 베스트는 아니다
    const rec = buildRoundRecords(now, [...others, ...here, now], ME);
    expect(idsOf(rec.filter((r) => r.id === 'course' || r.id === 'score'))).toEqual(['course']);
    expect(rec.find((r) => r.id === 'course')).toMatchObject({ label: '이 코스 베스트', value: 90, previous: 108 });
  });

  it('전체 베스트이면 코스 베스트는 따로 붙이지 않는다', () => {
    const history = [1, 2, 3, 4].map((i) => mk(i, { over: 2 }));
    const now = mk(6, { over: 0 });
    expect(idsOf(buildRoundRecords(now, [...history, now], ME))).toContain('score');
    expect(idsOf(buildRoundRecords(now, [...history, now], ME))).not.toContain('course');
  });

  it('이 코스를 1번만 쳐 봤으면 코스 기록으로 치지 않는다', () => {
    const others = [1, 2, 3].map((i) => mk(i, { over: 0, course: '다른CC' }));
    const one = mk(4, { over: 2 });
    const now = mk(5, { over: 1 });
    expect(buildRoundRecords(now, [...others, one, now], ME).find((r) => r.id === 'course')).toBeUndefined();
  });

  it('코스 이름은 공백 · 대소문자를 무시하고 같은 코스로 본다', () => {
    const here = [mk(1, { over: 2, course: '남서울 cc' }), mk(2, { over: 2, course: '남서울CC' })];
    const others = [3, 4].map((i) => mk(i, { over: 0, course: '다른CC' }));
    const now = mk(6, { over: 1, course: ' 남서울CC' });
    expect(buildRoundRecords(now, [...here, ...others, now], ME).find((r) => r.id === 'course')).toMatchObject({ previous: 108 });
  });
});

describe('상세 지표 기록 (1인 18홀)', () => {
  const history = [1, 2, 3].map((i) => mk(i, { over: 1, putts: 2, gir: false }));               // 퍼트 36 · GIR 0 · 버디 0

  it('최소 퍼트 · 최다 GIR · 최다 버디', () => {
    const now = mk(10, { over: 1, putts: 1, gir: true, birdieHoles: 2 });
    const rec = buildRoundRecords(now, [...history, now], ME);
    expect(rec.find((r) => r.id === 'putts')).toMatchObject({ value: 18, previous: 36, unit: '개' });
    expect(rec.find((r) => r.id === 'gir')).toMatchObject({ value: 18, previous: 0 });
    expect(rec.find((r) => r.id === 'birdies')).toMatchObject({ value: 2, previous: 0 });
  });

  it('버디가 하나도 없으면 최다 버디가 아니다', () => {
    const now = mk(10, { over: 1, putts: 2, gir: true });
    expect(buildRoundRecords(now, [...history, now], ME).find((r) => r.id === 'birdies')).toBeUndefined();
  });

  it('이전 기록과 같으면 갱신이 아니다', () => {
    const now = mk(10, { over: 1, putts: 2, gir: false });
    expect(buildRoundRecords(now, [...history, now], ME).filter((r) => ['putts', 'gir', 'birdies'].includes(r.id))).toEqual([]);
  });

  it('입력하지 않은 홀이 있는 라운드는 지표 기록을 비교하지 않는다', () => {
    const now = mk(10, { over: 1, putts: 1, gir: true });
    now.holes[0].scores[ME] = { ...now.holes[0].scores[ME], touched: false };
    expect(buildRoundRecords(now, [...history, now], ME).filter((r) => ['putts', 'gir', 'birdies'].includes(r.id))).toEqual([]);
  });

  it('이전 라운드 중 입력하지 않은 홀이 있는 것은 비교 대상에서 뺀다', () => {
    const partial = mk(2, { over: 1, putts: 2, gir: false });
    partial.holes.slice(0, 9).forEach((h) => { h.scores[ME] = { ...h.scores[ME], touched: false, putts: 0 }; });   // 퍼트가 적게 잡히는 라운드
    const rounds = [mk(1, { putts: 2, gir: false }), partial, mk(3, { putts: 2, gir: false }), mk(4, { putts: 2, gir: false })];
    const now = mk(10, { putts: 2, gir: false });
    expect(buildRoundRecords(now, [...rounds, now], ME).find((r) => r.id === 'putts')).toBeUndefined();
  });
});
