// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import ParTable, { PAR_MIN, PAR_MAX } from './ParTable.jsx';

afterEach(cleanup);

const PARS = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
const GROUPS = [{ label: 'OUT', start: 0, end: 9 }, { label: 'IN', start: 9, end: 18 }];
const cells = () => [...document.querySelectorAll('[data-role="par-cell"]')];

describe('ParTable — 홀을 눌러 파를 고른다', () => {
  it('칸마다 버튼 하나이고 높이는 44px 이상이다 (옆 홀과 닿지 않는 반쪽 탭이 아니다)', () => {
    render(<ParTable pars={PARS} groups={GROUPS} onSetPar={() => {}} />);
    expect(cells()).toHaveLength(18);
    cells().forEach((c) => expect(parseInt(c.style.minHeight, 10)).toBeGreaterThanOrEqual(44));
    expect(screen.getByLabelText('3번 홀 파 3')).toBeTruthy();
    expect(screen.queryByLabelText('파 증가')).toBeNull();
    expect(screen.getByText('홀을 눌러 파를 바꿔요')).toBeTruthy();
  });

  it('칸을 누르면 그 홀이 골라지고 파 3~7 버튼이 나온다. 버튼은 모두 44px 이상', () => {
    render(<ParTable pars={PARS} groups={GROUPS} onSetPar={() => {}} />);
    expect(screen.queryByRole('group', { name: /파 고르기/ })).toBeNull();
    fireEvent.click(screen.getByLabelText('3번 홀 파 3'));
    const picker = screen.getByRole('group', { name: '3번 홀 파 고르기' });
    const opts = within(picker).getAllByRole('button');
    expect(opts.map((b) => b.getAttribute('data-par'))).toEqual(['3', '4', '5', '6', '7'].slice(0, PAR_MAX - PAR_MIN + 1));
    opts.forEach((b) => expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(44));
    expect(screen.getByLabelText('3번 홀 파 3').getAttribute('aria-pressed')).toBe('true');
    expect(within(picker).getByLabelText('파 3').getAttribute('aria-pressed')).toBe('true');   // 지금 값
    expect(within(picker).getByLabelText('파 4').getAttribute('aria-pressed')).toBe('false');
  });

  it('버튼을 누르면 고른 홀 번호와 파로 onSetPar 가 불린다 (다른 홀은 건드리지 않는다)', () => {
    const onSetPar = vi.fn();
    render(<ParTable pars={PARS} groups={GROUPS} onSetPar={onSetPar} />);
    fireEvent.click(screen.getByLabelText('12번 홀 파 3'));
    fireEvent.click(screen.getByLabelText('파 5'));
    expect(onSetPar).toHaveBeenCalledTimes(1);
    expect(onSetPar).toHaveBeenCalledWith(11, 5);   // 12번 홀 = index 11
  });

  it('같은 칸을 다시 누르면 닫히고, 다른 칸을 누르면 그 홀로 옮긴다', () => {
    render(<ParTable pars={PARS} groups={GROUPS} onSetPar={() => {}} />);
    fireEvent.click(screen.getByLabelText('1번 홀 파 4'));
    expect(screen.getByRole('group', { name: '1번 홀 파 고르기' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('2번 홀 파 4'));
    expect(screen.getByRole('group', { name: '2번 홀 파 고르기' })).toBeTruthy();
    fireEvent.click(screen.getByLabelText('2번 홀 파 4'));
    expect(screen.queryByRole('group', { name: /파 고르기/ })).toBeNull();
  });

  it('9홀 라운드는 holeNo 대로 1~9 로 적는다', () => {
    const nine = PARS.slice(9, 18);
    render(<ParTable pars={PARS} groups={[{ label: 'IN', start: 9, end: 18 }]} holeNo={(i) => i - 9 + 1} onSetPar={() => {}} />);
    expect(cells()).toHaveLength(nine.length);
    expect(screen.getByLabelText('1번 홀 파 4')).toBeTruthy();
    expect(screen.getByLabelText('9번 홀 파 4')).toBeTruthy();
    expect(screen.queryByLabelText('10번 홀 파 4')).toBeNull();
  });
});
