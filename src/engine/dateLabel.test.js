import { describe, it, expect } from 'vitest';
import { roundDateLabel, roundDateLong } from './dateLabel.js';

// 라운드 날짜는 늘 연도까지 — 좁은 칸은 연도 뒤 두 자리(26.9.20), 월·일은 0 을 채우지 않는다
const D = new Date(2026, 8, 20, 12).toISOString();      // 2026-09-20 정오 (로컬)
const NEW_YEAR = new Date(2027, 0, 3, 12).toISOString();

describe('라운드 날짜 표기', () => {
  it('좁은 칸용 — 26.9.20 (연도는 뒤 두 자리만)', () => {
    expect(roundDateLabel(D)).toBe('26.9.20');
    expect(roundDateLabel(NEW_YEAR)).toBe('27.1.3');
    expect(roundDateLabel(new Date(2026, 7, 29, 12).toISOString())).toBe('26.8.29');   // 사용자가 든 예
    expect(roundDateLabel(D)).not.toContain('2026');
  });

  it('해가 다른 라운드는 연도로 구분된다 (9/20 만으로는 구분이 안 되던 것)', () => {
    expect(roundDateLabel(new Date(2025, 8, 20, 12).toISOString())).not.toBe(roundDateLabel(D));
  });

  it('넉넉한 칸용 — 2026년 9월 20일', () => {
    expect(roundDateLong(D)).toBe('2026년 9월 20일');
    expect(roundDateLong(NEW_YEAR)).toBe('2027년 1월 3일');
  });

  it('날짜 문자열(YYYY-MM-DD)도 읽는다', () => {
    expect(roundDateLabel('2026-09-20T12:00:00')).toBe('26.9.20');
  });

  it('읽을 수 없는 값은 앞 10글자 그대로, 비어 있으면 빈 글 (화면이 깨지지 않는다)', () => {
    expect(roundDateLabel('날짜 모름 라운드입니다 정말로')).toBe('날짜 모름 라운드입');
    expect(roundDateLabel(null)).toBe('');
    expect(roundDateLabel(undefined)).toBe('');
    expect(roundDateLabel('')).toBe('');
    expect(roundDateLong('x')).toBe('x');
  });
});
