import { describe, it, expect, afterEach } from 'vitest';
import {
  PUTT_LIES, COMPOUND_LIES, sideBreak, lieIdOf, puttLieText, lieShape, lieSlope, isCompoundLie, classifyStop, sideOf, passInfo, missText, leaveOf, fitScale, scaleForDistance, stopTolerance,
  toGlobal, toLocal, nextFrame, boardToMeters, buildMiss, refreshMiss, withPassOverride, puttRowText, pxPerMeter,
  DEFAULT_FRAME, HOLE_X, HOLE_Y, BOARD_W, BOARD_H, SIDE_BTN, layoutOverlays, sideButtonBox, boxesOverlap,
} from './puttMiss.js';
import { setUnit } from './units.js';
import { buildHoleReview } from './holeReview.js';
import { makeActiveRound } from '../test/fixtures.js';

afterEach(() => setUnit('m'));

describe('라이 — 기본 9개 + 복합 6개', () => {
  const decompose = (id) => ({ slope: lieSlope(id), shape: lieShape(id) });

  it('기본 9개는 오르막 · 평지 · 내리막 × 슬라이스 · 직선 · 훅, 위에서부터 같은 배치', () => {
    expect(PUTT_LIES.map((x) => x.id)).toEqual([
      'uphill-break-left', 'uphill', 'uphill-break-right',
      'break-left', 'flat', 'break-right',
      'downhill-break-left', 'downhill', 'downhill-break-right',
    ]);
  });

  it('복합은 경사 3 × 좌→우 · 우→좌 S 6개, 모두 겹치지 않는다', () => {
    expect(COMPOUND_LIES.map((x) => x.id)).toEqual(['uphill-s-lr', 'uphill-s-rl', 's-lr', 's-rl', 'downhill-s-lr', 'downhill-s-rl']);
    const all = [...PUTT_LIES, ...COMPOUND_LIES].map((x) => x.id);
    expect(new Set(all).size).toBe(15);
  });

  it('기본 9개의 경사와 모양 — 훅 = break-right, 슬라이스 = break-left', () => {
    expect(decompose('flat')).toEqual({ slope: 'flat', shape: 'straight' });
    expect(decompose('uphill')).toEqual({ slope: 'uphill', shape: 'straight' });
    expect(decompose('break-right')).toEqual({ slope: 'flat', shape: 'hook' });
    expect(decompose('break-left')).toEqual({ slope: 'flat', shape: 'slice' });
    expect(decompose('downhill-break-left')).toEqual({ slope: 'downhill', shape: 'slice' });
    expect(decompose(['uphill-break-right'])).toEqual({ slope: 'uphill', shape: 'hook' });   // 예전 기록은 배열
  });

  it('복합 라이의 경사와 모양 — 평지는 경사 글자가 없다', () => {
    expect(decompose('s-lr')).toEqual({ slope: 'flat', shape: 's-lr' });
    expect(decompose('s-rl')).toEqual({ slope: 'flat', shape: 's-rl' });
    expect(decompose('uphill-s-lr')).toEqual({ slope: 'uphill', shape: 's-lr' });
    expect(decompose('downhill-s-rl')).toEqual({ slope: 'downhill', shape: 's-rl' });
    expect(PUTT_LIES.some((x) => isCompoundLie(x.id))).toBe(false);
    expect(COMPOUND_LIES.every((x) => isCompoundLie(x.id))).toBe(true);
  });

  it('고르지 않았으면 모양 · 경사가 null 이고 복합도 아니다', () => {
    for (const v of [null, undefined, '', []]) {
      expect(lieIdOf(v)).toBeNull();
      expect(decompose(v)).toEqual({ slope: null, shape: null });
      expect(isCompoundLie(v)).toBe(false);
    }
  });

  it('라이 이름 — 15개 모두 한 줄 글로 나오고, 모르는 id 는 그대로', () => {
    expect(puttLieText('uphill')).toBe('오르막');
    expect(puttLieText('break-left')).toBe('슬라이스');
    expect(puttLieText('downhill-break-right')).toBe('내리막 훅');
    expect(puttLieText('flat')).toBe('평지');
    expect(puttLieText('s-lr')).toBe('평지 좌→우 S');
    expect(puttLieText('uphill-s-rl')).toBe('오르막 우→좌 S');
    expect(puttLieText(['downhill-s-lr'])).toBe('내리막 좌→우 S');
    expect(puttLieText('mystery')).toBe('mystery');
    expect(puttLieText(null)).toBe('');
    expect(puttLieText([])).toBe('');
    for (const x of [...PUTT_LIES, ...COMPOUND_LIES]) expect(puttLieText(x.id)).toBe(x.label.replace('\n', ' '));
  });
});

