// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import InsightCard from './InsightCard.jsx';

afterEach(cleanup);

const insight = (over = {}) => ({
  id: 'x', severity: 'warning', category: 'putting', summary: '3퍼트가 반복돼요', scope: 'hole',
  roundDate: new Date(2026, 8, 10, 12).toISOString(), courseName: '남서울CC', holeNumber: 4, ...over,
});

describe('인사이트 카드 — 어느 라운드의 것인지 칩', () => {
  it('날짜는 연도까지 보인다 (검색 결과 · 복기에서 해가 바뀌어도 구분된다)', () => {
    render(<InsightCard insight={insight()} showContext />);
    expect(document.querySelector('[data-role="insight-context"]').textContent).toBe('2026.9.10 남서울CC');
  });

  it('코스 이름이 길어도 카드 밖으로 나가지 않게 줄여 보인다', () => {
    render(<InsightCard insight={insight({ courseName: '아주아주긴이름의컨트리클럽 서코스' })} showContext />);
    const chip = document.querySelector('[data-role="insight-context"]');
    expect([chip.style.maxWidth, chip.style.overflow, chip.style.textOverflow]).toEqual(['100%', 'hidden', 'ellipsis']);
  });

  it('showContext 가 아니면 칩이 없다', () => {
    render(<InsightCard insight={insight()} />);
    expect(document.querySelector('[data-role="insight-context"]')).toBeNull();
  });
});
