import { describe, it, expect } from 'vitest';
import {
  backupStatus, backupMessage, serializeBackup, backupFileName, parseBackupFile,
  BACKUP_STALE_ROUNDS, BACKUP_STALE_DAYS, BACKUP_FORMAT_VERSION, BACKUP_MAX_BYTES,
} from './backupStatus.js';

const NOW = new Date('2026-10-23T12:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe('backupStatus', () => {
  it('기록이 없으면 알릴 게 없다', () => {
    expect(backupStatus(null, 0, NOW).level).toBe('empty');
  });

  it('백업한 적이 없으면 none — 기록 수를 알려 준다', () => {
    const s = backupStatus(null, 7, NOW);
    expect(s).toMatchObject({ level: 'none', roundsSince: 7 });
    expect(backupMessage(s)).toMatch(/아직 백업한 적이 없어요.*7라운드/);
  });

  it('최근에 백업했고 그 뒤 기록이 적으면 ok', () => {
    const s = backupStatus({ lastBackupAt: daysAgo(3), roundCount: 10 }, 12, NOW);
    expect(s).toMatchObject({ level: 'ok', daysAgo: 3, roundsSince: 2 });
    expect(backupMessage(s)).toBe('마지막 백업 3일 전 · 그 뒤 2라운드');
  });

  it('오늘 백업했으면 "오늘"', () => {
    expect(backupMessage(backupStatus({ lastBackupAt: new Date(NOW).toISOString(), roundCount: 4 }, 4, NOW))).toBe('마지막 백업 오늘');
  });

  it(`백업 뒤 ${BACKUP_STALE_ROUNDS}라운드가 쌓이면 stale`, () => {
    expect(backupStatus({ lastBackupAt: daysAgo(2), roundCount: 10 }, 10 + BACKUP_STALE_ROUNDS - 1, NOW).level).toBe('ok');
    const s = backupStatus({ lastBackupAt: daysAgo(2), roundCount: 10 }, 10 + BACKUP_STALE_ROUNDS, NOW);
    expect(s.level).toBe('stale');
    expect(backupMessage(s)).toMatch(/그 뒤 5라운드가 쌓였어요/);
  });

  it(`${BACKUP_STALE_DAYS}일이 지나도 그 사이 쌓인 기록이 있을 때만 stale`, () => {
    expect(backupStatus({ lastBackupAt: daysAgo(BACKUP_STALE_DAYS + 5), roundCount: 10 }, 10, NOW).level).toBe('ok');
    expect(backupStatus({ lastBackupAt: daysAgo(BACKUP_STALE_DAYS + 5), roundCount: 10 }, 11, NOW).level).toBe('stale');
  });

  it('라운드를 지워 백업 때보다 적어져도 음수가 되지 않는다', () => {
    expect(backupStatus({ lastBackupAt: daysAgo(1), roundCount: 10 }, 8, NOW).roundsSince).toBe(0);
  });
});

describe('백업 파일', () => {
  const exported = { version: '1.0', exportDate: '2026-10-23T00:00:00Z', userId: 'u1', data: { rounds: [{ id: 'a' }, { id: 'b' }], clubs: [] } };

  it('한 줄 JSON 이고 버전·앱 이름·라운드 수가 들어간다 (들여쓰기 없음)', () => {
    const text = serializeBackup(exported);
    expect(text).not.toMatch(/\n/);
    expect(JSON.parse(text)).toMatchObject({ app: 'birdie-buddy', version: BACKUP_FORMAT_VERSION, roundCount: 2, userId: 'u1' });
    expect(text.length).toBeLessThan(JSON.stringify(exported, null, 2).length);
  });

  it('파일 이름: 이름 · 날짜, 특수문자·공백은 _ 로', () => {
    expect(backupFileName('김 길동/2', new Date(2026, 9, 3))).toBe('birdie-buddy-김_길동_2-2026-10-03.json');
    expect(backupFileName('', new Date(2026, 0, 5))).toBe('birdie-buddy-user-2026-01-05.json');
  });

  it('내보낸 파일을 다시 읽을 수 있다', () => {
    expect(parseBackupFile(serializeBackup(exported)).data.rounds).toHaveLength(2);
  });

  it('version 이 없는 예전 파일과 1.0 은 받는다', () => {
    expect(() => parseBackupFile(JSON.stringify({ data: { rounds: [] } }))).not.toThrow();
    expect(() => parseBackupFile(JSON.stringify({ version: '1.0', data: { rounds: [] } }))).not.toThrow();
  });

  it('더 새로운 형식(2.x)은 거절하고 앱 갱신을 안내한다', () => {
    expect(() => parseBackupFile(JSON.stringify({ version: '2.0', data: { rounds: [] } }))).toThrow(/새로운 형식.*갱신/);
  });

  it('JSON 이 아니거나 라운드가 없으면 알아보기 쉬운 메시지로 거절한다', () => {
    expect(() => parseBackupFile('not json')).toThrow(/읽을 수 없어요/);
    expect(() => parseBackupFile('{}')).toThrow(/유효하지 않은 파일/);
    expect(() => parseBackupFile(JSON.stringify({ data: { rounds: 'x' } }))).toThrow(/유효하지 않은 파일/);
  });

  it('너무 큰 파일은 읽기 전에 거절한다', () => {
    expect(() => parseBackupFile('{}', BACKUP_MAX_BYTES + 1)).toThrow(/너무 큽니다/);
  });
});
