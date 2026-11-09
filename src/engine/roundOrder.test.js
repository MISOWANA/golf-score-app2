// 같은 날 두 번 친 라운드 — 날짜만 저장되어 시각이 없어도 나중에 시작한 라운드가 "최근"이어야 한다.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { compareRoundsAsc, compareRoundsDesc, playedBefore } from './roundOrder.js';
import { buildRoundCard } from './roundCard.js';
import { buildHandicap } from './handicap.js';
import { buildRoundRecords } from './records.js';
import { filterHistory } from './historyFilter.js';
import { makeFullRound } from '../test/fixtures.js';

// 같은 날(날짜만) 오전 라운드 → 오후 라운드. id 는 라운드를 시작한 시각(ms)이다.
const MORNING = '1731038400000';
const AFTERNOON = '1731060000000';
const same = (id, i, over = {}) => makeFullRound(i, '테스터', { id, date: '2026-11-08', ...over });

describe('라운드 순서 비교', () => {
  it('날짜가 다르면 날짜로, 같으면 나중에 시작한 라운드가 뒤다', () => {
    const early = { id: '5', date: '2026-11-01' };
    const am = { id: MORNING, date: '2026-11-08' };
    const pm = { id: AFTERNOON, date: '2026-11-08' };
    expect([pm, early, am].sort(compareRoundsAsc).map((r) => r.id)).toEqual(['5', MORNING, AFTERNOON]);
    expect([early, am, pm].sort(compareRoundsDesc).map((r) => r.id)).toEqual([AFTERNOON, MORNING, '5']);
    expect(playedBefore(am, pm)).toBe(true);
    expect(playedBefore(pm, am)).toBe(false);
    expect(playedBefore(am, am)).toBe(false);
  });

  it('id 자릿수가 달라도 숫자로 비교한다 (999 는 1000 보다 먼저)', () => {
    expect(playedBefore({ id: '999', date: '2026-11-08' }, { id: '1000', date: '2026-11-08' })).toBe(true);
  });
});

describe('같은 날 두 라운드가 각 화면에서 올바른 순서로 쓰인다', () => {
  const am = same(MORNING, 1);
  const pm = same(AFTERNOON, 2);
  const older = [makeFullRound(3, '테스터', { id: 'o1', date: '2026-10-01' }), makeFullRound(4, '테스터', { id: 'o2', date: '2026-10-05' }), makeFullRound(5, '테스터', { id: 'o3', date: '2026-10-09' })];

  it('요약 카드는 오후 라운드를 오전 라운드 뒤에 친 것으로 비교한다', () => {
    const history = [...older, am, pm];
    expect(buildRoundCard(pm, history).compare.basis).toBe(4);   // 오전 + 이전 3개 (오래된 것 3 + 같은 날 오전 1)
    expect(buildRoundCard(am, history).compare.basis).toBe(3);   // 같은 날 오후는 오전보다 뒤라 비교에서 빠진다
  });

  it('핸디캡 기록은 같은 날도 시작한 순서대로 쌓인다', () => {
    const h = buildHandicap([pm, am, ...older], '테스터');
    expect(h.entries.map((e) => e.id).slice(-2)).toEqual([MORNING, AFTERNOON]);
  });

  it('새 기록은 같은 날 먼저 친 라운드까지 "이전 기록"으로 견준다', () => {
    const scoreAll = (round, diff) => { round.holes.forEach((h) => { const s = h.scores['테스터']; s.strokes = h.par + diff; s.putts = 2; }); return round; };
    const prior3 = [1, 2, 3].map((i) => scoreAll(makeFullRound(i, '테스터', { id: `p${i}`, date: `2026-10-0${i}` }), 3));   // 모두 +3 (75타)
    const great = scoreAll(same(MORNING, 6), -1);     // 오전에 아주 잘 친 라운드
    const plain = scoreAll(same(AFTERNOON, 7), 0);    // 오후에는 평범 — 이전 3개보다는 낫지만 오전 라운드보다는 못하다
    const all = [...prior3, great, plain];
    const ids = (round) => buildRoundRecords(round, all, '테스터').map((r) => r.id);
    expect(ids(great)).toContain('score');            // 오전 라운드는 새 베스트
    expect(ids(plain)).not.toContain('score');        // 오후 라운드는 오전 라운드(베스트)를 넘지 못했다
  });

  it('히스토리: 최신순은 오후가 먼저, 오래된순은 오전이 먼저', () => {
    const all = [pm, am, ...older].sort(compareRoundsDesc);
    expect(filterHistory(all, '테스터', { sort: 'recent' }).map((r) => r.id).slice(0, 2)).toEqual([AFTERNOON, MORNING]);
    expect(filterHistory(all, '테스터', { sort: 'old' }).map((r) => r.id).slice(-2)).toEqual([MORNING, AFTERNOON]);
  });
});

describe('DB 에서 불러올 때', () => {
  let db;
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    vi.resetModules();
    db = await import('../db.js');
    await db.initDB();
  });

  it('같은 날 라운드는 나중에 시작한 것이 먼저 온다 (저장한 순서와 상관없이)', async () => {
    const p = await db.loginByName('테스터');
    await db.saveRound(same(AFTERNOON, 2), p.userId);
    await db.saveRound(same(MORNING, 1), p.userId);
    await db.saveRound(makeFullRound(3, '테스터', { id: 'o1', date: '2026-10-01' }), p.userId);
    const rounds = await db.loadRoundsByUser(db.userIdsOf(p));
    expect(rounds.map((r) => r.id)).toEqual([AFTERNOON, MORNING, 'o1']);
  });
});
