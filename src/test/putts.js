// 퍼팅 분석 테스트용 퍼트 · 홀 · 라운드 만들기 — 멈춘 곳 기록은 앱이 판에서 만드는 것과 같은 함수(buildMiss)로 만든다.
import { buildMiss, DEFAULT_FRAME } from '../engine/puttMiss.js';
import { defaultScore } from './fixtures.js';

export const ME = '테스터';

// 멈춘 곳(x 오른쪽+ · y 롱+, 이번 퍼트 기준 m)으로 miss 기록
export const stopAt = (x, y, brk = null) => buildMiss({ stop: { x, y }, brk, frame: DEFAULT_FRAME, tol: 0.15 });
// 홀인한 퍼트
export const made = (dist, lie = 'flat', extra = {}) => ({ distance: dist, aimDistance: dist, lie, holein: 'success', ...extra });
// 빗나간 퍼트 — x 가 null 이면 멈춘 곳 기록 없음, extra.brk 는 하이/로우사이드를 가르는 휨('hook' · 'slice')
export const missed = (dist, lie, x, y, extra = {}) => ({ distance: dist, aimDistance: dist, lie, holein: 'fail', ...(x == null ? {} : { miss: stopAt(x, y, extra.brk ?? null) }) });
// 홀 하나 — 퍼트 기록과 파 · 타수 · 그린 적중
export const holeOf = (puttDetails, { par = 4, strokes, gir = true, number = 1, over = {} } = {}) => ({
  holeNumber: number, par,
  scores: { [ME]: { ...defaultScore(par), touched: true, confirmed: true, putts: puttDetails.length, strokes: strokes ?? par, gir, girAuto: false, puttDetails, ...over } },
});
export const roundOf = (holes, id = 'r') => ({ id, date: '2026-06-01T00:00:00.000Z', players: [ME], holes });

// 미스 위치까지 갖춘 라운드들 — 숏 쪽으로 빗나가는 오르막, 롱 쪽으로 빗나가는 내리막, 훅 · 슬라이스의 하이/로우사이드를 골고루
export function sampleRounds() {
  const holes = [];
  let n = 1;
  const add = (puttDetails, opts = {}) => holes.push(holeOf(puttDetails, { number: n++, ...opts }));
  [-0.5, -0.7, -0.6, -0.4, -0.8].forEach((y) => add([missed(4, 'uphill', 0.05, y), made(0.5)]));
  [0.6, 0.9, 0.7, 0.5, 1.1].forEach((y) => add([missed(5, 'downhill', -0.1, y), made(0.6)]));
  [[-0.4, 0.1], [-0.5, -0.2], [0.4, -0.1], [-0.3, 0.3], [-0.6, 0]].forEach(([x, y]) => add([missed(6, 'break-right', x, y, { brk: 'hook' }), made(0.5)]));
  [[0.5, 0.2], [0.4, -0.3], [-0.5, 0.1]].forEach(([x, y]) => add([missed(5, 'break-left', x, y, { brk: 'slice' }), made(0.5)]));
  [[0.4, -0.3], [0.5, 0.1], [-0.2, -0.4]].forEach(([x, y]) => add([missed(3, 'flat', x, y), made(0.4)]));
  add([made(2, 'flat')]); add([made(1.2, 'flat')]); add([made(3, 'uphill')]);
  return [roundOf(holes)];
}
