// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { PuttDistancePanel, PuttMissPanel, PuttPacePanel, PuttLinePanel, PuttLiePanel, PuttLagPanel, PuttForPanel } from './PuttingDetailPanels.jsx';
import PuttMissTarget from './PuttMissTarget.jsx';
import { buildPuttingDetail } from '../../engine/puttingDetail.js';
import { sampleRounds, roundOf, holeOf, made, missed } from '../../test/putts.js';

afterEach(cleanup);

const d = buildPuttingDetail(sampleRounds());
const empty = buildPuttingDetail([]);
const q = (role) => document.querySelector(`[data-role="${role}"]`);

describe('미스 위치 과녁', () => {
  it('점을 하이/로우사이드로 색칠하고, 평균 위치 · 흩어짐 · 방향 이름을 그린다', () => {
    render(<PuttMissTarget pattern={d.missMap.all} />);
    const dots = [...document.querySelectorAll('[data-role="putt-dot"]')];
    expect(d.missMap.all.n).toBe(21);                         // 샘플의 빗나간 퍼트
    expect(dots).toHaveLength(21);
    const sides = dots.map((x) => x.getAttribute('data-side'));
    expect(sides.filter((s) => s === 'low').length).toBeGreaterThan(0);
    expect(sides.filter((s) => s === 'high').length).toBeGreaterThan(0);
    expect(sides).toContain('none');
    expect(q('putt-mean')).toBeTruthy();
    expect(q('putt-spread')).toBeTruthy();
    expect([...document.querySelectorAll('[data-role="putt-label"]')].map((e) => e.textContent)).toEqual(['LONG', 'RIGHT', 'SHORT', 'LEFT']);
  });

  it('기록이 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<PuttMissTarget pattern={empty.missMap.all} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('미스 위치 패널', () => {
  it('거리 범위를 고르면(전체 · 가까운 · 먼) 그 과녁으로 바뀐다', () => {
    render(<PuttMissPanel map={d.missMap} />);
    expect(document.querySelectorAll('[data-role="putt-dot"]')).toHaveLength(21);
    expect(q('miss-scope-all').getAttribute('aria-pressed')).toBe('true');
    expect(q('miss-scope-near').textContent).toContain('~3m');
    fireEvent.click(q('miss-scope-far'));
    expect(q('miss-scope-far').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('[data-role="putt-dot"]')).toHaveLength(d.missMap.far.n);
  });

  it('범위 버튼은 누르기 편한 44px 이상이다', () => {
    render(<PuttMissPanel map={d.missMap} />);
    ['all', 'near', 'far'].forEach((k) => expect(q(`miss-scope-${k}`).style.minHeight).toBe('44px'));
  });

  it('고른 범위의 미스가 5개 미만이면 과녁 대신 몇 개 더 기록하면 되는지 알려 준다', () => {
    render(<PuttMissPanel map={d.missMap} />);
    fireEvent.click(q('miss-scope-near'));                       // 3m 안 퍼트의 미스는 3개 — 샘플 기준
    expect(d.missMap.near.n).toBeLessThan(5);
    expect(q('miss-hint').textContent).toMatch(/5개 이상 기록하면 과녁을 그려요 \(지금 \d+개 — \d+개 더 기록하면\)/);
    expect(document.querySelector('[data-role="putt-dot"]')).toBeNull();
  });

  it('범례와 축 타일 · 해석 한 줄이 함께 나온다', () => {
    render(<PuttMissPanel map={d.missMap} />);
    expect(q('miss-legend').textContent).toContain('로우사이드');
    expect(q('putt-axis-along')).toBeTruthy();
    expect(q('putt-axis-across')).toBeTruthy();
    expect(q('putt-miss-take').textContent).toContain('평균 멈춘 곳은');
  });

  it('미스 기록이 하나도 없으면 무엇을 하면 되는지 안내한다', () => {
    render(<PuttMissPanel map={empty.missMap} />);
    expect(q('miss-empty').textContent).toContain('미스 위치');
  });
});

describe('거리감 패널', () => {
  it('숏 · 핀하이 · 롱 막대와 경사별 · 거리별 줄이 나온다', () => {
    render(<PuttPacePanel pace={d.pace} />);
    expect(q('pace-bar')).toBeTruthy();
    expect(['pace-slope-uphill', 'pace-slope-downhill', 'pace-slope-flat'].filter((r) => q(r))).toEqual(['pace-slope-uphill', 'pace-slope-downhill', 'pace-slope-flat']);
    expect(q('pace-slope-uphill').textContent).toMatch(/숏 100% · 핀하이 0% · 롱 0% · 5개/);
    expect(q('pace-slope-downhill').textContent).toMatch(/롱 100%/);
    expect(q('pace-take').textContent).toContain('내리막에서는 롱이');
  });

  it('못 미친 · 지나친 거리의 중앙값은 3개 이상일 때만 숫자로 보인다', () => {
    const few = buildPuttingDetail([roundOf([holeOf([missed(4, 'flat', 0, -0.5), made(0.3)]), holeOf([missed(4, 'flat', 0, 0.5), made(0.3)], { number: 2 })])]);
    render(<PuttPacePanel pace={few.pace} />);
    expect(q('m-short-median').textContent).toContain('–');
    expect(q('m-long-median').textContent).toContain('–');
  });

  it('기록이 없으면 안내만', () => {
    render(<PuttPacePanel pace={empty.pace} />);
    expect(q('pace-empty')).toBeTruthy();
    expect(q('pace-bar')).toBeNull();
  });
});

describe('라인 패널', () => {
  it('휘는 라이는 하이/로우사이드 막대와 휨별 줄, 직선 라이는 좌우 막대', () => {
    render(<PuttLinePanel line={d.line} />);
    expect(q('side-bar')).toBeTruthy();
    expect(q('side-shape-hook').textContent).toMatch(/로우사이드 \d+% · 하이사이드 \d+%/);
    expect(q('straight-bar')).toBeTruthy();
    expect(q('line-take').textContent).toContain('로우사이드');
  });

  it('표본이 모자라면 몇 개 쌓였는지와 함께 안내한다', () => {
    render(<PuttLinePanel line={empty.line} />);
    expect(q('line-empty').textContent).toContain('지금 휘는 라이 0개 · 직선 라이 0개');
  });
});

describe('라이별 패널', () => {
  it('입력 칸과 같은 3×3 배치로 아홉 칸이 모두 나오고, 기록 없는 칸은 흐리다', () => {
    render(<PuttLiePanel byLie={d.byLie} />);
    const cells = [...document.querySelectorAll('[data-role="lie-grid"] > [data-role^="lie-cell-"]')];
    expect(cells.map((c) => c.getAttribute('data-role').replace('lie-cell-', ''))).toEqual([
      'uphill-break-left', 'uphill', 'uphill-break-right', 'break-left', 'flat', 'break-right', 'downhill-break-left', 'downhill', 'downhill-break-right',
    ]);
    expect(q('lie-cell-uphill-break-left').getAttribute('data-total')).toBe('0');
    expect(q('lie-cell-uphill-break-left').style.opacity).toBe('0.55');
    expect(q('lie-cell-uphill').textContent).toContain('오르막');
    expect(q('lie-cell-uphill').getAttribute('data-total')).toBe('6');
  });

  it('성공률 숫자와 성공/시도가 한 칸 안에 보인다', () => {
    render(<PuttLiePanel byLie={d.byLie} />);
    const flat = q('lie-cell-flat');
    expect(flat.textContent).toMatch(/평지.*\d+%.*\d+\/\d+/);
  });

  it('경사별 · 휨별 합계 줄이 있고, S자 기록이 없으면 복합 칸도 없다', () => {
    render(<PuttLiePanel byLie={d.byLie} />);
    expect(q('lie-slope-uphill')).toBeTruthy();
    expect(q('lie-break-hook')).toBeTruthy();
    expect(q('lie-compound')).toBeNull();
    expect(q('lie-break-scurve')).toBeNull();
  });

  it('S자(복합)를 쓴 퍼트가 있으면 복합 칸이 나온다', () => {
    const r = buildPuttingDetail([roundOf([holeOf([made(3, 's-lr')]), holeOf([missed(4, 'uphill-s-rl', 0, -0.4), made(0.3)], { number: 2 })])]);
    render(<PuttLiePanel byLie={r.byLie} />);
    expect([...document.querySelectorAll('[data-role="lie-compound"] > div > [data-role^="lie-cell-"]')].map((c) => c.getAttribute('data-role'))).toEqual(['lie-cell-uphill-s-rl', 'lie-cell-s-lr']);
  });

  it('라이를 고른 퍼트가 없으면 안내만', () => {
    render(<PuttLiePanel byLie={empty.byLie} />);
    expect(q('lie-empty')).toBeTruthy();
    expect(q('lie-grid')).toBeNull();
  });
});

describe('첫 퍼트 붙이기 · 어떤 퍼트였나 · 거리별', () => {
  const holes = [
    holeOf([missed(7, 'flat', 0.1, -0.6), made(0.6)], { strokes: 3, number: 1 }),
    holeOf([missed(8, 'flat', 0.3, 1.5), missed(1.5, 'flat', 0, -0.4), made(0.4)], { strokes: 5, number: 2 }),
    holeOf([missed(9, 'flat', 0.5, -2.0), made(2)], { strokes: 4, gir: false, number: 3 }),
    holeOf([made(7)], { strokes: 3, number: 4 }),
    holeOf([missed(2, 'flat', 0, -0.4), made(0.4)], { strokes: 4, number: 5 }),
  ];
  const r = buildPuttingDetail([roundOf(holes)]);

  it('거리대마다 1퍼트 · 1m 안 마무리 · 3퍼트 · 남김 네 숫자', () => {
    render(<PuttLagPanel lag={r.lag} comeback={r.comeback} threePutt={r.threePutt} />);
    const row = q('lag-lag10');
    expect(row.textContent).toContain('6-10m');
    expect(row.textContent).toContain('첫 퍼트 4번');
    ['1퍼트', '1m 안 마무리', '3퍼트', '빗나가면 남김'].forEach((t) => expect(row.textContent).toContain(t));
  });

  it('거리대마다 3개 미만이면 안내만', () => {
    render(<PuttLagPanel lag={empty.lag} comeback={empty.comeback} threePutt={empty.threePutt} />);
    expect(q('lag-empty')).toBeTruthy();
  });

  it('어떤 퍼트였나 — 버디 · 파 · 보기 퍼트 줄', () => {
    render(<PuttForPanel forScore={r.forScore} />);
    expect(q('for-birdie').textContent).toMatch(/버디 퍼트/);
    expect(q('for-take').textContent).toContain('를 넣었어요');
  });

  it('거리별 — 성공률 줄과 빗나가면 남는 거리 · 투어 대비 SG 한 줄', () => {
    render(<PuttDistancePanel rows={r.byDistance} />);
    expect(q('putt-bucket-gte5')).toBeTruthy();
    const note = q('putt-bucket-note-gte5');
    expect(note.textContent).toMatch(/빗나가면 .+ 남음 · 투어 대비 SG [+−]\d\.\d\d/);
  });

  it('거리별 — 기록이 없으면 안내', () => {
    const { container } = render(<PuttDistancePanel rows={empty.byDistance} />);
    expect(container.textContent).toContain('퍼트 거리와 결과를 기록하면');
  });
});
