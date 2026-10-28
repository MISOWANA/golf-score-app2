// ─── 퍼트 미스 위치 — 공이 멈춘 곳으로 롱/숏 · 좌/우 · 하이/로우사이드 · 남은 거리를 정한다 ─────────────────
//
// 퍼팅 탭의 "미스 위치" 판이 쓰는 계산이다 (화면은 components/scoring/PuttBoard.jsx).
// 판은 홀을 가운데 두고, 이번 퍼트의 라인(공 → 홀)이 위쪽을 향하게 그린다.
//   x  오른쪽(+) · 왼쪽(−)   y  롱(+, 홀 너머) · 숏(−, 못 미침)      단위 m, 이번 퍼트 라인 기준
// 다음 퍼트는 멈춘 곳에서 홀을 보는 방향으로 판을 다시 돌린다 — 퍼트마다 위가 늘 "홀 쪽"이다.
//   frame { ux, uy }   이 퍼트의 위쪽(+y)이 전역 좌표(PUTT 1 라인 기준, 홀이 원점)에서 가리키는 단위 벡터
//   gx, gy             전역 좌표의 멈춘 위치 — 이전 퍼트의 멈춘 자리를 다음 판에 점으로 다시 그릴 때 쓴다
//
// brk 인자: 라이의 모양(lieShape) — 'hook' | 'slice' | 'straight' | 's-lr' | 's-rl' | null. 사이드는 훅 · 슬라이스, 그리고 S자의 홀 앞쪽 휨으로 정한다(sideBreak).
//
// 퍼트 기록(puttDetails[i])에는 이렇게 덧붙는다 (모두 선택 · 없으면 예전 기록과 같다):
//   miss   { x, y, gx, gy, leave, tol, across, along, passSide, restSide, passOverride }
//            across  'left' | 'right' | 'line'        along  'long' | 'short' | 'pinHigh'
//            leave   멈춘 곳에서 홀까지 남은 거리(m, 0.1 단위)
//            passSide  홀 옆을 지난 쪽 'high' | 'low' | null — 하이/로우사이드 통계는 이 값을 쓴다
//            restSide  멈춘 위치 기준 사이드 (분석용) · passOverride  사용자가 직접 바꾼 사이드
//            tol     좌우 · 앞뒤를 "라인" · "핀하이"로 보는 허용 거리(m) — 찍은 때의 판 축척에서 정해진다
//   frame  이 퍼트 판의 방향 (첫 퍼트는 없음 = 기본)
//   distanceAuto  true 면 이 퍼트 거리는 직전 퍼트가 멈춘 곳에서 자동으로 넣은 값
//   tapIn  true 면 "탭인" 버튼으로 한 번에 기록한 마지막 퍼트
// ※ 이름 주의: 이 파일의 along 은 롱/숏 분류이고, 퍼트 기록의 distance 는 늘 퍼트 거리(m)다.

import { puttLieId, decomposePuttLie } from './shotStats.js';
import { fmtPutt } from './units.js';

// 판 크기와 홀 위치 — 화면에서는 이 좌표계를 비율로 줄여 쓴다 (좁은 폰에서도 넘치지 않게)
export const BOARD_W = 350;
export const BOARD_H = 320;
export const HOLE_X = 175;
export const HOLE_Y = 160;
const HALF_VIEW_PX = 145;               // 축척 ±R m 가 홀에서 몇 px 까지 닿는지

export const BOARD_SCALES = [3, 5, 10, 20];                       // 축척(±m)
export const BOARD_RINGS = { 3: [3, 2, 1], 5: [5, 2, 1], 10: [10, 5, 2], 20: [20, 10, 5] };
export const TAP_IN_MAX_M = 1.0;                                  // 탭인으로 볼 수 있는 남은 거리(m)
export const DEFAULT_FRAME = { ux: 0, uy: 1 };

export const pxPerMeter = (scale) => HALF_VIEW_PX / scale;

// ─── 라이: 기본 9개 + 복합(S자) 6개 ───────────────────────────────────────────────────────────
// 저장하는 라이 id 는 예전과 같다('flat' · 'uphill' · 'break-right' · 'downhill-break-left' …) — 통계가 그대로 읽는다.
// 훅 = 'break-right'(우→좌로 휘는 퍼트), 슬라이스 = 'break-left'(좌→우로 휘는 퍼트) — 퍼팅 라이 선택의 이름과 같다.
// 복합(S자)은 휘는 방향이 중간에 바뀌는 라이다. 앞쪽 휨을 기준으로 이름을 붙인다:
//   's-lr' 좌→우 S  처음엔 좌→우(슬라이스)로 휘다가 홀 앞에서 우→좌(훅)로 바뀐다   's-rl' 우→좌 S  그 반대
//   경사를 붙여 'uphill-s-lr' · 'downhill-s-rl' …  (평지는 경사 글자를 붙이지 않는다)
// 라이는 한 번 눌러 고른다 — 9개는 늘 보이고, 자주 쓰지 않는 복합 6개는 접어 둔다.

