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

describe('백업 기록 (마지막 백업 시각)', () => {
  it('기록이 없으면 null, 저장하면 시각 · 라운드 수 · 방식을 돌려준다', async () => {
    const p = await db.loginByName('홍길동');
    expect(await db.getBackupMeta(p.userId)).toBeNull();
    const row = await db.recordBackup(p.userId, { roundCount: 12, via: 'share' });
    expect(row).toMatchObject({ userId: p.userId, roundCount: 12, via: 'share' });
    expect(Number.isNaN(new Date(row.lastBackupAt).getTime())).toBe(false);
    expect(await db.getBackupMeta(p.userId)).toMatchObject({ roundCount: 12, via: 'share' });
  });

  it('다시 백업하면 덮어쓴다 (사용자마다 하나)', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    await db.recordBackup(a.userId, { roundCount: 3 });
    await db.recordBackup(a.userId, { roundCount: 9 });
    await db.recordBackup(b.userId, { roundCount: 1 });
    expect((await db.getBackupMeta(a.userId)).roundCount).toBe(9);
    expect((await db.getBackupMeta(b.userId)).roundCount).toBe(1);
  });

  it('프로필을 지우면 그 사용자의 백업 기록도 함께 지운다', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    await db.recordBackup(a.userId, { roundCount: 3 });
    await db.recordBackup(b.userId, { roundCount: 4 });
    await db.deleteProfile(a);
    expect(await db.getBackupMeta(a.userId)).toBeNull();
    expect(await db.getBackupMeta(b.userId)).not.toBeNull();
  });

  it('내보내기는 라운드 수와 함께 한 줄 파일로 직렬화돼 다시 읽힌다', async () => {
    const { serializeBackup, parseBackupFile } = await import('./engine/backupStatus.js');
    const p = await db.loginByName('홍길동');
    await db.saveRound(roundFor('x1', '홍길동'), p.userId);
    const text = serializeBackup(await db.exportUserData(p));
    expect(text).not.toMatch(/\n/);
    const parsed = parseBackupFile(text);
    expect(parsed).toMatchObject({ app: 'birdie-buddy', roundCount: 1 });
    expect(parsed.data.rounds[0].id).toBe('x1');
  });
});