describe('멈춘 위치 분류', () => {
  it('허용 거리 안이면 라인 · 핀하이, 밖이면 좌우 · 롱숏', () => {
    expect(classifyStop({ x: 0.05, y: 0.05 }, 0.15)).toEqual({ across: 'line', along: 'pinHigh' });
    expect(classifyStop({ x: -0.5, y: 0.8 }, 0.15)).toEqual({ across: 'left', along: 'long' });
    expect(classifyStop({ x: 0.5, y: -0.8 }, 0.15)).toEqual({ across: 'right', along: 'short' });
  });

  it('허용 거리는 판이 작게 보일수록 커진다 (최소 10cm)', () => {
    expect(stopTolerance(pxPerMeter(3))).toBeCloseTo(7 / 48.33, 2);
    expect(stopTolerance(pxPerMeter(20))).toBeCloseTo(0.97, 1);
    expect(stopTolerance(1000)).toBe(0.1);
  });

  it('S자(복합)는 홀 앞쪽의 휨으로 사이드를 가른다 — 좌→우 S 는 끝이 훅, 우→좌 S 는 끝이 슬라이스', () => {
    expect([sideBreak('s-lr'), sideBreak('s-rl'), sideBreak('hook'), sideBreak('slice')]).toEqual(['hook', 'slice', 'hook', 'slice']);
    expect([sideBreak('straight'), sideBreak(null), sideBreak('x')]).toEqual([null, null, null]);
    // 좌→우 S: 끝이 우→좌로 휘므로 왼쪽이 로우사이드
    expect(sideOf('s-lr', 'left')).toBe('low');
    expect(sideOf('s-lr', 'right')).toBe('high');
    // 우→좌 S: 끝이 좌→우로 휘므로 오른쪽이 로우사이드
    expect(sideOf('s-rl', 'right')).toBe('low');
    expect(sideOf('s-rl', 'left')).toBe('high');
    expect(sideOf('s-lr', 'line')).toBeNull();
  });

  it('S자도 홀 옆을 지난 쪽을 직접 바꿀 수 있다 (직선만 못 바꾼다)', () => {
    expect(passInfo('s-lr', { across: 'left' }, null)).toEqual({ rest: 'low', pass: 'low', canPass: true });
    expect(passInfo('s-rl', { across: 'left' }, 'low')).toEqual({ rest: 'high', pass: 'low', canPass: true });
    for (const shape of ['straight', null]) {
      expect(sideOf(shape, 'left')).toBeNull();
      expect(passInfo(shape, { across: 'left' }, 'high')).toEqual({ rest: null, pass: null, canPass: false });
    }
  });

  it('S자 miss 기록에도 사이드가 들어간다', () => {
    const miss = buildMiss({ stop: { x: -0.6, y: 0.8 }, brk: 's-lr', tol: 0.15 });
    expect([miss.across, miss.passSide, miss.restSide]).toEqual(['left', 'low', 'low']);
    expect(buildMiss({ stop: { x: -0.6, y: 0.8 }, brk: 's-rl', tol: 0.15 }).passSide).toBe('high');
  });

  it('훅은 왼쪽이 로우사이드, 슬라이스는 오른쪽이 로우사이드, 스트레이트·라인은 사이드 없음', () => {
    expect(sideOf('hook', 'left')).toBe('low');
    expect(sideOf('hook', 'right')).toBe('high');
    expect(sideOf('slice', 'right')).toBe('low');
    expect(sideOf('slice', 'left')).toBe('high');
    expect(sideOf('straight', 'left')).toBeNull();
    expect(sideOf('hook', 'line')).toBeNull();
    expect(sideOf(null, 'left')).toBeNull();
  });

  it('홀 옆을 지난 쪽은 직접 바꿀 수 있고, 바꿀 수 없는 퍼트는 멈춘 자리 기준이다', () => {
    expect(passInfo('hook', { across: 'left' }, null)).toEqual({ rest: 'low', pass: 'low', canPass: true });
    expect(passInfo('hook', { across: 'left' }, 'high')).toEqual({ rest: 'low', pass: 'high', canPass: true });
    expect(passInfo('straight', { across: 'left' }, 'high')).toEqual({ rest: null, pass: null, canPass: false });
    expect(passInfo('hook', { across: 'line' }, 'high').canPass).toBe(false);
  });

  it('미스 방향 문구', () => {
    expect(missText({ along: 'long', across: 'left' }, 'low')).toBe('롱 · 로우사이드');
    expect(missText({ along: 'short', across: 'right' }, 'high')).toBe('숏 · 하이사이드');
    expect(missText({ along: 'pinHigh', across: 'line' }, null)).toBe('핀하이 · 라인');
    expect(missText({ along: 'long', across: 'left' }, null)).toBe('롱 · 좌');
    expect(missText({ along: 'short', across: 'right' }, null)).toBe('숏 · 우');
  });

  it('남은 거리는 0.1m 단위이고 0.1m 밑으로 내려가지 않는다', () => {
    expect(leaveOf({ x: 0.3, y: 0.4 })).toBe(0.5);
    expect(leaveOf({ x: 0, y: 0 })).toBe(0.1);
    expect(leaveOf({ x: 1.04, y: 0 })).toBe(1);
  });

  it('축척은 멈춘 곳이 90% 안에 들어오는 가장 작은 것', () => {
    expect(fitScale({ x: 1, y: 1 })).toBe(3);
    expect(fitScale({ x: 3, y: 0 })).toBe(5);
    expect(fitScale({ x: 8, y: 2 })).toBe(10);
    expect(fitScale({ x: 30, y: 0 })).toBe(20);
    expect(fitScale(null)).toBeNull();
    expect([scaleForDistance(null), scaleForDistance(2.5), scaleForDistance(4), scaleForDistance(12), scaleForDistance(30)]).toEqual([3, 3, 5, 20, 20]);
  });
});

