import { describe, it, expect } from 'vitest';
import { roundDateLabel, roundDateLong, roundDateParts } from './dateLabel.js';

// 라운드 날짜는 늘 연도까지 — 월·일은 0 을 채우지 않는다
const D = new Date(2026, 8, 20, 12).toISOString();      // 2026-09-20 정오 (로컬)
const NEW_YEAR = new Date(2027, 0, 3, 12).toISOString();

describe('라운드 날짜 표기', () => {
  it('좁은 칸용 — 2026.9.20', () => {
    expect(roundDateLabel(D)).toBe('2026.9.20');
    expect(roundDateLabel(NEW_YEAR)).toBe('2027.1.3');
  });

  it('해가 다른 라운드는 연도로 구분된다 (9/20 만으로는 구분이 안 되던 것)', () => {
    expect(roundDateLabel(new Date(2025, 8, 20, 12).toISOString())).not.toBe(roundDateLabel(D));
  });

  it('넉넉한 칸용 — 2026년 9월 20일', () => {
    expect(roundDateLong(D)).toBe('2026년 9월 20일');
    expect(roundDateLong(NEW_YEAR)).toBe('2027년 1월 3일');
  });

  it('막대 눈금용 — 월/일 과 연도를 따로 돌려준다', () => {
    expect(roundDateParts(D)).toEqual({ md: '9/20', year: '2026' });
  });

  it('날짜 문자열(YYYY-MM-DD)도 읽는다', () => {
    expect(roundDateLabel('2026-09-20T12:00:00')).toBe('2026.9.20');
  });

  it('읽을 수 없는 값은 앞 10글자 그대로, 비어 있으면 빈 글 (화면이 깨지지 않는다)', () => {
    expect(roundDateLabel('날짜 모름 라운드입니다 정말로')).toBe('날짜 모름 라운드입');
    expect(roundDateLabel(null)).toBe('');
    expect(roundDateLabel(undefined)).toBe('');
    expect(roundDateLabel('')).toBe('');
    expect(roundDateLong('x')).toBe('x');
    expect(roundDateParts(null)).toEqual({ md: '', year: '' });
  });
});
