// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import SwipeDistance from './SwipeDistance.jsx';

// 거리 칸 — 숫자 줄(− 숫자 +) 아래에 칸 전체 폭 슬라이더, −/+ 는 길게 누르면 계속 바뀐다.

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function Harness({ initial = 100, min = 1, max = 300, step = 1, decimals = 0, sliderMax = 300 }) {
  const [v, setV] = useState(initial);
  return <SwipeDistance value={v} start={150} min={min} max={max} step={step} decimals={decimals} sliderMax={sliderMax} onChange={setV} />;
}

const ptr = (el, type, id = 1) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'pointerId', { value: id });
  fireEvent(el, e);
};
const plus = () => [...document.querySelectorAll('button')].find((b) => b.textContent === '+');
const minus = () => [...document.querySelectorAll('button')].find((b) => b.textContent === '−');
const shown = () => Number(document.querySelector('[data-role="dist-value"]').textContent.replace(/[^\d.]/g, ''));
const tick = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe('− / + 버튼', () => {
  it('짧게 누르면(click) 한 칸 바뀐다', () => {
    render(<Harness initial={100} />);
    fireEvent.click(plus());
    expect(shown()).toBe(101);
    fireEvent.click(minus());
    fireEvent.click(minus());
    expect(shown()).toBe(99);
  });

  it('버튼은 44×44 이다', () => {
    render(<Harness />);
    for (const b of [plus(), minus()]) expect([b.style.width, b.style.height]).toEqual(['44px', '44px']);
  });

  it('길게 누르면 0.45초 뒤부터 계속 바뀐다 (처음 12번은 한 칸씩)', () => {
    render(<Harness initial={100} />);
    ptr(plus(), 'pointerdown');
    tick(440);
    expect(shown()).toBe(100);                          // 아직 반복 전
    tick(10 + 90 * 5);
    expect(shown()).toBe(105);
    ptr(plus(), 'pointerup');
    tick(1000);
    expect(shown()).toBe(105);                          // 떼면 멈춘다
  });

  it('오래 누를수록 큰 폭으로 바뀐다 (12번 뒤 두 칸씩)', () => {
    render(<Harness initial={10} />);
    ptr(plus(), 'pointerdown');
    tick(450 + 90 * 12);
    expect(shown()).toBe(22);
    tick(90 * 3);
    expect(shown()).toBe(28);                           // 두 칸씩 3번
    ptr(plus(), 'pointerup');
  });

  it('길게 눌렀다 떼면 뒤따라오는 click 은 한 칸을 더하지 않는다 — 다음 짧은 누름은 정상', () => {
    render(<Harness initial={100} />);
    ptr(plus(), 'pointerdown');
    tick(450 + 90 * 3);
    ptr(plus(), 'pointerup');
    fireEvent.click(plus());                            // 손가락을 뗄 때 따라오는 click
    expect(shown()).toBe(103);
    tick(200);                                          // 표시가 풀린 뒤
    fireEvent.click(plus());
    expect(shown()).toBe(104);
  });

  it('끝(최대·최소)에 닿으면 반복이 멈춘다', () => {
    render(<Harness initial={297} max={300} />);
    ptr(plus(), 'pointerdown');
    tick(450 + 90 * 10);
    expect(shown()).toBe(300);
    ptr(plus(), 'pointerup');
    cleanup();
    render(<Harness initial={3} min={1} />);
    ptr(minus(), 'pointerdown');
    tick(450 + 90 * 10);
    expect(shown()).toBe(1);
    ptr(minus(), 'pointerup');
  });

  it('소수 한 자리 칸(퍼트 0.5m 단위)도 한 칸씩 반복한다', () => {
    render(<Harness initial={5} min={0.5} max={30} step={0.5} decimals={1} sliderMax={30} />);
    ptr(plus(), 'pointerdown');
    tick(450 + 90 * 4);
    expect(shown()).toBe(7);
    ptr(plus(), 'pointerup');
  });

  it('누르는 도중 취소되면 멈추고, 뒤따르는 click 도 없다', () => {
    render(<Harness initial={100} />);
    ptr(plus(), 'pointerdown');
    tick(450 + 90 * 2);
    ptr(plus(), 'pointercancel');
    tick(1000);
    expect(shown()).toBe(102);
    fireEvent.click(plus());                            // 취소 뒤의 짧은 누름은 정상으로 한 칸
    expect(shown()).toBe(103);
  });

  it('짧게 눌렀다 떼면(0.45초 안) 반복은 시작하지 않는다', () => {
    render(<Harness initial={100} />);
    ptr(plus(), 'pointerdown');
    tick(300);
    ptr(plus(), 'pointerup');
    fireEvent.click(plus());
    tick(2000);
    expect(shown()).toBe(101);
  });
});

describe('배치', () => {
  it('슬라이더는 − 숫자 + 줄 아래에 칸 전체 폭으로 있다', () => {
    render(<Harness />);
    const slider = document.querySelector('[data-role="dist-slider"]');
    const row = document.querySelector('[data-role="dist-value"]').parentElement;
    expect(row.contains(slider)).toBe(false);                         // 숫자 줄 안이 아니라
    expect(slider.parentElement).toBe(row.parentElement);             // 같은 칸 안의 아래 줄
    expect(row.nextElementSibling).toBe(slider);
    expect(row.children).toHaveLength(3);                             // − 숫자 +
  });

  it('비어 있을 때 "탭하면 …부터" 줄은 손가락이 닿기 쉽게 44px 높이다', () => {
    render(<SwipeDistance value={null} start={150} min={1} max={300} sliderMax={300} onChange={() => {}} />);
    const hint = document.querySelector('[data-role="dist-hint"]');
    expect(hint.style.minHeight).toBe('44px');
    expect(hint.textContent).toContain('탭하면 150m부터');
  });

  it('슬라이더가 없는 칸(바람 세기 등)은 숫자 안에 안내가 들어간다', () => {
    render(<SwipeDistance value={null} start={5} min={0} max={20} onChange={() => {}} />);
    expect(document.querySelector('[data-role="dist-slider"]')).toBeNull();
    expect(document.querySelector('[data-role="dist-value"]').contains(document.querySelector('[data-role="dist-hint"]'))).toBe(true);
  });
});
