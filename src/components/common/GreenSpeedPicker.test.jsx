// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    expect(screen.getByText('탭하면 보통(2.7m)부터 시작')).toBeTruthy();
  });

  it('단위 토글은 미터가 먼저고, 피트로 바꾸면 칸 안의 숫자도 피트가 된다', () => {
    render(<GreenSpeedPicker value={null} onChange={() => {}} />);
    expect([...document.querySelectorAll('[data-role^="gs-unit-"]')].map((b) => b.textContent)).toEqual(['미터', '피트(스팀프)']);
    fireEvent.click(document.querySelector('[data-role="gs-unit-ft"]'));
    expect([pressed('m'), pressed('ft')]).toEqual(['false', 'true']);
    expect([preset('slow'), preset('medium'), preset('fast'), preset('veryFast')]).toEqual(['느림7.5ft', '보통9.0ft', '빠름10.5ft', '매우 빠름12.0ft']);
    expect(screen.getByText('탭하면 보통(스팀프 9.0)부터 시작')).toBeTruthy();
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