describe('휴지통 (삭제 되돌리기)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const seeded = async (name = '홍길동') => {
    const p = await db.loginByName(name);
    const r = await db.saveRound(roundFor('t1', name), p.userId);
    return { p, r };
  };

  it('휴지통으로 옮기면 라운드 목록에서 빠지고 휴지통에 남는다', async () => {
    const { p, r } = await seeded();
    await db.trashRound(r, p.userId);
    expect(await db.loadRoundsByUser([p.userId])).toEqual([]);
    const trash = await db.listTrash([p.userId]);
    expect(trash).toHaveLength(1);
    expect(trash[0]).toMatchObject({ id: 'trash:t1', userId: p.userId });
    expect(trash[0].round.id).toBe('t1');
    expect(Number.isNaN(new Date(trash[0].deletedAt).getTime())).toBe(false);
  });

  it('되살리면 같은 라운드가 그대로 돌아오고 휴지통은 빈다', async () => {
    const { p, r } = await seeded();
    await db.trashRound(r, p.userId);
    const back = await db.restoreFromTrash('t1');
    expect(back.id).toBe('t1');
    expect((await db.loadRoundsByUser([p.userId])).map((x) => x.id)).toEqual(['t1']);
    expect(await db.listTrash([p.userId])).toEqual([]);
    expect((await db.loadRoundsByUser([p.userId]))[0].holes).toEqual(r.holes);          // 내용이 그대로
  });

  it('없는 라운드를 되살리면 null', async () => {
    await db.loginByName('A');
    expect(await db.restoreFromTrash('nope')).toBeNull();
  });

  it('같은 번호의 라운드가 이미 있으면 덮어쓰지 않고 휴지통에서만 지운다', async () => {
    const { p, r } = await seeded();
    await db.trashRound(r, p.userId);
    await db.saveRound({ ...r, courseName: '새로 가져온 기록' }, p.userId);             // 백업을 가져와 다시 생긴 경우
    expect(await db.restoreFromTrash('t1')).toBeNull();
    expect((await db.loadRoundsByUser([p.userId]))[0].courseName).toBe('새로 가져온 기록');
    expect(await db.listTrash([p.userId])).toEqual([]);
  });

  it('휴지통에서 영구 삭제', async () => {
    const { p, r } = await seeded();
    await db.trashRound(r, p.userId);
    await db.deleteFromTrash('t1');
    expect(await db.listTrash([p.userId])).toEqual([]);
    expect(await db.restoreFromTrash('t1')).toBeNull();
  });

  it('사용자마다 자기 휴지통만 보고, 최근에 지운 것이 앞이다', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    const t0 = new Date('2026-10-01T00:00:00Z');
    await db.trashRound(await db.saveRound(roundFor('a1', 'A'), a.userId), a.userId, t0);
    await db.trashRound(await db.saveRound(roundFor('a2', 'A'), a.userId), a.userId, new Date(t0.getTime() + DAY));
    await db.trashRound(await db.saveRound(roundFor('b1', 'B'), b.userId), b.userId, t0);
    expect((await db.listTrash([a.userId])).map((x) => x.round.id)).toEqual(['a2', 'a1']);
    expect((await db.listTrash([b.userId])).map((x) => x.round.id)).toEqual(['b1']);
  });

  it('7일이 지난 것만 자동으로 지운다', async () => {
    const p = await db.loginByName('A');
    const t0 = new Date('2026-10-01T00:00:00Z');
    await db.trashRound(await db.saveRound(roundFor('old', 'A'), p.userId), p.userId, t0);
    await db.trashRound(await db.saveRound(roundFor('new', 'A'), p.userId), p.userId, new Date(t0.getTime() + 3 * DAY));
    const now = t0.getTime() + 7 * DAY;                                                // 첫 번째는 정확히 7일, 두 번째는 4일
    expect(await db.purgeExpiredTrash(now)).toBe(1);
    expect((await db.listTrash([p.userId])).map((x) => x.round.id)).toEqual(['new']);
    expect(await db.purgeExpiredTrash(now)).toBe(0);
  });

  it('프로필을 지우면 그 사용자의 휴지통도 함께 지운다', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    await db.trashRound(await db.saveRound(roundFor('a1', 'A'), a.userId), a.userId);
    await db.trashRound(await db.saveRound(roundFor('b1', 'B'), b.userId), b.userId);
    await db.deleteProfile(a);
    expect(await db.listTrash([a.userId])).toEqual([]);
    expect((await db.listTrash([b.userId])).map((x) => x.round.id)).toEqual(['b1']);
  });

  it('휴지통 행은 프로필 목록·진행 중 라운드를 어지럽히지 않는다', async () => {
    const { p, r } = await seeded();
    await db.trashRound(r, p.userId);
    expect(await db.listProfiles()).toHaveLength(1);
    expect(await db.loadActiveRound([p.userId])).toBeNull();
  });
});

