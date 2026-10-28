// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import PuttBoard from './PuttBoard.jsx';
import { buildMiss, DEFAULT_FRAME } from '../../engine/puttMiss.js';

// 판의 손가락 동작 — 판 배경은 탭만 위치로 받고(스크롤은 그대로 된다), 미세 조정은 찍힌 위치의 손잡이를 끌어서 한다.
// jsdom 은 크기를 모르니 모든 요소가 350×320 인 것처럼 돌려준다 (판 좌표 = 화면 좌표).

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 350, bottom: 320, width: 350, height: 320, x: 0, y: 0, toJSON: () => ({}) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// 포인터 이벤트 — jsdom 에는 PointerEvent 가 없어 MouseEvent 에 pointerId 를 붙여 보낸다
const ptr = (el, type, x, y, id = 1) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: id });
  fireEvent(el, e);
};
const board = () => document.querySelector('[data-role="putt-board"]');
const handle = () => document.querySelector('[data-role="putt-marker-handle"]');

// 홀은 판 (175, 160). 퍼팅 거리 4m 의 처음 축척은 ±5m(1m ≈ 29px), 위치를 찍어 둔 뒤에는 그 위치가 들어오는 ±3m(1m ≈ 48px)
const HOLE = [175, 160];
const stopAt = (x, y) => buildMiss({ stop: { x, y }, brk: null, frame: DEFAULT_FRAME, tol: 0.15 });

describe('판 배경 — 탭만 위치로 받는다', () => {
  it('판 배경은 세로 스크롤을 허락한다 (touch-action: pan-y) — 판 위에서 화면을 밀 수 있다', () => {
    render(<PuttBoard distance={4} onChange={() => {}} />);
    expect(board().style.touchAction).toBe('pan-y');
  });

  it('거의 움직이지 않고 떼면 뗀 자리가 멈춘 위치로 기록된다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} onChange={onChange} />);
    ptr(board(), 'pointerdown', HOLE[0], HOLE[1] + 29);       // 홀 아래(짧은 쪽) 1m
    expect(onChange).not.toHaveBeenCalled();                  // 누르는 순간에는 기록하지 않는다
    ptr(board(), 'pointerup', HOLE[0], HOLE[1] + 29);
    expect(onChange).toHaveBeenCalledTimes(1);
    const m = onChange.mock.calls[0][0];
    expect(m.x).toBeCloseTo(0, 1);
    expect(m.y).toBeCloseTo(-1, 1);
    expect(m.along).toBe('short');
  });

  it('손가락이 10px 넘게 움직였으면(스크롤 · 끌기) 위치를 바꾸지 않는다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} onChange={onChange} />);
    ptr(board(), 'pointerdown', 100, 200);
    ptr(board(), 'pointermove', 100, 230);
    ptr(board(), 'pointerup', 100, 230);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('브라우저가 스크롤을 가져가 포인터가 취소되면 위치를 바꾸지 않는다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} onChange={onChange} />);
    ptr(board(), 'pointerdown', 100, 200);
    ptr(board(), 'pointercancel', 100, 200);
    ptr(board(), 'pointerup', 100, 200);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('이미 위치가 있어도 판 배경을 탭하면 그 자리로 옮겨진다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} miss={stopAt(0, -1)} onChange={onChange} />);
    ptr(board(), 'pointerdown', HOLE[0] + 48, HOLE[1]);
    ptr(board(), 'pointerup', HOLE[0] + 48, HOLE[1]);
    const m = onChange.mock.calls[0][0];
    expect(m.x).toBeCloseTo(1, 1);
    expect(m.y).toBeCloseTo(0, 1);
  });
});

describe('손잡이 — 찍힌 위치의 흰 점을 끌어 미세 조정', () => {
  it('위치가 없으면 손잡이도 없다', () => {
    render(<PuttBoard distance={4} onChange={() => {}} />);
    expect(handle()).toBeNull();
  });

  it('위치가 있으면 48px 손잡이가 있고, 그 위에서는 화면이 스크롤되지 않는다 (touch-action: none)', () => {
    render(<PuttBoard distance={4} miss={stopAt(0, -1)} onChange={() => {}} />);
    expect(handle().style.touchAction).toBe('none');
    expect([handle().style.width, handle().style.height]).toEqual(['48px', '48px']);
  });

  it('끌면 0.5배로 움직이고, 손을 뗄 때 한 번 기록한다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} miss={stopAt(0, -1)} onChange={onChange} />);
    ptr(handle(), 'pointerdown', 175, 208);
    ptr(handle(), 'pointermove', 195, 208);                  // 오른쪽으로 20px
    expect(onChange).not.toHaveBeenCalled();                  // 끄는 동안에는 기록하지 않는다
    ptr(handle(), 'pointerup', 195, 208);
    expect(onChange).toHaveBeenCalledTimes(1);
    const m = onChange.mock.calls[0][0];
    // 20px × 0.5 = 10px — 이 축척(±3m 안팎)에서 대략 20~35cm
    expect(m.x).toBeGreaterThan(0.1);
    expect(m.x).toBeLessThan(0.45);
    expect(m.y).toBeCloseTo(-1, 1);
  });

  it('움직이지 않고 떼면(손잡이를 그냥 누르면) 위치는 그대로다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} miss={stopAt(0, -1)} onChange={onChange} />);
    ptr(handle(), 'pointerdown', 175, 208);
    ptr(handle(), 'pointerup', 175, 208);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('손잡이를 끌다 취소되면 위치는 그대로다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} miss={stopAt(0, -1)} onChange={onChange} />);
    ptr(handle(), 'pointerdown', 175, 208);
    ptr(handle(), 'pointermove', 215, 208);
    ptr(handle(), 'pointercancel', 215, 208);
    ptr(handle(), 'pointerup', 215, 208);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('키보드 방향키는 예전처럼 10cm 씩 옮긴다', () => {
    const onChange = vi.fn();
    render(<PuttBoard distance={4} miss={stopAt(0, -1)} onChange={onChange} />);
    fireEvent.keyDown(board(), { key: 'ArrowRight' });
    expect(onChange.mock.calls[0][0].x).toBeCloseTo(0.1, 5);
  });
});

describe('누르는 범위 · 안내', () => {
  it('홀 버튼 · 축척 탭은 44px 이상이다', () => {
    render(<PuttBoard distance={4} onChange={() => {}} onHoleIn={() => {}} />);
    const hole = document.querySelector('[data-role="putt-board-hole"]');
    expect([hole.style.width, hole.style.height]).toEqual(['44px', '44px']);
    const tab = document.querySelector('[data-role="putt-scale-3"]');
    expect(tab.style.minHeight).toBe('44px');
  });

  it('안내 문구는 흰 점을 끌어 미세 조정한다고 말한다', () => {
    const { container } = render(<PuttBoard distance={4} onChange={() => {}} />);
    expect(container.textContent).toContain('흰 점 끌기 = 미세 이동');
  });
});