describe('좌표 — 퍼트마다 판을 홀 쪽으로 돌린다', () => {
  it('기본 방향에서는 전역 좌표와 같다', () => {
    expect(toGlobal({ x: 1, y: 2 }, DEFAULT_FRAME)).toEqual({ x: 1, y: 2 });
    expect(toLocal({ x: 1, y: 2 }, DEFAULT_FRAME)).toEqual({ x: 1, y: 2 });
  });

  it('돌린 방향에서도 전역 → 이번 판 → 전역으로 돌아온다', () => {
    const f = nextFrame({ x: 3, y: 4 });
    const m = { x: 0.7, y: -1.3 };
    const back = toLocal(toGlobal(m, f), f);
    expect(back.x).toBeCloseTo(m.x, 10);
    expect(back.y).toBeCloseTo(m.y, 10);
  });

  it('다음 퍼트의 위쪽은 멈춘 곳에서 홀을 보는 방향이고, 멈춘 곳은 판의 바로 아래(숏) 축 위에 온다', () => {
    const g = { x: 1.2, y: 0.9 };                  // 홀 오른쪽 위에 멈췄다
    const f = nextFrame(g);
    expect(f.ux).toBeCloseTo(-0.8, 10);
    expect(f.uy).toBeCloseTo(-0.6, 10);
    const local = toLocal(g, f);
    expect(local.x).toBeCloseTo(0, 10);
    expect(local.y).toBeCloseTo(-1.5, 10);         // 홀까지 1.5m, 홀 아래쪽
  });

  it('홀 바로 옆(1cm)에 멈췄으면 방향을 새로 잡지 않는다', () => {
    expect(nextFrame({ x: 0.005, y: 0.005 })).toEqual(DEFAULT_FRAME);
  });

  it('판 위의 점을 미터로 바꾼다 — 홀(175, 160)이 원점, 위가 롱, 오른쪽이 +', () => {
    const ppm = pxPerMeter(5);
    expect(boardToMeters(HOLE_X, HOLE_Y, ppm)).toEqual({ x: 0, y: 0 });
    const m = boardToMeters(HOLE_X + ppm * 2, HOLE_Y - ppm * 1.5, ppm);
    expect(m.x).toBeCloseTo(2, 2);
    expect(m.y).toBeCloseTo(1.5, 2);
    expect(boardToMeters(-500, 900, ppm)).toEqual({ x: -6.03, y: -6.03 });   // 판 밖은 가장자리(±175px)로
  });
});