describe('목표 저장', () => {
  const G = (metric, target) => ({ id: `g-${metric}`, metric, target, createdAt: '2026-10-01T00:00:00.000Z' });

  it('없으면 빈 목록, 저장하면 그대로 읽힌다', async () => {
    const p = await db.loginByName('홍길동');
    expect(await db.getGoals(p.userId)).toEqual([]);
    expect(await db.saveGoals(p.userId, [G('threePutts', 2)])).toEqual([G('threePutts', 2)]);
    expect(await db.getGoals(p.userId)).toEqual([G('threePutts', 2)]);
  });

  it('검사를 거쳐 저장한다 — 알 수 없는 지표는 버리고 최대 2개', async () => {
    const p = await db.loginByName('홍길동');
    const saved = await db.saveGoals(p.userId, [G('threePutts', 2), { ...G('x', 1), metric: 'nope' }, G('penalties', 1), G('score', 90)]);
    expect(saved.map((g) => g.metric)).toEqual(['threePutts', 'penalties']);
    expect((await db.getGoals(p.userId)).map((g) => g.metric)).toEqual(['threePutts', 'penalties']);
  });

  it('사용자마다 따로 저장한다', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    await db.saveGoals(a.userId, [G('gir', 50)]);
    expect(await db.getGoals(b.userId)).toEqual([]);
  });

  it('프로필을 지우면 목표도 함께 지운다', async () => {
    const a = await db.loginByName('A');
    await db.saveGoals(a.userId, [G('gir', 50)]);
    await db.deleteProfile(a);
    expect(await db.getGoals(a.userId)).toEqual([]);
  });

  it('내보내기에 목표가 들어가고, 가져오면 돌아온다 (파일에 목표가 없으면 지금 목표를 지우지 않는다)', async () => {
    const a = await db.loginByName('A');
    await db.saveGoals(a.userId, [G('threePutts', 2)]);
    const exported = await db.exportUserData(a);
    expect(exported.data.goals).toEqual([G('threePutts', 2)]);

    const b = await db.loginByName('B');
    await db.importUserData(b.userId, exported, [b.userId]);
    expect(await db.getGoals(b.userId)).toEqual([G('threePutts', 2)]);

    await db.saveGoals(b.userId, [G('penalties', 1)]);
    await db.importUserData(b.userId, { data: { rounds: [], goals: [] } }, [b.userId]);
    expect(await db.getGoals(b.userId)).toEqual([G('penalties', 1)]);
  });
});

describe('거리 단위 설정', () => {
  it('없으면 미터, 저장하면 그대로 읽힌다', async () => {
    const p = await db.loginByName('홍길동');
    expect(await db.getPrefs(p.userId)).toEqual({ unit: 'm' });
    expect(await db.savePrefs(p.userId, { unit: 'yd' })).toEqual({ unit: 'yd' });
    expect(await db.getPrefs(p.userId)).toEqual({ unit: 'yd' });
  });

  it('알 수 없는 단위는 미터로 저장한다', async () => {
    const p = await db.loginByName('홍길동');
    expect(await db.savePrefs(p.userId, { unit: 'furlong' })).toEqual({ unit: 'm' });
    expect(await db.savePrefs(p.userId, null)).toEqual({ unit: 'm' });
  });

  it('사용자마다 따로 저장한다', async () => {
    const a = await db.loginByName('A');
    const b = await db.loginByName('B');
    await db.savePrefs(a.userId, { unit: 'yd' });
    expect(await db.getPrefs(b.userId)).toEqual({ unit: 'm' });
  });

  it('프로필을 지우면 설정도 함께 지운다', async () => {
    const a = await db.loginByName('A');
    await db.savePrefs(a.userId, { unit: 'yd' });
    await db.deleteProfile(a);
    expect(await db.getPrefs(a.userId)).toEqual({ unit: 'm' });
  });

  it('내보내기에 설정이 들어가고, 가져오면 돌아온다 (예전 백업에는 없으니 지금 설정을 그대로 둔다)', async () => {
    const a = await db.loginByName('A');
    await db.savePrefs(a.userId, { unit: 'yd' });
    const exported = await db.exportUserData(a);
    expect(exported.data.prefs).toEqual({ unit: 'yd' });

    const b = await db.loginByName('B');
    await db.importUserData(b.userId, exported, [b.userId]);
    expect(await db.getPrefs(b.userId)).toEqual({ unit: 'yd' });

    await db.savePrefs(b.userId, { unit: 'm' });
    await db.importUserData(b.userId, { data: { rounds: [] } }, [b.userId]);      // prefs 가 없는 예전 백업
    expect(await db.getPrefs(b.userId)).toEqual({ unit: 'm' });
  });
});
