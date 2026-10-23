import { describe, it, expect } from 'vitest';
import { splitKoEn } from './koEn.js';

describe('splitKoEn — "영문 · 한글" 제목 나누기', () => {
  it('영문 이름과 한글 이름으로 나눈다', () => {
    expect(splitKoEn('SCORE BREAKDOWN · 스코어 기준 손실 (파 대비)')).toEqual({ en: 'SCORE BREAKDOWN', ko: '스코어 기준 손실 (파 대비)' });
    expect(splitKoEn('IMPROVE · 개선 포인트')).toEqual({ en: 'IMPROVE', ko: '개선 포인트' });
  });

  it('영문 이름에 공백·&·/·하이픈·숫자가 있어도 나눈다', () => {
    expect(splitKoEn('THREE-PUTT · 3퍼트 원인')).toEqual({ en: 'THREE-PUTT', ko: '3퍼트 원인' });
    expect(splitKoEn('HOLE BY HOLE · 홀별 복기').en).toBe('HOLE BY HOLE');
  });

  it('한글 쪽에 " · " 가 또 있어도 첫 구분자에서만 나눈다', () => {
    expect(splitKoEn('FOCUS · 다음 라운드 · 포커스')).toEqual({ en: 'FOCUS', ko: '다음 라운드 · 포커스' });
  });

  it('형식이 다르면 나누지 않는다', () => {
    expect(splitKoEn('잘한 점')).toEqual({ en: null, ko: '잘한 점' });
    expect(splitKoEn('스코어 · 요약')).toEqual({ en: null, ko: '스코어 · 요약' });
    expect(splitKoEn(undefined)).toEqual({ en: null, ko: undefined });
  });
});