describe('miss 기록', () => {
  it('멈춘 위치에서 분류 · 남은 거리 · 사이드 · 전역 좌표를 만든다', () => {
    const miss = buildMiss({ stop: { x: -0.6, y: 0.8 }, brk: 'hook', frame: DEFAULT_FRAME, tol: 0.15 });
    expect(miss).toMatchObject({ x: -0.6, y: 0.8, gx: -0.6, gy: 0.8, leave: 1, tol: 0.15, across: 'left', along: 'long', passSide: 'low', restSide: 'low', passOverride: null });
  });

  it('라이를 안 골랐으면 사이드는 비어 있고 멈춘 위치 분류만 남는다', () => {
    const miss = buildMiss({ stop: { x: 0.5, y: -0.5 }, brk: null, tol: 0.15 });
    expect([miss.across, miss.along, miss.passSide, miss.restSide]).toEqual(['right', 'short', null, null]);
  });

  it('브레이크를 바꾸면 같은 위치로 사이드를 다시 계산하고, 직접 바꾼 사이드는 풀린다', () => {
    const hook = buildMiss({ stop: { x: -0.6, y: 0.8 }, brk: 'hook', tol: 0.15, passOverride: 'high' });
    expect(hook.passSide).toBe('high');
    const slice = refreshMiss(hook, { brk: 'slice' });
    expect([slice.passSide, slice.passOverride]).toEqual(['high', null]);                       // 슬라이스는 왼쪽이 하이사이드
    expect(refreshMiss(hook, { brk: 'straight' }).passSide).toBeNull();
  });

  it('사이드를 직접 고르면 override, 추천과 같은 쪽을 다시 고르면 해제', () => {
    const base = buildMiss({ stop: { x: -0.6, y: 0.8 }, brk: 'hook', tol: 0.15 });
    const swapped = withPassOverride(base, 'hook', DEFAULT_FRAME, 'high');
    expect([swapped.passSide, swapped.passOverride, swapped.restSide]).toEqual(['high', 'high', 'low']);
    const back = withPassOverride(swapped, 'hook', DEFAULT_FRAME, 'low');
    expect([back.passSide, back.passOverride]).toEqual(['low', null]);
  });
});

