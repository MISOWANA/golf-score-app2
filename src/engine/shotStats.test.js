import { describe, it, expect } from 'vitest';
import { buildPuttingStats } from './shotStats.js';

const round = (lie) => ({
  id: 'x', players: ['나'],
  holes: [{ holeNumber: 1, par: 4, scores: { 나: { putts: 2, touched: true, puttDetails: [
    { distance: 3, lie, holein: 'fail' }, { distance: 0.5, lie, holein: 'success' },
  ] } } }],
});
const totals = (stats) => ({
  slope: Object.fromEntries(stats.bySlope.map((x) => [x.id, x.total])),
  brk: Object.fromEntries(stats.byBreak.map((x) => [x.id, x.total])),
});

describe('퍼팅 통계: 라이', () => {
  it.each([[[]], [''], [null], [undefined]])('라이를 고르지 않은 퍼트(%j)는 경사·브레이크 통계에 넣지 않는다', (lie) => {
    const t = totals(buildPuttingStats([round(lie)]));
    expect(Object.values(t.slope).reduce((a, b) => a + b, 0)).toBe(0);
    expect(Object.values(t.brk).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('평지를 고른 퍼트는 평지·직선으로 센다', () => {
    const t = totals(buildPuttingStats([round('flat')]));
    expect(t.slope).toMatchObject({ flat: 2, uphill: 0, downhill: 0 });
    expect(t.brk).toMatchObject({ straight: 2, slice: 0, hook: 0 });
  });

  it('복합 라이(오르막 + 슬라이스)는 두 통계에 각각 센다', () => {
    const t = totals(buildPuttingStats([round('uphill-break-left')]));
    expect(t.slope.uphill).toBe(2);
    expect(t.brk.slice).toBe(2);
  });

  it.each(['s-lr', 's-rl', 'uphill-s-lr', 'downhill-s-rl'])('S자(복합) 라이 %s 는 훅·슬라이스·직선에 섞지 않고 S자 줄로 센다', (lie) => {
    const stats = buildPuttingStats([round(lie)]);
    const t = totals(stats);
    expect(t.brk).toMatchObject({ scurve: 2, straight: 0, slice: 0, hook: 0 });
    expect(t.slope[lie.startsWith('uphill') ? 'uphill' : lie.startsWith('downhill') ? 'downhill' : 'flat']).toBe(2);   // 경사 통계에는 그대로 센다
    expect(stats.byBreak.find((x) => x.id === 'scurve').label).toBe('S자');
  });

  it('S자 라이를 쓴 적이 없으면 예전과 같은 세 줄만 나온다', () => {
    expect(buildPuttingStats([round('flat')]).byBreak.map((x) => x.id)).toEqual(['slice', 'straight', 'hook']);
  });

  it('예전 기록의 배열 값(첫 원소)도 같게 읽는다', () => {
    const t = totals(buildPuttingStats([round(['downhill-break-right'])]));
    expect(t.slope.downhill).toBe(2);
    expect(t.brk.hook).toBe(2);
  });

  it('거리 구간 통계는 라이와 무관하게 센다', () => {
    const s = buildPuttingStats([round([])]);
    expect(s.byDistance.reduce((a, b) => a + b.total, 0)).toBe(2);
  });
});
