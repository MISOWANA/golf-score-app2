import { describe, it, expect } from 'vitest';
import { localNoonISO } from './roundDate.js';

describe('localNoonISO', () => {
  it('YYYY-MM-DD 를 그날 로컬 정오의 ISO 문자열로 바꾼다', () => {
    expect(localNoonISO('2026-09-20')).toBe(new Date(2026, 8, 20, 12, 0, 0).toISOString());
  });

  it.each([[''], [null], [undefined], ['abc'], ['2026-09'], ['2026-13-01'], ['2026-02-30'], ['0-0-0']])('잘못된 날짜(%j)는 null 이다 — 예외를 던지지 않는다', (v) => {
    expect(() => localNoonISO(v)).not.toThrow();
    expect(localNoonISO(v)).toBeNull();
  });

  it('윤일을 받는다', () => {
    expect(localNoonISO('2028-02-29')).not.toBeNull();
    expect(localNoonISO('2027-02-29')).toBeNull();
  });
});
