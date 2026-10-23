// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import GreenSpeedPicker from './GreenSpeedPicker.jsx';
import { setUnit } from '../../engine/units.js';

afterEach(() => { cleanup(); localStorage.clear(); setUnit('m'); });

const preset = (id) => document.querySelector(`[data-role="gs-preset-${id}"]`).textContent;
const pressed = (u) => document.querySelector(`[data-role="gs-unit-${u}"]`).getAttribute('aria-pressed');

describe('그린 스피드 선택', () => {
  it('처음에는 미터로 보여 준다 — 느낌 칸 안의 숫자도 미터', () => {
    render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    expect([pressed('m'), pressed('ft')]).toEqual(['true', 'false']);
    expect([preset('slow'), preset('medium'), preset('fast'), preset('veryFast')]).toEqual(['느림2.3m', '보통2.7m', '빠름3.2m', '매우 빠름3.7m']);
    expect(document.querySelector('[data-role="gs-value"]').textContent).toContain('탭하면 보통(2.7m)부터');
  });

  it('단위 토글은 미터가 먼저고, 피트로 바꾸면 칸 안의 숫자도 피트가 된다', () => {
    render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    expect([...document.querySelectorAll('[data-role^="gs-unit-"]')].map((b) => b.textContent)).toEqual(['미터', '피트(스팀프)']);
    fireEvent.click(document.querySelector('[data-role="gs-unit-ft"]'));
    expect([pressed('m'), pressed('ft')]).toEqual(['false', 'true']);
    expect([preset('slow'), preset('medium'), preset('fast'), preset('veryFast')]).toEqual(['느림7.5ft', '보통9.0ft', '빠름10.5ft', '매우 빠름12.0ft']);
    expect(document.querySelector('[data-role="gs-value"]').textContent).toContain('탭하면 보통(스팀프 9.0)부터');
    fireEvent.click(document.querySelector('[data-role="gs-unit-m"]'));
    expect(preset('medium')).toBe('보통2.7m');
  });

  it('고른 단위는 기억한다', () => {
    const first = render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    fireEvent.click(document.querySelector('[data-role="gs-unit-ft"]'));
    first.unmount();
    render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    expect(pressed('ft')).toBe('true');
    expect(preset('medium')).toBe('보통9.0ft');
  });

  it('칸을 누르면 단위와 상관없이 스팀프 피트 값으로 저장한다', () => {
    const onChange = vi.fn();
    render(<GreenSpeedPicker value={null} onChange={onChange} />);
    fireEvent.click(document.querySelector('[data-role="gs-preset-fast"]'));   // 미터로 보이는 칸
    expect(onChange).toHaveBeenLastCalledWith(10.5);
  });

  it('값이 있으면 큰 숫자도 고른 단위로 보인다', () => {
    render(<GreenSpeedPicker value={10.5} onChange={() => {}} />);
    expect(document.querySelector('[data-role="gs-value"]').textContent).toContain('3.2');
    expect(document.querySelector('[data-role="gs-value"]').textContent).toContain('스팀프 10.5피트');
    fireEvent.click(document.querySelector('[data-role="gs-unit-ft"]'));
    expect(document.querySelector('[data-role="gs-value"]').textContent).toContain('10.5');
    expect(document.querySelector('[data-role="gs-value"]').textContent).toContain('약 3.2m');
  });

  it('거리 단위가 야드이면 처음에 피트로 보여 준다 (골퍼가 이미 야드를 고른 경우)', () => {
    setUnit('yd');
    render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    expect(pressed('ft')).toBe('true');
    expect(preset('medium')).toBe('보통9.0ft');
  });

  it('예전에 직접 고른 단위가 있으면 그대로 따른다 (피트를 골랐던 사람은 피트)', () => {
    localStorage.setItem('bb.greenSpeedUnit', 'ft');
    render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    expect(pressed('ft')).toBe('true');
  });
});

describe('그린 스피드 — 가운데 숫자를 밀어서 맞추기', () => {
  // 값을 들고 있는 껍데기 (실제 화면처럼 바뀐 값이 다시 내려온다)
  function Harness({ initial = null, spy }) {
    const [v, setV] = useState(initial);
    return <GreenSpeedPicker value={v} onChange={(x) => { spy?.(x); setV(x); }} />;
  }
  const box = () => document.querySelector('[data-role="gs-value"]');
  const drag = (dx, dy = 0) => {
    fireEvent.mouseDown(box(), { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 100 + dx, clientY: 100 + dy });
    fireEvent.mouseUp(window, { clientX: 100 + dx, clientY: 100 + dy });
  };
  const shown = () => box().querySelector('span')?.textContent;

  it('값이 없으면 굵은 "—" 대신 가는 막대를 보여 주고 단위 글자는 붙이지 않는다', () => {
    render(<Harness />);
    expect(document.querySelector('[data-role="empty-value"]')).toBeTruthy();
    expect(box().textContent).not.toContain('—');
    expect(box().textContent.startsWith('탭하면')).toBe(true);      // 숫자도 단위도 없이 안내만
    expect(document.querySelector('[data-role="gs-swipe-hint"]').textContent).toBe('← 밀어서 조정 →');
  });

  it('비어 있을 때 탭하면 보통 값부터 시작한다', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    drag(0);
    expect(spy).toHaveBeenLastCalledWith(9);
    expect(shown()).toBe('2.7');
    expect(document.querySelector('[data-role="empty-value"]')).toBeNull();
  });

  it('오른쪽으로 밀면 커지고 왼쪽으로 밀면 작아진다 (미터는 10px마다 0.1m)', () => {
    render(<Harness initial={9} />);
    drag(50);
    expect(shown()).toBe('3.2');
    drag(-30);
    expect(shown()).toBe('2.9');
  });

  it('피트에서는 10px마다 0.5ft', () => {
    render(<Harness initial={9} />);
    fireEvent.click(document.querySelector('[data-role="gs-unit-ft"]'));
    drag(50);
    expect(shown()).toBe('11.5');
    drag(-20);
    expect(shown()).toBe('10.5');
  });

  it('범위(6~14ft)를 넘어가지 않는다', () => {
    render(<Harness initial={9} />);
    drag(2000);
    expect(shown()).toBe('4.3');
    drag(-2000);
    expect(shown()).toBe('1.8');
  });

  it('세로로 밀면 화면 스크롤이라 값을 건드리지 않는다', () => {
    const spy = vi.fn();
    render(<Harness initial={9} spy={spy} />);
    drag(3, 40);
    expect(spy).not.toHaveBeenCalled();
    expect(shown()).toBe('2.7');
  });

  it('비어 있을 때 밀어도 보통 값에서 출발한다', () => {
    render(<Harness />);
    drag(20);
    expect(shown()).toBe('2.9');
  });

  it('값이 있으면 미는 단위를 안내한다 (미터 0.1m · 피트 0.5ft)', () => {
    render(<Harness initial={9} />);
    expect(document.querySelector('[data-role="gs-swipe-hint"]').textContent).toContain('0.1m');
    fireEvent.click(document.querySelector('[data-role="gs-unit-ft"]'));
    expect(document.querySelector('[data-role="gs-swipe-hint"]').textContent).toContain('0.5ft');
  });
});
