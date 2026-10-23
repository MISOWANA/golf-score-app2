import { describe, it, expect } from 'vitest';
import {
  SURFACES, surfaceLabel, surfaceIdOf, baselineLieOf, lieValueOf, shotInfoOf, surfaceOfShot, shotInfoGaps, fairwayFromSurface, SHOT_INFO_ITEMS,
} from './shotInfo.js';
import { buildHoleSG } from './strokesGained.js';
import { toBreakdownInput, buildHoleBreakdown } from './scoreBreakdown.js';
import { buildHoleReview } from './holeReview.js';
import { defaultScore, played } from '../test/fixtures.js';

const ME = '테스터';

// 파4 상세 입력 홀 — 티샷 드라이버, 세컨샷 150m, 퍼트 2개 (4타). over 로 필드를 덮어쓴다.
const par4 = (over = {}) => ({
  ...played(4, { strokes: 4, putts: 2, gir: true, girAuto: false, onGreen: true }),
  teeClub: 'driver', secondClub: 'iron', remainingDistance: 150, terrainCondition: 'flat', secondSurface: 'fairway',
  puttDetails: [{ distance: 5, holein: 'fail' }, { distance: 0.8, holein: 'success' }],
  ...over,
});

describe('지형 · 값', () => {
  it('페어웨이 · 러프 · 벙커 세 가지', () => {
    expect(SURFACES.map((s) => s.label)).toEqual(['페어웨이', '러프', '벙커']);
    expect(surfaceLabel('bunker')).toBe('벙커');
    expect(surfaceLabel('nope')).toBeNull();
  });

  it('예전에 있던 리커버리로 저장된 기록은 러프로 읽는다', () => {
    expect([surfaceIdOf('recovery'), surfaceIdOf('bunker'), surfaceIdOf(null), surfaceIdOf(undefined)]).toEqual(['rough', 'bunker', null, null]);
    expect(surfaceLabel('recovery')).toBe('러프');
    expect(shotInfoOf({ ...par4(), secondSurface: 'recovery' }, 1).surface).toBe('rough');
    expect(shotInfoOf(par4({ extraShots: [{ club: 'wedge', remainingDistance: 30, surface: 'recovery' }] }), 2).surface).toBe('rough');
    expect(shotInfoGaps(par4({ secondSurface: 'recovery' }), 4)).toEqual([]);     // 비어 있는 것으로 치지 않는다
  });

  it('Strokes Gained 기준선의 표면 이름으로 바꾼다 (벙커 → sand)', () => {
    expect([baselineLieOf('fairway'), baselineLieOf('rough'), baselineLieOf('bunker'), baselineLieOf('recovery'), baselineLieOf(null)])
      .toEqual(['fairway', 'rough', 'sand', 'rough', null]);   // 예전 리커버리 기록은 러프 기준선
  });

  it('필수 항목 순서는 라이 · 지형 · 거리 · 클럽', () => {
    expect(SHOT_INFO_ITEMS).toEqual(['라이', '지형', '거리', '클럽']);
  });

  it('라이는 문자열이나 배열(예전 기록)이나 비어 있다', () => {
    expect([lieValueOf('flat'), lieValueOf(['uphill']), lieValueOf([]), lieValueOf(null)]).toEqual(['flat', 'uphill', null, null]);
  });
});

describe('shotInfoOf · surfaceOfShot', () => {
  const s = par4({ extraShots: [{ club: 'wedge', remainingDistance: 30, lie: ['downhill'], surface: 'bunker', onGreen: true }] });

  it('세컨샷(1)과 추가 샷(2~)의 정보를 같은 모양으로 준다', () => {
    expect(shotInfoOf(s, 1)).toEqual({ club: 'iron', distance: 150, lie: 'flat', surface: 'fairway' });
    expect(shotInfoOf(s, 2)).toEqual({ club: 'wedge', distance: 30, lie: 'downhill', surface: 'bunker' });
    expect(shotInfoOf(s, 3)).toBeNull();
    expect(shotInfoOf(s, 0)).toBeNull();
  });

  it('샷을 치는 자리의 지형', () => {
    expect(surfaceOfShot(s, 1)).toBe('fairway');
    expect(surfaceOfShot(s, 2)).toBe('bunker');
    expect(surfaceOfShot(s, 5)).toBeNull();
  });
});