// 9개 — 위에서부터 오르막 · 평지 · 내리막, 왼쪽이 슬라이스, 오른쪽이 훅 (퍼팅 라이를 고르던 원판과 같은 배치)
export const PUTT_LIES = [
  { id: 'uphill-break-left', label: '오르막\n슬라이스' }, { id: 'uphill', label: '오르막' }, { id: 'uphill-break-right', label: '오르막\n훅' },
  { id: 'break-left', label: '슬라이스' }, { id: 'flat', label: '평지' }, { id: 'break-right', label: '훅' },
  { id: 'downhill-break-left', label: '내리막\n슬라이스' }, { id: 'downhill', label: '내리막' }, { id: 'downhill-break-right', label: '내리막\n훅' },
];

// 복합 6개 — 위에서부터 오르막 · 평지 · 내리막, 왼쪽이 좌→우 S, 오른쪽이 우→좌 S
export const COMPOUND_LIES = [
  { id: 'uphill-s-lr', label: '오르막\n좌→우 S' }, { id: 'uphill-s-rl', label: '오르막\n우→좌 S' },
  { id: 's-lr', label: '평지\n좌→우 S' }, { id: 's-rl', label: '평지\n우→좌 S' },
  { id: 'downhill-s-lr', label: '내리막\n좌→우 S' }, { id: 'downhill-s-rl', label: '내리막\n우→좌 S' },
];

const LIE_LABEL = Object.fromEntries([...PUTT_LIES, ...COMPOUND_LIES].map((x) => [x.id, x.label.replace('\n', ' ')]));

// 저장된 값(문자열 · 예전 기록의 [문자열] · 비어 있음)에서 라이 id — 고르지 않았으면 null
export const lieIdOf = (lie) => puttLieId(lie);

// 라이를 짧게 — "오르막 훅" · "평지" · "좌→우 S" (고르지 않았으면 빈 글, 모르는 id 는 그대로)
export function puttLieText(lie) {
  const id = lieIdOf(lie);
  return id == null ? '' : (LIE_LABEL[id] ?? id);
}

export const isCompoundLie = (lie) => decomposePuttLie(lieIdOf(lie) ?? 'flat').brk === 'scurve';

// 판에 그리는 공의 길 모양 — 'hook' | 'slice' | 'straight' | 's-lr' | 's-rl' | null(고르지 않음)
export function lieShape(lie) {
  const id = lieIdOf(lie);
  if (id == null) return null;
  const { brk } = decomposePuttLie(id);
  if (brk === 'scurve') return id.endsWith('s-lr') ? 's-lr' : 's-rl';
  return brk;
}

// 저장된 라이 → 경사 'uphill' | 'flat' | 'downhill' (고르지 않았으면 null)
export function lieSlope(lie) {
  const id = lieIdOf(lie);
  return id == null ? null : decomposePuttLie(id).slope;
}

// ─── 멈춘 위치 → 분류 ─────────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;
export const clampStop = (v, lim) => round2(Math.max(-lim, Math.min(lim, v)));

// 판에서 찍는 손가락은 7px 정도 흔들리므로 그만큼(최소 10cm)은 "라인 · 핀하이"로 본다
export const stopTolerance = (ppm) => Math.max(0.1, 7 / ppm);

export function classifyStop(m, tol) {
  return {
    across: Math.abs(m.x) < tol ? 'line' : (m.x < 0 ? 'left' : 'right'),
    along: Math.abs(m.y) < tol ? 'pinHigh' : (m.y > 0 ? 'long' : 'short'),
  };
}

// 하이/로우사이드를 가를 때 보는 휨 — 훅 · 슬라이스는 그 자체, S자(복합)는 홀 앞쪽의 휨이다.
// 공이 홀 옆을 지나는 자리는 마지막 구간이라서, 좌→우 S 는 끝이 우→좌(훅), 우→좌 S 는 끝이 좌→우(슬라이스)로 본다.
// 직선이거나 라이를 고르지 않았으면 null — 사이드를 말하지 않는다.
export const sideBreak = (shape) => ({ hook: 'hook', slice: 'slice', 's-lr': 'hook', 's-rl': 'slice' }[shape] ?? null);