describe('판 위 겹침 피하기 — 남은 거리 말풍선 · 사이드 버튼', () => {
  const bubbleBox = (b) => ({ x1: b.x - 30, y1: b.y - 13, x2: b.x + 30, y2: b.y + 13 });
  const markerBoxOf = (m, size = 22) => ({ x1: m.x - size / 2 - 4, y1: m.y - size / 2 - 4, x2: m.x + size / 2 + 4, y2: m.y + size / 2 + 4 });

  it('찍은 위치가 없으면 사이드 버튼은 홀 높이 양 옆이고 말풍선은 없다', () => {
    const lay = layoutOverlays({ marker: null });
    expect(lay.sideY).toEqual({ left: HOLE_Y, right: HOLE_Y });
    expect(lay.bubble).toBeNull();
  });

  it('버튼과 먼 곳에 찍으면 버튼은 그대로이고 말풍선은 홀 반대쪽 바깥에 붙는다', () => {
    const m = { x: 200, y: 60 };                                   // 홀 오른쪽 위
    const lay = layoutOverlays({ marker: m });
    expect(lay.sideY).toEqual({ left: HOLE_Y, right: HOLE_Y });
    expect(lay.bubble.x).toBeGreaterThan(m.x);                     // 홀에서 멀어지는 쪽(오른쪽 위)
    expect(lay.bubble.y).toBeLessThan(m.y);
  });

  it('왼쪽 버튼 바로 옆에 찍으면 말풍선이 버튼을 가리지 않는다 (스크린샷의 그 경우)', () => {
    const m = { x: 118, y: 160 };                                  // 왼쪽 사이드 버튼 오른쪽 끝 바로 옆, 홀 높이
    const lay = layoutOverlays({ marker: m });
    const b = bubbleBox(lay.bubble);
    expect(boxesOverlap(b, sideButtonBox('left', lay.sideY.left))).toBe(false);
    expect(boxesOverlap(b, sideButtonBox('right', lay.sideY.right))).toBe(false);
    expect(boxesOverlap(b, markerBoxOf(m))).toBe(false);
  });

  it('멈춘 곳 표시가 버튼 밑에 깔리면 그 버튼이 위나 아래로 비켜 선다', () => {
    const m = { x: 50, y: HOLE_Y };                                // 왼쪽 버튼 자리 한가운데
    const lay = layoutOverlays({ marker: m });
    expect(lay.sideY.left).not.toBe(HOLE_Y);
    expect(SIDE_BTN.ys.left).toContain(lay.sideY.left);
    expect(lay.sideY.right).toBe(HOLE_Y);                          // 반대쪽은 그대로
    expect(boxesOverlap(sideButtonBox('left', lay.sideY.left), markerBoxOf(m))).toBe(false);
    expect(boxesOverlap(bubbleBox(lay.bubble), sideButtonBox('left', lay.sideY.left))).toBe(false);
  });

  it('오른쪽 버튼은 눈금 글자가 있는 위쪽보다 아래쪽으로 먼저 비켜 선다', () => {
    const lay = layoutOverlays({ marker: { x: 300, y: HOLE_Y } });
    expect(lay.sideY.right).toBe(224);
    expect(lay.sideY.left).toBe(HOLE_Y);
  });

  it('판 어디에 찍어도 말풍선은 사이드 버튼 · 멈춘 곳 표시와 겹치지 않고 판 안에 있다', () => {
    const bad = [];
    for (let x = 4; x <= BOARD_W - 4; x += 9) {
      for (let y = 4; y <= BOARD_H - 4; y += 9) {
        for (const dragging of [false, true]) {
          const size = dragging ? 28 : 22;
          const lay = layoutOverlays({ marker: { x, y }, size, dragging });
          const b = bubbleBox(lay.bubble);
          const inside = b.x1 >= 0 && b.x2 <= BOARD_W && b.y1 >= 0 && b.y2 <= BOARD_H;
          const clash = boxesOverlap(b, sideButtonBox('left', lay.sideY.left)) || boxesOverlap(b, sideButtonBox('right', lay.sideY.right)) || boxesOverlap(b, markerBoxOf({ x, y }, size));
          const marker = markerBoxOf({ x, y }, size);
          const btnOnMarker = boxesOverlap(sideButtonBox('left', lay.sideY.left), marker) || boxesOverlap(sideButtonBox('right', lay.sideY.right), marker);
          if (!inside || clash || btnOnMarker) bad.push(`${x},${y}${dragging ? 'd' : ''}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('끄는 동안에는 손가락에 가리지 않게 먼저 위쪽에 둔다', () => {
    const m = { x: 175, y: 250 };
    const rest = layoutOverlays({ marker: m });
    const drag = layoutOverlays({ marker: m, size: 28, dragging: true });
    expect(drag.bubble.y).toBeLessThan(m.y);
    expect(rest.bubble.y).toBeGreaterThan(m.y);                   // 평소에는 홀 반대쪽(아래)
  });
});

describe('복기 — 퍼트 라이 이름', () => {
  it('저장된 라이 id 가 아니라 한글 이름으로 나온다 (복합 포함)', () => {
    const round = makeActiveRound('me', { currentHole: 0 });
    const hole = round.holes[0];
    hole.scores.me = {
      ...hole.scores.me, putts: 3, puttsManual: true,
      puttDetails: [{ distance: 6, lie: 'uphill-break-right', holein: 'fail' }, { distance: 2, lie: 'downhill-s-rl', holein: 'fail' }, { distance: 0.5, lie: null, holein: 'success' }],
    };
    expect(buildHoleReview(hole, 'me', 0).putts.map((p) => p.lie)).toEqual(['오르막 훅', '내리막 우→좌 S', null]);
  });
});

describe('퍼트 한 줄 요약', () => {
  const miss = buildMiss({ stop: { x: -0.6, y: 0.8 }, brk: 'hook', tol: 0.15 });

  it('거리 · 라이 · 미스 방향 · 남은 거리', () => {
    expect(puttRowText({ distance: 5, lie: 'break-right', miss })).toBe('5.0m · 훅 · 롱 · 로우사이드 → 1.0m');
    expect(puttRowText({ distance: 5, lie: 'uphill-break-right', miss })).toBe('5.0m · 오르막 훅 · 롱 · 로우사이드 → 1.0m');
    expect(puttRowText({ distance: 5, lie: 'uphill-s-lr', miss })).toBe('5.0m · 오르막 좌→우 S · 롱 · 로우사이드 → 1.0m');
  });

  it('없는 항목은 빼고, 아무것도 없으면 빈 글', () => {
    expect(puttRowText({ distance: 2.5, lie: null })).toBe('2.5m');
    expect(puttRowText({ distance: null, lie: 'uphill-break-left', holein: 'success' })).toBe('오르막 슬라이스');
    expect(puttRowText({ distance: null, lie: null })).toBe('');
    expect(puttRowText(null)).toBe('');
  });

  it('야드 모드에서는 퍼트 거리가 피트로 나온다', () => {
    setUnit('yd');
    expect(puttRowText({ distance: 3.048, lie: null, miss })).toMatch(/^10ft · 롱 · 로우사이드 → 3ft$/);
  });
});
