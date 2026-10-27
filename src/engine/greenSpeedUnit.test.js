// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { speedLabel } from './greenSpeed.js';
import { readSpeedUnit, saveSpeedUnit, SPEED_UNIT_KEY } from './greenSpeedUnit.js';
import { setUnit } from './units.js';

afterEach(() => { localStorage.clear(); setUnit('m'); vi.restoreAllMocks(); });

describe('speedLabel — 고른 단위가 앞, 다른 단위는 괄호', () => {
  it('미터로 보면 "3.0m (9.8ft) · 보통"', () => {
    expect(speedLabel(9.8, 'm')).toBe('3.0m (9.8ft) · 보통');
    expect(speedLabel(9.8)).toBe('3.0m (9.8ft) · 보통');          // 단위를 안 주면 미터
  });

  it('피트(스팀프)로 보면 반대 — "9.8ft (3.0m) · 보통"', () => {
    expect(speedLabel(9.8, 'ft')).toBe('9.8ft (3.0m) · 보통');
  });

  it('느낌 이름은 스팀프 구간을 따른다', () => {
    expect(speedLabel(7.5, 'm')).toMatch(/· 느림$/);
    expect(speedLabel(10.5, 'ft')).toBe('10.5ft (3.2m) · 빠름');
    expect(speedLabel(12, 'm')).toBe('3.7m (12.0ft) · 매우 빠름');
  });

  it('범위 밖이거나 값이 없으면 null', () => {
    expect(speedLabel(null)).toBeNull();
    expect(speedLabel(3)).toBeNull();
    expect(speedLabel(20, 'ft')).toBeNull();
  });
});

describe('readSpeedUnit — 그린 스피드를 보여 줄 단위', () => {
  it('처음에는 미터, 거리 단위가 야드이면 피트', () => {
    expect(readSpeedUnit()).toBe('m');
    setUnit('yd');
    expect(readSpeedUnit()).toBe('ft');
  });

  it('한 번 고른 단위는 거리 단위 설정보다 우선하고 기억된다', () => {
    setUnit('yd');
    saveSpeedUnit('m');
    expect(localStorage.getItem(SPEED_UNIT_KEY)).toBe('m');
    expect(readSpeedUnit()).toBe('m');
    saveSpeedUnit('ft');
    setUnit('m');
    expect(readSpeedUnit()).toBe('ft');
  });

  it('알 수 없는 값은 무시하고, 저장소를 못 읽어도 기본값으로 동작한다', () => {
    localStorage.setItem(SPEED_UNIT_KEY, 'stimp');
    expect(readSpeedUnit()).toBe('m');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readSpeedUnit()).toBe('m');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => saveSpeedUnit('ft')).not.toThrow();
  });
});