// 훅(오른쪽에서 왼쪽으로 휘는 퍼트)은 왼쪽이 로우사이드, 슬라이스는 오른쪽이 로우사이드.
export function sideOf(brk, across) {
  const eff = sideBreak(brk);
  if (eff == null || !across || across === 'line') return null;
  const low = eff === 'hook' ? 'left' : 'right';
  return across === low ? 'low' : 'high';
}

// rest: 멈춘 자리 기준 사이드 · pass: 홀 옆을 지난 쪽(사용자가 바꿀 수 있다) · canPass: 바꿀 수 있는 퍼트인지
export function passInfo(brk, c, override) {
  const rest = sideOf(brk, c.across);
  const canPass = sideBreak(brk) != null && c.across !== 'line';
  const pass = canPass ? (override || rest) : rest;
  return { rest, pass, canPass };
}

export function missText(c, pass) {
  const d = { long: '롱', short: '숏', pinHigh: '핀하이' }[c.along];
  if (pass) return `${d} · ${pass === 'high' ? '하이사이드' : '로우사이드'}`;
  if (c.across === 'line') return `${d} · 라인`;
  return `${d} · ${c.across === 'left' ? '좌' : '우'}`;
}

export const leaveOf = (m) => Math.max(0.1, Math.round(Math.hypot(m.x, m.y) * 10) / 10);

// 멈춘 곳이 들어오는 가장 작은 축척 (바깥 눈금의 90% 안쪽)
export function fitScale(m) {
  if (!m) return null;
  const d = Math.hypot(m.x, m.y);
  return BOARD_SCALES.find((v) => d <= v * 0.9) || 20;
}

// 퍼팅 거리에 맞는 축척 — 공이 판 안에 보이게
export const scaleForDistance = (dist) => (dist == null ? 3 : (BOARD_SCALES.find((v) => dist <= v) || 20));

// ─── 좌표 변환 ─────────────────────────────────────────────────────────────────────────

export const toGlobal = (m, f) => ({ x: m.x * f.uy + m.y * f.ux, y: -m.x * f.ux + m.y * f.uy });
export const toLocal = (g, f) => ({ x: g.x * f.uy - g.y * f.ux, y: g.x * f.ux + g.y * f.uy });

// 다음 퍼트의 방향 — 멈춘 곳(전역)에서 홀(원점)을 향한다
export function nextFrame(g) {
  const len = Math.hypot(g.x, g.y);
  return len > 0.01 ? { ux: -g.x / len, uy: -g.y / len } : DEFAULT_FRAME;
}

// 판 위의 점(0~BOARD_W · 0~BOARD_H) → 미터
export function boardToMeters(fx, fy, ppm) {
  return { x: clampStop((fx - HOLE_X) / ppm, HOLE_X / ppm), y: clampStop((HOLE_Y - fy) / ppm, HOLE_X / ppm) };
}

// ─── 기록 만들기 ────────────────────────────────────────────────────────────────────────

// 멈춘 위치(x, y: 이번 퍼트 기준 m)로 miss 기록을 만든다. brk: 'hook' | 'straight' | 'slice' | null
export function buildMiss({ stop, brk = null, frame = DEFAULT_FRAME, tol, passOverride = null }) {
  const c = classifyStop(stop, tol);
  const g = toGlobal(stop, frame);
  const pi = passInfo(brk, c, passOverride);
  return {
    x: stop.x, y: stop.y, gx: round2(g.x), gy: round2(g.y), leave: leaveOf(stop), tol,
    across: c.across, along: c.along,
    passSide: pi.pass, restSide: pi.rest, passOverride: passOverride || null,
  };
}

// 라이(브레이크)나 방향이 바뀌었을 때 같은 멈춘 위치로 사이드를 다시 계산한다 (직접 바꾼 사이드는 풀린다)
export function refreshMiss(miss, { brk, frame = DEFAULT_FRAME }) {
  return buildMiss({ stop: { x: miss.x, y: miss.y }, brk, frame, tol: miss.tol, passOverride: null });
}

// 사이드를 직접 고른다 — 추천(멈춘 자리 기준)과 같은 쪽을 다시 누르면 직접 선택이 풀린다
export function withPassOverride(miss, brk, frame, side) {
  const c = { across: miss.across, along: miss.along };
  const rest = sideOf(brk, c.across);
  return buildMiss({ stop: { x: miss.x, y: miss.y }, brk, frame, tol: miss.tol, passOverride: side === rest ? null : side });
}