describe('shotInfoGaps — 빠진 샷 정보', () => {
  it('간편 입력(티샷 클럽 없음)은 묻지 않는다', () => {
    expect(shotInfoGaps(defaultScore(4), 4)).toEqual([]);
    expect(shotInfoGaps(null, 4)).toEqual([]);
  });

  it('티샷 클럽만 고른 파4: 세컨샷의 라이 · 지형 · 거리 · 클럽이 모두 빠졌다', () => {
    const s = { ...defaultScore(4), touched: true, teeClub: 'driver' };
    expect(shotInfoGaps(s, 4)).toEqual([{ slot: 1, missing: ['라이', '지형', '거리', '클럽'] }]);
  });

  it('하나씩 채우면 줄어든다', () => {
    const s = { ...defaultScore(4), touched: true, teeClub: 'driver', secondClub: 'iron', remainingDistance: 140 };
    expect(shotInfoGaps(s, 4)).toEqual([{ slot: 1, missing: ['라이', '지형'] }]);
    expect(shotInfoGaps({ ...s, terrainCondition: 'flat', secondSurface: 'rough' }, 4)).toEqual([]);
  });

  it('평지(flat)도 입력한 값이다 — 비어 있는 것과 다르다', () => {
    expect(shotInfoGaps(par4({ terrainCondition: 'flat' }), 4)).toEqual([]);
    expect(shotInfoGaps(par4({ terrainCondition: null }), 4)).toEqual([{ slot: 1, missing: ['라이'] }]);
  });

  it('티샷으로 1온(파4·5)하면 필드샷이 없다', () => {
    expect(shotInfoGaps({ ...defaultScore(4), touched: true, teeClub: 'driver', teeGIR: true }, 4)).toEqual([]);
  });

  it('추가 샷(써드샷~)도 같은 네 가지를 받는다', () => {
    const s = par4({ strokes: 5, gir: false, onGreen: false, extraShots: [{ club: null, remainingDistance: null, lie: [], onGreen: null }] });
    expect(shotInfoGaps(s, 4)).toEqual([{ slot: 2, missing: ['라이', '지형', '거리', '클럽'] }]);
    const filled = par4({ strokes: 5, onGreen: false, extraShots: [{ club: 'wedge', remainingDistance: 30, lie: ['flat'], surface: 'rough', onGreen: true }] });
    expect(shotInfoGaps(filled, 4)).toEqual([]);
  });

  it('파3: 티샷 거리가 필요하고, 그린을 놓쳤으면 칩도 받는다', () => {
    const s = { ...defaultScore(3), touched: true, teeClub: 'iron', teeOnGreen: true, gir: true };
    expect(shotInfoGaps(s, 3)).toEqual([{ slot: 0, missing: ['거리'] }]);
    expect(shotInfoGaps({ ...s, teeDistance: 150 }, 3)).toEqual([]);
    const missed = { ...s, teeDistance: 150, teeOnGreen: false, gir: false };
    expect(shotInfoGaps(missed, 3)).toEqual([{ slot: 1, missing: ['라이', '지형', '거리', '클럽'] }]);
  });

  it('같은 자리에서 다시 친 샷은 클럽만 받는다 (지형 · 라이 · 거리는 앞 샷과 같다)', () => {
    const s = {
      ...defaultScore(4), touched: true, teeClub: 'driver', penalties: [{ slot: 0, type: 'ob', mode: 'replay' }], ob: 1,
      secondClub: null,
    };
    expect(shotInfoGaps(s, 4)).toEqual([{ slot: 1, missing: ['클럽'] }]);
  });

  it('홀인원은 필드샷 정보를 묻지 않는다', () => {
    expect(shotInfoGaps({ ...defaultScore(3), touched: true, teeClub: 'iron', teeDistance: 150, strokes: 1, putts: 0 }, 3)).toEqual([]);
  });
});

