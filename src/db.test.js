// IndexedDB 계층 테스트 — fake-indexeddb 로 실제 스키마·트랜잭션을 돌린다.
import 'fake-indexeddb/auto';   // indexedDB · IDBKeyRange 등 전역을 채운다
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { makeFullRound, makeHalfRound, defaultScore } from './test/fixtures.js';
import { convertPartialToNine } from './engine/nineConversion.js';

// 테스트마다 새 DB 와 새 모듈 인스턴스 (db.js 는 연결을 모듈 변수에 들고 있다)
let db;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  db = await import('./db.js');
  await db.initDB();
});

const roundFor = (id, name, over = {}) => makeFullRound(1, name, { id, ...over });

describe('프로필·로그인', () => {
  it('새 이름은 프로필을 만들고 current 로 저장한다', async () => {
    const p = await db.loginByName('홍길동');
    expect(p.userName).toBe('홍길동');
    expect((await db.getCurrentUser()).userId).toBe(p.userId);
  });

  it('같은 이름(대소문자·앞뒤 공백 무시)은 같은 프로필이다', async () => {
    const a = await db.loginByName('Tiger');
    const b = await db.loginByName('  TIGER ');
    expect(b.userId).toBe(a.userId);
    expect(await db.listProfiles()).toHaveLength(1);
  });

  it('같은 순간에 만든 서로 다른 프로필은 userId 가 다르다 (기록이 섞이지 않는다)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });   // 시계만 멈춘다 (fake-indexeddb 는 setImmediate 를 쓴다)
    vi.setSystemTime(new Date('2026-10-22T10:00:00Z'));
    try {
      const a = await db.loginByName('A');
      const b = await db.loginByName('B');
      expect(a.userId).not.toBe(b.userId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('프로필 삭제는 라운드·클럽·진행 중 라운드·프로필·current 를 모두 지운다', async () => {
    const lee = await db.loginByName('이영희');
    await db.saveRound(roundFor('lee1', '이영희'), lee.userId);
    await db.saveClubsForUser(lee.userId, [{ id: 'x' }]);
    await db.saveActiveRound(lee.userId, { id: 'act' });
    await db.deleteProfile(lee);
    expect(await db.loadRoundsByUser([lee.userId])).toEqual([]);
    expect(await db.loadClubsByUser([lee.userId])).toBeNull();
    expect(await db.loadActiveRound([lee.userId])).toBeNull();
    expect((await db.listProfiles()).some((p) => p.userId === lee.userId)).toBe(false);
    expect(await db.getCurrentUser()).toBeNull();
  });

  it('다른 사용자의 기록은 프로필 삭제에 영향받지 않는다', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    await db.saveRound(roundFor('a1', 'A'), a.userId);
    await db.saveRound(roundFor('b1', 'B'), b.userId);
    await db.deleteProfile(a);
    expect((await db.loadRoundsByUser([b.userId])).map((r) => r.id)).toEqual(['b1']);
  });
});

describe('예전 userId 마이그레이션', () => {
  it('같은 이름의 예전 userId 들을 하나의 프로필(aliases)로 묶는다', async () => {
    await db.saveRound(roundFor('old1', '최고수', { date: '2025-01-01T12:00:00Z' }), 'user_111');
    await db.saveRound(roundFor('old2', '최고수', { date: '2025-02-01T12:00:00Z' }), 'user_222');
    await db.migrateProfiles();
    const profiles = (await db.listProfiles()).filter((p) => p.userName === '최고수');
    expect(profiles).toHaveLength(1);
    const ids = db.userIdsOf(profiles[0]);
    expect(ids).toHaveLength(2);
    expect(await db.loadRoundsByUser(ids)).toHaveLength(2);
  });

  it('두 번째 실행은 아무것도 바꾸지 않는다 (멱등)', async () => {
    await db.saveRound(roundFor('old1', '최고수'), 'user_111');
    await db.migrateProfiles();
    const before = JSON.stringify(await db.listProfiles());
    await db.migrateProfiles();
    expect(JSON.stringify(await db.listProfiles())).toBe(before);
  });

  it('타수 보정 마이그레이션은 한 번만 돈다', async () => {
    await db.saveRound(roundFor('r1', '홍길동'), 'u1');
    const calls = [];
    const fix = (r) => { calls.push(r.id); return { round: r, changed: 0 }; };
    await db.migrateRoundData(fix);
    const first = calls.length;
    await db.migrateRoundData(fix);
    expect(first).toBeGreaterThan(0);
    expect(calls).toHaveLength(first);
  });
});

describe('라운드 저장·조회', () => {
  it('날짜 내림차순으로 돌려준다', async () => {
    const u = await db.loginByName('홍길동');
    await db.saveRound(roundFor('r1', '홍길동', { date: '2026-01-01T12:00:00Z' }), u.userId);
    await db.saveRound(roundFor('r2', '홍길동', { date: '2026-03-01T12:00:00Z' }), u.userId);
    expect((await db.loadRoundsByUser([u.userId])).map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('여러 userId(aliases)의 기록을 합치되 같은 라운드는 한 번만 준다', async () => {
    await db.saveRound(roundFor('r1', 'A'), 'u1');
    await db.saveRound(roundFor('r2', 'A'), 'u2');
    expect(await db.loadRoundsByUser(['u1', 'u2', 'u1'])).toHaveLength(2);
  });

  it('삭제', async () => {
    await db.saveRound(roundFor('r1', 'A'), 'u1');
    await db.deleteRound('r1');
    expect(await db.loadRoundsByUser(['u1'])).toEqual([]);
  });

  it('진행 중 라운드 저장·복원·삭제', async () => {
    await db.saveActiveRound('u1', { id: 'a1' });
    expect((await db.loadActiveRound(['u1']))?.id).toBe('a1');
    await db.clearActiveRound(['u1']);
    expect(await db.loadActiveRound(['u1'])).toBeNull();
  });
});

describe('백업 가져오기', () => {
  it('내보내기 형식: data.rounds / data.clubs 가 배열이다', async () => {
    const u = await db.loginByName('홍길동');
    const ex = await db.exportUserData(u);
    expect(Array.isArray(ex.data.rounds)).toBe(true);
    expect(Array.isArray(ex.data.clubs)).toBe(true);
  });

  it('같은 사용자의 같은 id 라운드는 파일 내용으로 바뀌고, 파일에 없는 기존 라운드는 남는다', async () => {
    const u = await db.loginByName('홍길동');
    await db.saveRound(roundFor('r1', '홍길동', { courseName: 'OLD' }), u.userId);
    await db.saveRound(roundFor('r2', '홍길동'), u.userId);
    const res = await db.importUserData(u.userId, { data: { rounds: [roundFor('r1', '홍길동', { courseName: 'NEW' })], clubs: [] } });
    const rounds = await db.loadRoundsByUser([u.userId]);
    expect(rounds).toHaveLength(2);
    expect(rounds.find((r) => r.id === 'r1').courseName).toBe('NEW');
    expect(res).toMatchObject({ imported: 1, remapped: 0 });
  });

  it('예전 userId(aliases) 소유의 같은 id 라운드도 같은 사용자의 것으로 보고 바꾼다', async () => {
    await db.saveRound(roundFor('r1', 'A', { courseName: 'OLD' }), 'user_old');
    const res = await db.importUserData('u_new', { data: { rounds: [roundFor('r1', 'A', { courseName: 'NEW' })] } }, ['u_new', 'user_old']);
    expect(res.remapped).toBe(0);
    expect((await db.loadRoundsByUser(['user_old', 'u_new'])).map((r) => r.courseName)).toEqual(['NEW']);
  });

  it('다른 사용자의 라운드와 id 가 겹치면 그 라운드를 빼앗지 않고 가져온 쪽에 새 id 를 준다', async () => {
    const kim = await db.loginByName('김철수');
    const lee = await db.loginByName('이영희');
    await db.saveRound(roundFor('shared', '김철수', { courseName: '김철수의 라운드' }), kim.userId);

    const res = await db.importUserData(lee.userId, { data: { rounds: [roundFor('shared', '이영희', { courseName: '이영희가 가져온 라운드' })] } });

    expect(res).toMatchObject({ imported: 1, remapped: 1 });
    const kimRounds = await db.loadRoundsByUser([kim.userId]);
    expect(kimRounds.map((r) => r.courseName)).toEqual(['김철수의 라운드']);   // 그대로
    const leeRounds = await db.loadRoundsByUser([lee.userId]);
    expect(leeRounds.map((r) => r.courseName)).toEqual(['이영희가 가져온 라운드']);
    expect(leeRounds[0].id).not.toBe('shared');
  });

  it('같은 파일을 두 번 가져와도 사본이 늘어나지 않는다', async () => {
    const kim = await db.loginByName('김철수');
    const lee = await db.loginByName('이영희');
    await db.saveRound(roundFor('shared', '김철수'), kim.userId);
    const file = { data: { rounds: [roundFor('shared', '이영희')] } };
    await db.importUserData(lee.userId, file);
    await db.importUserData(lee.userId, file);
    expect(await db.loadRoundsByUser([lee.userId])).toHaveLength(1);
    expect(await db.loadRoundsByUser([kim.userId])).toHaveLength(1);
  });

  it('클럽: 파일에 빈 배열이면 기존 설정을 지우지 않는다', async () => {
    await db.saveClubsForUser('u1', [{ id: 'd', name: 'D' }]);
    await db.importUserData('u1', { data: { rounds: [], clubs: [] } });
    expect(await db.loadClubsByUser(['u1'])).toEqual([{ id: 'd', name: 'D' }]);
  });
});

describe('9홀 라운드 변환 마이그레이션 ("18홀 중 9홀만 입력" → 9홀)', () => {
  const backNineOnly = (id, name) => {
    const r = roundFor(id, name);
    r.holes.forEach((h, i) => { if (i < 9) h.scores[name] = defaultScore(h.par); });
    return r;
  };

  it('한쪽 9홀만 입력한 라운드만 9홀로 바꾸고 다른 라운드는 그대로 둔다', async () => {
    await db.saveRound(roundFor('full', '홍길동'), 'u1');
    await db.saveRound({ ...makeHalfRound(1, '홍길동'), id: 'half-out' }, 'u1');
    await db.saveRound(backNineOnly('half-in', '홍길동'), 'u1');

    const before = (await db.loadRoundsByUser(['u1'])).find((r) => r.id === 'full');
    const converted = await db.migrateNineHoleRounds(convertPartialToNine);
    const after = await db.loadRoundsByUser(['u1']);

    expect(converted).toBe(2);
    expect(after.find((r) => r.id === 'full')).toEqual(before);                       // 18홀 라운드는 한 글자도 안 바뀐다
    const out = after.find((r) => r.id === 'half-out');
    const inn = after.find((r) => r.id === 'half-in');
    expect([out.holes.length, out.nine, out.holes[0].holeNumber]).toEqual([9, 'out', 1]);
    expect([inn.holes.length, inn.nine, inn.holes[0].holeNumber]).toEqual([9, 'in', 1]);   // 후반을 쳤어도 1번부터
    expect(after.find((r) => r.id === 'full').holes).toHaveLength(18);
  });

  it('한 번만 실행된다 (두 번째는 아무것도 바꾸지 않는다)', async () => {
    await db.saveRound({ ...makeHalfRound(1, '홍길동'), id: 'h1' }, 'u1');
    expect(await db.migrateNineHoleRounds(convertPartialToNine)).toBe(1);
    // 변환 뒤에 새로 들어온 "9홀만 입력한 18홀"은 이미 마이그레이션이 끝났으므로 건드리지 않는다 (새 라운드는 finishRound 가 직접 변환한다)
    await db.saveRound({ ...makeHalfRound(2, '홍길동'), id: 'h2' }, 'u1');
    expect(await db.migrateNineHoleRounds(convertPartialToNine)).toBe(0);
    expect((await db.loadRoundsByUser(['u1'])).find((r) => r.id === 'h2').holes).toHaveLength(18);
  });

  it('바꾼 라운드의 원본을 백업에 남긴다 (되돌릴 수 있다)', async () => {
    const original = { ...makeHalfRound(1, '홍길동'), id: 'h1' };
    await db.saveRound(original, 'u1');
    await db.migrateNineHoleRounds(convertPartialToNine);
    const backup = await db.loadNineConversionBackup();
    expect(backup.rounds).toHaveLength(1);
    expect(backup.rounds[0].id).toBe('h1');
    expect(backup.rounds[0].holes).toHaveLength(18);
    expect(backup.rounds[0].holes[12].scores['홍길동'].touched).toBe(false);   // 파로 채워진 원래 모양 그대로
  });

  it('바꿀 라운드가 없으면 백업을 만들지 않는다', async () => {
    await db.saveRound(roundFor('full', '홍길동'), 'u1');
    expect(await db.migrateNineHoleRounds(convertPartialToNine)).toBe(0);
    expect(await db.loadNineConversionBackup()).toBeNull();
  });

  it('진행 중인 라운드는 건드리지 않는다', async () => {
    await db.saveActiveRound('u1', { ...makeHalfRound(1, '홍길동'), id: 'act', completed: false });
    await db.migrateNineHoleRounds(convertPartialToNine);
    expect((await db.loadActiveRound(['u1'])).holes).toHaveLength(18);
  });

  it('사용자를 삭제하면 백업에 남은 그 사용자의 라운드도 함께 지운다', async () => {
    const lee = await db.loginByName('이영희');
    const kim = await db.loginByName('김철수');
    await db.saveRound({ ...makeHalfRound(1, '이영희'), id: 'lee-half' }, lee.userId);
    await db.saveRound({ ...makeHalfRound(2, '김철수'), id: 'kim-half' }, kim.userId);
    await db.migrateNineHoleRounds(convertPartialToNine);
    expect((await db.loadNineConversionBackup()).rounds).toHaveLength(2);

    await db.deleteProfile(lee);
    expect((await db.loadNineConversionBackup()).rounds.map((r) => r.id)).toEqual(['kim-half']);
    await db.deleteProfile(kim);
    expect(await db.loadNineConversionBackup()).toBeNull();
  });

  it('파3 타수 보정 마이그레이션과 서로 독립이다 (각자 한 번씩)', async () => {
    await db.saveRound({ ...makeHalfRound(1, '홍길동'), id: 'h1' }, 'u1');
    const par3Calls = [];
    await db.migrateRoundData((r) => { par3Calls.push(r.id); return { round: r, changed: 0 }; });
    expect(par3Calls).toEqual(['h1']);
    expect(await db.migrateNineHoleRounds(convertPartialToNine)).toBe(1);   // par3 가 끝났어도 변환은 따로 돈다
  });
});