// 퍼트 한 줄 요약 — "5.0m · 오르막 훅 · 롱 · 하이사이드 → 1.2m" (거리 · 라이 · 미스 방향 · 남은 거리). 없는 항목은 뺀다.
export function puttRowText(putt) {
  if (!putt) return '';
  const parts = [];
  if (typeof putt.distance === 'number') parts.push(fmtPutt(putt.distance, { digits: 1 }));
  const lie = puttLieText(putt.lie);
  if (lie) parts.push(lie);
  const m = putt.miss;
  if (m) parts.push(missText({ across: m.across, along: m.along }, m.passSide));
  let text = parts.join(' · ');
  if (m) text += `${text ? ' ' : ''}→ ${fmtPutt(m.leave, { digits: 1 })}`;
  return text;
}

// ─── 판 위 겹침 피하기 — 남은 거리 말풍선 · 좌우 사이드 버튼 · 멈춘 위치 표시 ────────────────────────────
// 모두 판 좌표(0~BOARD_W · 0~BOARD_H)로 계산한다. 버튼은 화면 픽셀 크기라서 좁은 폰에서 가장 크게 잡힐 때(320px)를 기준으로 넉넉히 둔다.
//   · 사이드 버튼은 평소 홀 높이의 양 옆에 있다가, 멈춘 곳 표시가 그 밑에 깔리면 위(96) 또는 아래(224)로 비켜 선다.
//   · 남은 거리 말풍선은 멈춘 곳 바깥쪽에 두고, 사이드 버튼 · 홀 · 멈춘 곳 표시와 겹치면 위 · 아래 · 옆 · 대각선 순으로 자리를 옮긴다.
// 비켜 설 때 오른쪽은 아래(224)를 먼저 쓴다 — 오른쪽 위 대각선에는 눈금 글자가 있다.
export const SIDE_BTN = { w: 126, h: 58, inset: 6, ys: { left: [HOLE_Y, 96, 224], right: [HOLE_Y, 224, 96] } };
const BUBBLE = { w: 60, h: 26 };
const boxAt = (cx, cy, w, h) => ({ x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });
const hits = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
export const sideButtonBox = (side, y) => boxAt(side === 'left' ? SIDE_BTN.inset + SIDE_BTN.w / 2 : BOARD_W - SIDE_BTN.inset - SIDE_BTN.w / 2, y, SIDE_BTN.w, SIDE_BTN.h);
export const boxesOverlap = hits;

// marker: 멈춘 곳 { x, y }(판 좌표) 또는 null · size: 표시 지름(px) · dragging: 끄는 중이면 손가락 위쪽을 먼저 쓴다
export function layoutOverlays({ marker = null, size = 22, dragging = false } = {}) {
  const markerBox = marker ? boxAt(marker.x, marker.y, size + 8, size + 8) : null;
  const pickY = (side) => SIDE_BTN.ys[side].find((y) => !markerBox || !hits(sideButtonBox(side, y), markerBox)) ?? HOLE_Y;
  const sideY = { left: pickY('left'), right: pickY('right') };
  if (!marker) return { sideY, bubble: null, markerBox };

  const { w, h } = BUBBLE;
  const clamp = (c) => ({ x: Math.max(w / 2 + 4, Math.min(BOARD_W - w / 2 - 4, c.x)), y: Math.max(h / 2 + 4, Math.min(BOARD_H - h / 2 - 4, c.y)) });
  const obstacles = [sideButtonBox('left', sideY.left), sideButtonBox('right', sideY.right), boxAt(HOLE_X, HOLE_Y, 80, 80), markerBox];
  let vx = marker.x - HOLE_X, vy = marker.y - HOLE_Y;
  const vl = Math.hypot(vx, vy);
  if (vl < 1) { vx = 1; vy = 0; } else { vx /= vl; vy /= vl; }
  const dirs = dragging
    ? [[0, -1], [vx, vy], [0, 1], [1, 0], [-1, 0], [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]
    : [[vx, vy], [0, -1], [0, 1], [1, 0], [-1, 0], [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]];
  const gap = size / 2 + 8;
  let first = null;
  for (const extra of [0, 22, 44]) {
    for (const [dx, dy] of dirs) {
      const reach = gap + Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2) + extra;
      const c = clamp({ x: marker.x + dx * reach, y: marker.y + dy * reach });
      first = first ?? c;
      const b = boxAt(c.x, c.y, w, h);
      if (!obstacles.some((o) => o && hits(b, o))) return { sideY, bubble: c, markerBox };
    }
  }
  return { sideY, bubble: first, markerBox };   // 어디에도 못 두면 바깥쪽
}
