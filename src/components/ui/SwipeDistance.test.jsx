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

// 슬라이더의 손가락 동작 — Chrome 은 손가락이 닿는 순간(pointerdown 직후) 값을 바꿔 놓고(input) 그다음에야 세로 스크롤이면 pointercancel 을 보낸다.
// 실제 순서 그대로 재현한다: pointerdown → input(change) → (pointercancel | pointermove… | pointerup)
const touchPtr = (el, type, x, y) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerType', { value: 'touch' });
  Object.defineProperty(e, 'pointerId', { value: 1 });
  fireEvent(el, e);
};
const slider = () => document.querySelector('[data-role="dist-slider"]');
const jumpTo = (v) => fireEvent.change(slider(), { target: { value: String(v) } });

describe('슬라이더 손가락 동작', () => {
  it('세로로 밀어 스크롤하면 닿는 순간 바뀐 값은 버려진다 (스크롤하려다 거리가 입력되지 않는다)', () => {
    render(<Harness initial={100} />);
    touchPtr(slider(), 'pointerdown', 200, 500);
    jumpTo(250);                                         // 브라우저가 닿은 자리로 값을 옮긴다
    touchPtr(slider(), 'pointercancel', 200, 380);       // 세로 스크롤이 시작됐다
    expect(shown()).toBe(100);
    expect(slider().value).toBe('100');                  // 손잡이도 제자리로
  });

  it('값이 비어 있을 때 스크롤로 스쳐도 아무것도 입력되지 않는다', () => {
    const onChange = vi.fn();
    render(<SwipeDistance value={null} start={150} min={1} max={300} sliderMax={300} onChange={onChange} />);
    touchPtr(slider(), 'pointerdown', 120, 500);
    jumpTo(80);
    touchPtr(slider(), 'pointermove', 121, 430);
    touchPtr(slider(), 'pointercancel', 121, 380);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('가로로 끌면 그때부터 값이 바뀐다', () => {
    render(<Harness initial={100} />);
    touchPtr(slider(), 'pointerdown', 100, 500);
    touchPtr(slider(), 'pointermove', 112, 502);         // 가로로 6px 넘게
    jumpTo(140);
    jumpTo(180);
    touchPtr(slider(), 'pointerup', 190, 502);
    expect(shown()).toBe(180);
  });

  it('거의 움직이지 않고 떼면(탭) 닿은 자리의 값이 들어간다', () => {
    render(<Harness initial={100} />);
    touchPtr(slider(), 'pointerdown', 150, 500);
    jumpTo(220);
    expect(shown()).toBe(100);                           // 떼기 전에는 보류
    touchPtr(slider(), 'pointerup', 151, 500);
    expect(shown()).toBe(220);
  });

  it('세로로 먼저 움직인 뒤에는 가로로 흔들려도 끌기로 보지 않는다', () => {
    render(<Harness initial={100} />);
    touchPtr(slider(), 'pointerdown', 150, 500);
    touchPtr(slider(), 'pointermove', 158, 440);         // 가로 8px · 세로 60px — 세로가 크다
    jumpTo(230);
    touchPtr(slider(), 'pointercancel', 158, 400);
    expect(shown()).toBe(100);
  });

  it('마우스 · 키보드(터치가 아닌 입력)는 보류 없이 바로 바뀐다', () => {
    render(<Harness initial={100} />);
    jumpTo(130);
    expect(shown()).toBe(130);
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