describe('fairwayFromSurface — 세컨샷 지형으로 페어웨이 적중 알기', () => {
  it('페어웨이에서 쳤으면 적중, 러프 · 벙커면 놓침 (예전 리커버리 기록은 러프)', () => {
    const s = (surface) => ({ ...defaultScore(4), secondSurface: surface });
    expect(fairwayFromSurface(s('fairway'), 4)).toBe(true);
    expect(fairwayFromSurface(s('rough'), 4)).toBe(false);
    expect(fairwayFromSurface(s('bunker'), 4)).toBe(false);
    expect(fairwayFromSurface(s('recovery'), 4)).toBe(false);
  });

  it('지형이 없거나 파3 · 1온 · 티샷 벌타면 알 수 없다', () => {
    expect(fairwayFromSurface({ ...defaultScore(4) }, 4)).toBeNull();
    expect(fairwayFromSurface({ ...defaultScore(3), secondSurface: 'rough' }, 3)).toBeNull();
    expect(fairwayFromSurface({ ...defaultScore(4), secondSurface: 'rough', teeGIR: true }, 4)).toBeNull();
    expect(fairwayFromSurface({ ...defaultScore(4), secondSurface: 'rough', penalties: [{ slot: 0, type: 'ob', mode: 'forward' }] }, 4)).toBeNull();
  });
});

describe('Strokes Gained 가 입력한 지형을 쓴다', () => {
  const sgOf = (over) => {
    const hole = { holeNumber: 1, par: 4, scores: { [ME]: par4(over) } };
    const res = buildHoleSG(hole, ME);
    return res.segments.find((seg) => seg.category === 'approach');
  };

  it('같은 샷이라도 러프 · 벙커에서 쳐서 같은 결과를 냈으면 SG 가 더 좋다 (기준선이 더 높다)', () => {
    const fairway = sgOf({ secondSurface: 'fairway' }).sg;
    const rough = sgOf({ secondSurface: 'rough' }).sg;
    const bunker = sgOf({ secondSurface: 'bunker' }).sg;
    expect(rough).toBeGreaterThan(fairway);
    expect(bunker).toBeGreaterThan(fairway);
  });

  it('지형을 입력하지 않으면 예전처럼 추정한다 (세컨샷: 페어웨이 O → 페어웨이)', () => {
    const noSurface = sgOf({ secondSurface: null, fairway: true }).sg;
    expect(noSurface).toBeCloseTo(sgOf({ secondSurface: 'fairway' }).sg, 6);
    const missed = sgOf({ secondSurface: null, fairway: false }).sg;
    expect(missed).toBeCloseTo(sgOf({ secondSurface: 'rough' }).sg, 6);
  });

  it('입력한 지형이 추정보다 우선한다', () => {
    const recorded = sgOf({ secondSurface: 'bunker', fairway: true }).sg;
    expect(recorded).toBeCloseTo(sgOf({ secondSurface: 'bunker', fairway: false }).sg, 6);
  });
});

describe('스코어 분해 — 랜딩을 비워도 페어웨이를 놓쳤으면 티샷 손실', () => {
  const tee = (over) => buildHoleBreakdown(toBreakdownInput({ holeNumber: 1, par: 4, scores: { [ME]: par4({ strokes: 5, gir: false, ...over }) } }, ME));

  it('랜딩 L/C/R 없이 페어웨이 X 면 티샷 쪽', () => {
    expect(tee({ fairway: false, fairwayHit: null }).categories.tee).toBe(1);
  });

  it('랜딩도 페어웨이 기록도 없으면 예전처럼 어프로치 쪽', () => {
    const b = tee({ fairway: undefined, fairwayHit: null });
    expect(b.categories.tee).toBe(0);
    expect(b.categories.approach).toBe(1);
  });

  it('랜딩 L/R 을 입력했으면 그 값이 우선', () => {
    expect(tee({ fairway: true, fairwayHit: 'R' }).categories.tee).toBe(1);
  });
});

describe('홀 복기에 지형이 보인다', () => {
  it('샷을 치는 자리를 "러프 · 오르막" 처럼 보여 준다', () => {
    const hole = { holeNumber: 1, par: 4, scores: { [ME]: par4({ secondSurface: 'rough', terrainCondition: 'uphill' }) } };
    const review = buildHoleReview(hole, ME, 0);
    expect(review.shots[1].lie).toBe('러프 · 오르막');
    expect(review.shots[0].lie).toBeNull();
  });

  it('지형만 있거나 라이만 있어도 보인다', () => {
    const only = buildHoleReview({ holeNumber: 1, par: 4, scores: { [ME]: par4({ secondSurface: 'bunker', terrainCondition: null }) } }, ME, 0);
    expect(only.shots[1].lie).toBe('벙커');
  });
});
