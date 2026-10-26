// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readNudgeSnooze, snoozeNudge, isNudgeSnoozed, NUDGE_SNOOZE_DAYS } from './nudgeSnooze.js';

const DAY = 24 * 60 * 60 * 1000;
beforeEach(() => localStorage.clear());

describe('백업 안내 숨기기', () => {
  it('처음에는 숨긴 적이 없다', () => {
    expect(readNudgeSnooze('u1')).toBeNull();
    expect(isNudgeSnoozed(null, 1000)).toBe(false);
  });

  it('숨기면 며칠 뒤까지 안내가 사라지고, 그 뒤에는 다시 보인다', () => {
    const now = 1_700_000_000_000;
    const until = snoozeNudge('u1', now);
    expect(until).toBe(now + NUDGE_SNOOZE_DAYS * DAY);
    expect(readNudgeSnooze('u1')).toBe(until);
    expect(isNudgeSnoozed(until, now + 2 * DAY)).toBe(true);
    expect(isNudgeSnoozed(until, until)).toBe(false);
    expect(isNudgeSnoozed(until, until + 1)).toBe(false);
  });

  it('사용자마다 따로 기억한다', () => {
    snoozeNudge('u1', 1000);
    expect(readNudgeSnooze('u2')).toBeNull();
  });

  it('망가진 값은 숨김 없음으로 읽는다', () => {
    localStorage.setItem('bb.backupNudgeSnooze.u1', 'abc');
    expect(readNudgeSnooze('u1')).toBeNull();
  });
});
