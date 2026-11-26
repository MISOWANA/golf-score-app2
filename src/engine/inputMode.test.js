import { describe, it, expect } from 'vitest';
import { INPUT_MODES, isInputMode, inputModeOf, inputModeLabel, INPUT_MODE_INFO } from './inputMode.js';
import { sanitizePrefs } from './units.js';
import { createRound } from './newRound.js';
import { PARS } from '../test/fixtures.js';

describe('inputModeOf — 라운드의 입력 모드', () => {
  it('간단 · 세부는 그대로 읽는다', () => {
    expect(inputModeOf({ inputMode: 'simple' })).toBe('simple');
    expect(inputModeOf({ inputMode: 'detailed' })).toBe('detailed');
  });

  it('값이 없는 예전 라운드 · 알 수 없는 값은 세부 입력이다 (예전 화면이 그대로 열리게)', () => {
    expect(inputModeOf({})).toBe('detailed');
    expect(inputModeOf({ inputMode: null })).toBe('detailed');
    expect(inputModeOf({ inputMode: 'quick' })).toBe('detailed');
    expect(inputModeOf(null)).toBe('detailed');
    expect(inputModeOf(undefined)).toBe('detailed');
  });

  it('두 가지뿐이고, 이름과 설명은 설정 화면 카드에 쓰는 문구다', () => {
    expect(INPUT_MODES).toEqual(['simple', 'detailed']);
    expect(isInputMode('simple')).toBe(true);
    expect(isInputMode('')).toBe(false);
    expect(inputModeLabel('simple')).toBe('간단 입력');
    expect(inputModeLabel('detailed')).toBe('세부 입력');
    expect(inputModeLabel('x')).toBeNull();
    expect(INPUT_MODE_INFO.simple.desc).toBe('스코어와 퍼팅만 빠르게');
    expect(INPUT_MODE_INFO.detailed.desc).toBe('샷마다 클럽·거리·결과까지');
  });
});

describe('sanitizePrefs — 기본 입력 모드', () => {
  it('고른 기본 모드는 남기고, 고르지 않았거나 알 수 없는 값은 키를 두지 않는다', () => {
    expect(sanitizePrefs({ unit: 'm', defaultInputMode: 'simple' })).toEqual({ unit: 'm', defaultInputMode: 'simple' });
    expect(sanitizePrefs({ unit: 'yd', firstPutt: 6, defaultInputMode: 'detailed' })).toEqual({ unit: 'yd', firstPutt: 6, defaultInputMode: 'detailed' });
    expect(sanitizePrefs({ unit: 'm', defaultInputMode: null })).toEqual({ unit: 'm' });
    expect(sanitizePrefs({ unit: 'm', defaultInputMode: 'fast' })).toEqual({ unit: 'm' });
    expect(sanitizePrefs({ unit: 'm' })).toEqual({ unit: 'm' });
  });
});

describe('createRound — 입력 모드', () => {
  const base = { id: '1', players: ['나'], courseName: 'CC', pars: PARS, teeBox: '화이트티', date: '2026-10-01T12:00:00.000Z' };

  it('1인 라운드는 고른 모드를 라운드에 남긴다', () => {
    expect(createRound({ ...base, inputMode: 'simple' }).inputMode).toBe('simple');
    expect(createRound({ ...base, inputMode: 'detailed' }).inputMode).toBe('detailed');
  });

  it('동반자 라운드는 모드를 남기지 않는다 — 늘 간편 스코어 화면이다', () => {
    const r = createRound({ ...base, players: ['나', '철수'], inputMode: 'simple' });
    expect('inputMode' in r).toBe(false);
    expect(inputModeOf(r)).toBe('detailed');   // 읽어도 화면은 players 로 동반자를 먼저 가른다
  });

  it('모드를 넘기지 않거나 알 수 없는 값이면 남기지 않는다 (읽을 때 세부 입력)', () => {
    expect('inputMode' in createRound(base)).toBe(false);
    expect('inputMode' in createRound({ ...base, inputMode: 'x' })).toBe(false);
  });
});
