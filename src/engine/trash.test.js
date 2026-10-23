import { describe, it, expect } from 'vitest';
import { TRASH_KEEP_DAYS, isTrashExpired, trashDaysLeft } from './trash.js';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-10-01T00:00:00Z');

describe('휴지통 보관 기간', () => {
  it('7일 보관한다', () => {
    expect(TRASH_KEEP_DAYS).toBe(7);
  });

  it('정확히 7일째부터 지난 것으로 본다', () => {
    expect(isTrashExpired(T0, T0.getTime() + 7 * DAY - 1)).toBe(false);
    expect(isTrashExpired(T0, T0.getTime() + 7 * DAY)).toBe(true);
  });

  it('남은 일수: 방금 지웠으면 7일, 하루마다 줄고 0 아래로 내려가지 않는다', () => {
    expect(trashDaysLeft(T0, T0.getTime())).toBe(7);
    expect(trashDaysLeft(T0, T0.getTime() + 3 * DAY + 5 * 60 * 60 * 1000)).toBe(4);
    expect(trashDaysLeft(T0, T0.getTime() + 30 * DAY)).toBe(0);
  });

  it('시각을 읽을 수 없으면 보관 기간 전체로 보여 준다', () => {
    expect(trashDaysLeft('x')).toBe(7);
  });
});
