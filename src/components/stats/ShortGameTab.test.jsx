// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ShortGameTab from './ShortGameTab.jsx';
import { buildShortGameStats } from '../../engine/statsReport.js';
import { defaultScore } from '../../test/fixtures.js';
import { setUnit } from '../../engine/units.js';

afterEach(() => { cleanup(); setUnit('m'); });

const ME = '테스터';
// 파4 세컨샷을 from(m) 에서 쳐서 그린에 올린 홀 — 랜딩 hour 시, 핀까지 dist(m)
const chipHole = (from, hour, dist, club = ['wedge', '52']) => ({
  par: 4,
  scores: {
    [ME]: {
      ...defaultScore(4), touched: true, confirmed: true, teeClub: 'driver', gir: true, girAuto: false, onGreen: true, putts: 2,
      secondClub: club[0], secondClubSub: club[1], remainingDistance: from,
      puttDetails: [{ distance: dist, holein: 'fail' }, { distance: 0.5, holein: 'success' }], onGreenLanding: hour,
    },
  },
});
const reportOf = (holes) => ({ shortGame: buildShortGameStats([{ id: 'r', date: '2026-06-01T00:00:00.000Z', players: [ME], holes }]) });

// 20m 안 52° 4샷은 숏 쪽, 50-80m 9I 3샷은 라이트 쪽, 20-50m 56° 2샷
const HOLES = [
  chipHole(10, 6, 2), chipHole(12, 6, 1.5), chipHole(15, 6, 3), chipHole(18, 12, 1),
  chipHole(30, 3, 2, ['wedge', '56']), chipHole(40, 6, 1, ['wedge', '56']),
  chipHole(60, 3, 3, ['iron', '9I']), chipHole(65, 3, 2, ['iron', '9I']), chipHole(70, 1, 4, ['iron', '9I']),
];

describe('스탯 숏게임 탭 — 핀 기준 탄착', () => {
  it('과녁에 샷마다 점을 찍고, 평균 위치와 방향별 비율을 보여 준다', () => {
    const { container } = render(<ShortGameTab report={reportOf(HOLES)} />);
    const target = container.querySelector('[data-role="short-target"]');
    expect(target).toBeTruthy();
    expect(target.querySelectorAll('[data-role="short-dot"]')).toHaveLength(9);
    expect(target.querySelector('[data-role="short-mean"]')).toBeTruthy();
    expect(target.querySelector('[data-role="short-spread"]')).toBeTruthy();
    const label = (q) => target.querySelector(`[data-role="short-label"][data-quadrant="${q}"]`).textContent;
    expect([label('long'), label('right'), label('short'), label('left')]).toEqual(['LONG22%', 'RIGHT33%', 'SHORT44%', 'LEFT0%']);
    expect(target.getAttribute('aria-label')).toMatch(/9샷.*롱 22%.*라이트 33%.*숏 44%.*레프트 0%/);
  });

  it('쏠림(평균 위치)과 흩어짐을 앞뒤·좌우로 나눠 말한다 — 좋고 나쁨은 판정하지 않는다', () => {
    const { container } = render(<ShortGameTab report={reportOf(HOLES)} />);
    const along = container.querySelector('[data-role="axis-along"]').textContent;
    const across = container.querySelector('[data-role="axis-across"]').textContent;
    expect(along).toMatch(/앞뒤.*숏 \d\.\dm.*흩어짐 ±\d\.\dm/);
    expect(across).toMatch(/좌우.*라이트 \d\.\dm.*흩어짐 ±\d\.\dm/);
    const take = container.querySelector('[data-role="pattern-take"]').textContent;
    expect(take).toMatch(/핀 기준 평균 위치는 숏 \d\.\dm · 라이트 \d\.\dm/);
    expect(take).toMatch(/가장 많이 멈춘 쪽은 숏\(4\/9샷\)/);
    expect(take).not.toMatch(/연습|해야|좋아요|나빠요|부족/);
    expect(container.querySelector('[data-role="pattern-basis"]').textContent).toMatch(/그린에 올린 80m 안 샷 9개\(칩인 제외\) 중.*9샷 기준/);
  });

  it('거리대별 · 클럽별 줄은 3샷 이상일 때만 나온다', () => {
    const { container } = render(<ShortGameTab report={reportOf(HOLES)} />);
    expect([...container.querySelectorAll('[data-role^="short-band-"]')].map((e) => e.getAttribute('data-role'))).toEqual(['short-band-lt20', 'short-band-50to80']);
    expect(container.querySelector('[data-role="short-band-lt20"]').textContent).toMatch(/20m 안.*4샷.*첫 퍼트 1\.8m.*평균 위치 숏/);
    expect(container.querySelector('[data-role="short-band-50to80"]').textContent).toMatch(/50–80m.*3샷.*라이트/);
    expect([...container.querySelectorAll('[data-role^="short-club-"]')].map((e) => e.getAttribute('data-role'))).toEqual(['short-club-wedge:52', 'short-club-iron:9I']);
  });

  it('샷이 모자라면 과녁 대신, 지금 몇 샷이고 어느 기록이 빠졌는지 알려 준다', () => {
    const holes = [chipHole(20, 6, 2), chipHole(20, 6, 2), { ...chipHole(20, 6, 2), scores: { [ME]: { ...chipHole(20, 6, 2).scores[ME], onGreenLanding: null } } }];
    const { container } = render(<ShortGameTab report={reportOf(holes)} />);
    expect(container.querySelector('[data-role="short-target"]')).toBeNull();
    expect(container.querySelector('[data-role="short-by-club"]')).toBeNull();
    const hint = container.querySelector('[data-role="pattern-hint"]').textContent;
    expect(hint).toMatch(/지금 2샷이 쌓였고 5샷부터 보여요/);
    expect(hint).toMatch(/80m 안 샷 3개 중 랜딩 방향을 기록한 건 2개/);
  });

  it('80m 안 샷이 하나도 없으면 무엇을 기록하면 되는지 알려 준다 (빈 화면을 두지 않는다)', () => {
    const { container } = render(<ShortGameTab report={reportOf([chipHole(120, 6, 2)])} />);
    expect(container.querySelector('[data-role="pattern-hint"]').textContent).toMatch(/아직 없어요.*퍼팅 탭에서 온그린 랜딩 방향과 첫 퍼트 거리/);
    expect(container.querySelector('[data-role="short-game"]') ?? container.querySelector('[data-role="card-short-game"]')).toBeTruthy();   // 기존 스크램블링 카드도 이 탭에 있다
  });

  it('야드 모드에서는 눈금과 위치가 피트로, 거리대가 야드로 보인다', () => {
    setUnit('yd');
    const { container } = render(<ShortGameTab report={reportOf(HOLES)} />);
    const rings = [...container.querySelectorAll('[data-role="short-ring"] text')].map((t) => t.textContent);
    expect(rings.length).toBeGreaterThan(1);
    expect(rings.every((t) => /ft$/.test(t))).toBe(true);
    expect(container.querySelector('[data-role="axis-along"]').textContent).toMatch(/숏 \d+(\.\d)?ft/);
    expect(container.querySelector('[data-role="short-band-lt20"]').textContent).toMatch(/22yd 안/);
    expect(container.textContent).not.toMatch(/\d\.\dm\b/);
  });
});
