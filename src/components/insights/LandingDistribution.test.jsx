// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import LandingDistribution from './LandingDistribution.jsx';

// 그린 랜딩 분포 — 입력 휠(LandingWheel)과 같은 12조각 모양, 조각마다 그 시각에 멈춘 횟수

afterEach(cleanup);

const sector = (hour) => document.querySelector(`[data-role="landing-point"][data-hour="${hour}"]`);
const label = (q) => document.querySelector(`[data-role="landing-label"][data-quadrant="${q}"]`).textContent;
const MANY = { 12: 3, 1: 2, 2: 1, 3: 4, 4: 2, 5: 6, 6: 9, 7: 4, 8: 1, 9: 2, 10: 1, 11: 2 };   // 총 37

describe('그린 랜딩 분포 휠', () => {
  it('기록이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<LandingDistribution counts={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('12조각이 모두 있고, 조각마다 횟수가 data-count 로 붙는다', () => {
    render(<LandingDistribution counts={MANY} />);
    expect(document.querySelectorAll('[data-role="landing-point"]')).toHaveLength(12);
    for (const [h, c] of Object.entries(MANY)) expect(sector(h).getAttribute('data-count')).toBe(String(c));
  });

  it('조각 안에 횟수와 시각이 보이고, 기록 없는 조각은 시각 숫자만 보인다 (입력 휠처럼)', () => {
    render(<LandingDistribution counts={{ 6: 3, 7: 1 }} />);
    expect(sector(6).textContent).toBe('36시');
    expect(sector(7).textContent).toBe('17시');
    expect(sector(12).textContent).toBe('12');
    expect(sector(3).textContent).toBe('3');
  });

  it('가장 많은 조각만 금색(peak)으로 켜진다 — 같은 횟수가 여럿이면 모두', () => {
    render(<LandingDistribution counts={MANY} />);
    expect(document.querySelectorAll('[data-role="landing-point"][data-peak="1"]')).toHaveLength(1);
    expect(sector(6).getAttribute('data-peak')).toBe('1');
    cleanup();
    render(<LandingDistribution counts={{ 3: 2, 9: 2, 6: 1 }} />);
    expect([...document.querySelectorAll('[data-peak="1"]')].map((g) => g.getAttribute('data-hour')).sort()).toEqual(['3', '9']);
  });

  it('가운데에 총 횟수가, 바깥에 방향별 비율이 보인다', () => {
    render(<LandingDistribution counts={MANY} />);
    expect(document.querySelector('[data-role="landing-hub-total"]').textContent).toBe('37회');
    expect(label('long')).toBe('LONG19%');       // 11·12·1시 = 2+3+2 = 7 / 37
    expect(label('right')).toBe('RIGHT19%');     // 2~4시 = 1+4+2 = 7
    expect(label('short')).toBe('SHORT51%');     // 5~7시 = 6+9+4 = 19
    expect(label('left')).toBe('LEFT11%');       // 8~10시 = 1+2+1 = 4
  });

  it('한쪽으로 쏠렸을 때만 평균 방향 점과 한 줄 설명이 나온다', () => {
    render(<LandingDistribution counts={{ 6: 3, 7: 2, 5: 1 }} />);
    expect(document.querySelector('[data-role="landing-mean"]')).toBeTruthy();
    expect(document.querySelector('[data-role="landing-caption"]').textContent).toContain('평균 위치 6시 쪽');
    cleanup();
    render(<LandingDistribution counts={{ 12: 2, 3: 2, 6: 2, 9: 2 }} />);
    expect(document.querySelector('[data-role="landing-mean"]')).toBeNull();
    expect(document.querySelector('[data-role="landing-caption"]').textContent).toBe('고르게 퍼져 있어요');
  });

  it('읽어 주는 이름에 총 횟수와 방향별 비율이 들어 있다', () => {
    render(<LandingDistribution counts={MANY} />);
    const name = document.querySelector('svg').getAttribute('aria-label');
    expect(name).toContain('총 37회');
    expect(name).toContain('숏 51%');
  });
});
