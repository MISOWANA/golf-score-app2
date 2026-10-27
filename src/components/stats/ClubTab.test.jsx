// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ClubTab from './ClubTab.jsx';
import { clubConsistency } from '../../engine/statsReport.js';

afterEach(cleanup);

const row = (key, label, median, q1, q3, n = 8) => ({ key, club: key, subClub: null, label, n, median, q1, q3, tier: 'high', uses: n, hitN: n, hitPct: 50 });
const reportOf = (rows) => ({ clubs: { rows, consistency: clubConsistency(rows), rounds: 10 } });
const ROWS = [row('driver', 'DRIVER', 220, 205, 235), row('iron7', 'IRON 7I', 130, 126, 134), row('iron9', 'IRON 9I', 110, 100, 120)];

describe('클럽 탭 — 클럽 간격 대신 거리 일관성', () => {
  it('"클럽이 비었다·줄여도 된다" 같은 판정 카드는 없고, 거리 일관성 카드가 있다', () => {
    const { container } = render(<ClubTab report={reportOf(ROWS)} />);
    expect(container.querySelector('[data-role="card-club-gap"]')).toBeNull();
    expect(container.querySelector('[data-role="gap-take"]')).toBeNull();
    expect(container.textContent).not.toMatch(/GAPPING|칠 클럽이 없어요|클럽을 줄여도|고르게 벌어져/);
    const card = container.querySelector('[data-role="card-club-consistency"]');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('CONSISTENCY');
  });

  it('가장 일정한 클럽과 가장 들쭉날쭉한 클럽을 알려 주고, 모든 클럽의 폭을 줄 세운다', () => {
    const { container } = render(<ClubTab report={reportOf(ROWS)} />);
    const take = container.querySelector('[data-role="consistency-take"]').textContent;
    expect(take).toMatch(/가장 일정한 클럽은 IRON 7I\(폭 8m\)/);
    expect(take).toMatch(/가장 들쭉날쭉한 클럽은 IRON 9I\(폭 20m\)/);
    const order = [...container.querySelectorAll('[data-role^="consistency-"]')].map((e) => e.getAttribute('data-role')).filter((r) => r !== 'consistency-take');
    expect(order).toEqual(['consistency-iron7', 'consistency-driver', 'consistency-iron9']);
  });

  it('비교할 클럽이 모자라면 언제 보이는지 안내한다 (빈 카드를 두지 않는다)', () => {
    const { container } = render(<ClubTab report={reportOf(ROWS.slice(0, 2))} />);
    expect(container.querySelector('[data-role="consistency-take"]')).toBeNull();
    expect(container.querySelector('[data-role="consistency-empty"]').textContent).toMatch(/5번 이상.*3개 이상/);
  });
});
