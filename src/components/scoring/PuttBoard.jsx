import { useRef, useState } from 'react';
import {
  BOARD_W, BOARD_H, HOLE_X, HOLE_Y, BOARD_SCALES, BOARD_RINGS, DEFAULT_FRAME,
  pxPerMeter, scaleForDistance, fitScale, stopTolerance, boardToMeters, clampStop, toLocal,
  buildMiss, withPassOverride, sideOf, sideBreak, passInfo, missText, layoutOverlays,
} from '../../engine/puttMiss.js';
import { fmtPutt } from '../../engine/units.js';

// 퍼팅 "미스 위치" 판 — 공이 멈춘 곳을 탭하면 롱/숏 · 좌/우 · 하이/로우사이드와 남은 거리가 정해진다.
// 계산과 기록 모양은 engine/puttMiss.js. 이 파일은 화면(판 · 축척 · 결과 카드)과 손가락 동작만 맡는다.
//
//   distance   이 퍼트의 거리(m) — 공이 판 아래쪽 어디에 있는지, 처음 축척이 얼마인지
//   order      몇 번째 퍼트인지 (1부터)       brk  라이의 모양 'hook' | 'slice' | 'straight' | 's-lr' | 's-rl' | null (engine 의 lieShape)
//   frame      이 퍼트의 판 방향               miss  저장된 miss 기록 | null
//   prevStops  이전 퍼트가 멈춘 자리들 [{ n, gx, gy }] — 이번 판 방향으로 돌려 점으로 보여 준다
//   onChange(miss | null)  멈춘 곳을 찍었거나(손을 뗄 때) 사이드를 바꿨거나 지웠을 때
//   onHoleIn   홀 버튼을 눌렀을 때 (없으면 홀 버튼을 그리지 않는다)
//
// 판은 350×320 좌표로 설계했고 화면에서는 비율로 줄여 그린다 — 폭이 좁은 폰(320px)에서도 넘치지 않는다. 글자는 줄지 않는다.
// 판 위에서는 스크롤이 막힌다(touch-action: none) — 끌어서 위치를 미세 조정하려면 필요하다. 스크롤은 판 바깥에서 한다.
// 색은 theme 로만 바꾼다 (앱 색과 맞추려면 여기에 넘긴다).

const BASE_THEME = {
  board: '#0e211e', boardBorder: '#24403a', ring: '#2f5149', ringFill: '#123029', axis: '#1f3a35',
  ringLabel: '#8fb0a8', ball: '#ffffff', path: '#4a6a63',
  gold: '#c9a228', goldHi: '#f3d36b', low: '#f2895e', lowBg: 'rgba(242,137,94,0.16)', sel: 'rgba(201,162,40,0.18)',
  text: '#e8edf8', text2: '#c4cfe0', muted: '#8896b0', bg: '#0b0e18', card: '#0d1425', line: '#252f4a',
  ok: '#3db87a',
};

// 위치 · 크기를 판 좌표(0~BOARD_W · 0~BOARD_H)에서 비율로 바꾼다
const pctX = (x) => `${(x / BOARD_W) * 100}%`;
const pctY = (y) => `${(y / BOARD_H) * 100}%`;
const at = (x, y) => ({ position: 'absolute', left: pctX(x), top: pctY(y) });
const centered = (x, y) => ({ ...at(x, y), transform: 'translate(-50%, -50%)' });
const ptLabel = (m) => fmtPutt(m, { digits: Number.isInteger(m) ? 0 : 1 });

// 스코어 입력의 섹션 머리글(fIcon · fLbl)과 같은 모양 — ScoringView 의 값과 함께 바꾼다
const iconStyle = { fontSize: 15, width: 18, textAlign: 'center', color: '#8896b0', flexShrink: 0 };
const labelStyle = { fontSize: 13, fontWeight: 700, color: '#8ca4bc', letterSpacing: '0.15em', textTransform: 'uppercase' };

export default function PuttBoard({ distance = null, order = 1, brk = null, frame = DEFAULT_FRAME, miss = null, prevStops = [], onChange, onHoleIn, theme }) {
  const C = { ...BASE_THEME, ...theme };
  const [scale, setScale] = useState(null);          // 직접 고른 축척 (null = 자동)
  const [live, setLive] = useState(null);            // 끄는 동안의 위치
  const [dragging, setDragging] = useState(false);
  const [fine, setFine] = useState(false);
  const drag = useRef(null);
  const liveRef = useRef(null);
  const [lockedR, setLockedR] = useState(null);     // 끄는 동안 고정해 두는 축척

  const saved = miss ? { x: miss.x, y: miss.y } : null;
  const stop = live ?? saved;

  // 축척: 끄는 동안은 고정 · 직접 고른 값 · 멈춘 곳이 들어오는 크기 · 퍼팅 거리에 맞는 크기 순
  const R = dragging && lockedR ? lockedR : (scale ?? (stop ? fitScale(stop) : scaleForDistance(distance)));
  const ppm = pxPerMeter(R);
  const px = (x) => HOLE_X + x * ppm;
  const py = (y) => HOLE_Y - y * ppm;

  // 판 위의 손가락 위치 → 미터
  const toMeters = (clientX, clientY, rect) => boardToMeters(
    ((clientX - rect.left) / rect.width) * BOARD_W, ((clientY - rect.top) / rect.height) * BOARD_H, ppm);

  // 찍은 자리를 저장한다 — 판은 손을 뗀 뒤 멈춘 곳에 맞춰지므로 분류 허용 거리도 그 축척 기준이다
  const commit = (m) => {
    const tol = stopTolerance(pxPerMeter(fitScale(m)));
    onChange?.(buildMiss({ stop: m, brk, frame, tol, passOverride: miss?.passOverride ?? null }));
  };

  const onDown = (ev) => {
    const el = ev.currentTarget;
    const rect = el.getBoundingClientRect();
    try { el.setPointerCapture(ev.pointerId); } catch { /* 캡처를 못 해도 판 안에서는 계속 움직인다 */ }
    setLockedR(R);
    const d = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, rect, start: stop, moved: false, placed: false };
    if (!stop) {
      const p = toMeters(ev.clientX, ev.clientY, rect);   // 처음에는 누른 자리가 곧 위치
      d.start = p; d.placed = true; drag.current = d;
      liveRef.current = p; setLive(p); setDragging(true); setFine(false);
    } else {
      drag.current = d; setDragging(true); setFine(true);   // 이미 있는 위치는 끌어서 미세 조정 (0.5배)
    }
  };

  const onMove = (ev) => {
    const d = drag.current;
    if (!d || d.id !== ev.pointerId) return;
    const dx = ((ev.clientX - d.sx) / d.rect.width) * BOARD_W;
    const dy = ((ev.clientY - d.sy) / d.rect.height) * BOARD_H;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    const k = d.placed ? 1 : 0.5;
    const lim = HOLE_X / ppm;
    const m = { x: clampStop(d.start.x + (dx * k) / ppm, lim), y: clampStop(d.start.y - (dy * k) / ppm, lim) };
    liveRef.current = m; setLive(m);
  };

  const onUp = (ev) => {
    const d = drag.current;
    if (!d || d.id !== ev.pointerId) return;
    drag.current = null;
    // 움직이지 않고 뗐다면 탭 — 누른 자리가 새 위치
    const m = (!d.moved && !d.placed) ? toMeters(ev.clientX, ev.clientY, d.rect) : (liveRef.current ?? d.start);
    liveRef.current = null;
    setLive(null); setDragging(false); setLockedR(null); setScale(null);
    commit(m);
  };

  const onCancel = () => { drag.current = null; liveRef.current = null; setLive(null); setDragging(false); setLockedR(null); };

  const onKey = (ev) => {
    const step = ev.shiftKey ? 0.5 : 0.1;
    const v = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[ev.key];
    if (!v) return;
    ev.preventDefault();
    const base = stop ?? { x: 0, y: -0.5 };
    const lim = HOLE_X / ppm;
    setScale(null);
    commit({ x: clampStop(base.x + v[0], lim), y: clampStop(base.y + v[1], lim) });
  };

  // ─── 보여 줄 값 ────────────────────────────────────────────────────────────────────
  // 끄는 동안은 지금 축척 기준으로 바로 계산하고, 놓은 뒤에는 저장된 값을 그대로 보여 준다
  const shown = stop ? (dragging || !miss ? buildMiss({ stop, brk, frame, tol: stopTolerance(ppm), passOverride: miss?.passOverride ?? null }) : miss) : null;
  const pi = shown ? passInfo(brk, { across: shown.across, along: shown.along }, shown.passOverride) : null;

  // 공(출발점)과 라이 선
  const rawBallY = distance != null ? HOLE_Y + distance * ppm : 306;
  const ballOff = rawBallY > 306;
  const ballY = Math.round(Math.min(306, rawBallY));
  const bend = (ballY - 166) * 0.55;
  const midY = Math.round((ballY + 166) / 2);
  const liePath = brk ? ({
    hook: `M175 ${ballY - 7} Q${Math.round(175 + bend)} ${midY} 175 166`,
    straight: `M175 ${ballY - 7} L175 166`,
    slice: `M175 ${ballY - 7} Q${Math.round(175 - bend)} ${midY} 175 166`,
    // 복합(S자) — 앞쪽은 슬라이스(왼쪽으로 겨냥) · 뒤쪽은 훅(오른쪽으로 겨냥)이 'lr', 'rl' 은 그 반대
    's-lr': `M175 ${ballY - 7} C${Math.round(175 - bend * 0.9)} ${Math.round(ballY - (ballY - 166) * 0.3)} ${Math.round(175 + bend * 0.9)} ${Math.round(ballY - (ballY - 166) * 0.7)} 175 166`,
    's-rl': `M175 ${ballY - 7} C${Math.round(175 + bend * 0.9)} ${Math.round(ballY - (ballY - 166) * 0.3)} ${Math.round(175 - bend * 0.9)} ${Math.round(ballY - (ballY - 166) * 0.7)} 175 166`,
  })[brk] : '';
  const ballLabel = distance == null ? '' : `${order > 1 ? `${order - 1}번 자리 · ` : '공 · '}${ballOff ? '↓ ' : ''}${fmtPutt(distance, { digits: 1 })}`;

  // 멈춘 곳 표시와 남은 거리 말풍선 (홀 반대쪽 바깥에 둔다)
  let mk = null;
  let leavePath = '';
  let passMark = null;
  let overlay = null;
  if (stop && shown) {
    const mx = Math.max(4, Math.min(BOARD_W - 4, px(stop.x)));
    const my = Math.max(4, Math.min(BOARD_H - 4, py(stop.y)));
    const size = dragging ? 28 : 22;
    // 남은 거리 말풍선과 사이드 버튼이 서로, 그리고 멈춘 곳 표시와 겹치지 않게 자리를 정한다 (engine/puttMiss.js layoutOverlays)
    overlay = layoutOverlays({ marker: { x: mx, y: my }, size, dragging });
    mk = {
      x: mx, y: my, size, ring: pi?.pass === 'low' ? C.low : C.gold,
      bx: overlay.bubble.x, by: overlay.bubble.y,
    };
    leavePath = `M${Math.round(mx)} ${Math.round(my)} L${HOLE_X} ${HOLE_Y}`;
    if (pi?.canPass && pi.pass) {
      const hiRight = sideBreak(brk) === 'hook';
      const passRight = pi.pass === 'high' ? hiRight : !hiRight;
      passMark = { x: passRight ? 207 : 143, color: pi.pass === 'low' ? C.low : C.gold };
    }
  }

  const dots = prevStops.map((e) => {
    const lp = toLocal({ x: e.gx, y: e.gy }, frame);
    return { n: e.n, x: Math.max(11, Math.min(BOARD_W - 11, px(lp.x))), y: Math.max(11, Math.min(BOARD_H - 11, py(lp.y))) };
  });

  const rings = BOARD_RINGS[R].map((m, i) => ({ m, r: Math.round(m * ppm), inner: i === 2 }));

  // 좌 · 우 사이드 버튼 — 라이가 훅 · 슬라이스일 때만 눌러서 "홀 옆을 지난 쪽"을 바꿀 수 있다
  const sideButton = (across) => {
    const sd = sideOf(brk, across);
    const idle = { disabled: true, on: false, sub: '', subColor: C.muted, bg: 'transparent', bd: 'transparent', bdStyle: 'solid', cursor: 'default', onClick: undefined };
    if (!sd) return { ...idle, text: across === 'left' ? '좌' : '우', color: C.ringLabel };
    const isLow = sd === 'low';
    const tone = isLow ? C.low : C.text;
    const text = isLow ? '로우사이드' : '하이사이드';
    if (!pi || !pi.canPass || !miss) return { ...idle, text, color: tone };
    const on = pi.pass === sd;
    const rec = pi.rest === sd;
    return {
      text, on, disabled: false, cursor: 'pointer',
      color: on ? tone : C.muted,
      bg: on ? (isLow ? C.lowBg : C.sel) : 'rgba(11,14,24,0.6)',
      bd: on ? (isLow ? C.low : C.gold) : '#3a5a53', bdStyle: on ? 'solid' : 'dashed',
      sub: rec ? (on ? '추천 · 선택됨' : '추천') : (on ? '직접 선택' : '눌러서 변경'),
      subColor: on ? (isLow ? C.low : C.gold) : C.muted,
      onClick: () => onChange?.(withPassOverride(miss, brk, frame, sd)),
    };
  };

  const resultText = shown
    ? `${missText({ across: shown.across, along: shown.along }, pi?.pass)}${!brk && shown.across !== 'line' ? ' (라이 선택 시 하이/로우)' : ''}`
    : '판을 탭해 공이 멈춘 곳을 찍으세요';
  const resultColor = pi?.pass === 'low' ? C.low : shown ? C.text : C.muted;

  return (
    <div data-role="putt-board-section">
      {/* 머리글 — 스코어 입력의 다른 섹션과 같은 모양, 오른쪽에 축척 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 8px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto' }}>
          <span style={iconStyle}>◎</span><span style={labelStyle}>미스 위치</span>
        </div>
        <div role="group" aria-label="판 축척" style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 12, background: C.card, border: `1px solid ${C.line}` }}>
          {BOARD_SCALES.map((v) => (
            <button key={v} type="button" data-role={`putt-scale-${v}`} aria-pressed={R === v} onClick={() => setScale(v)}
              style={{ minHeight: 40, minWidth: 46, padding: '0 6px', border: 0, borderRadius: 9, background: R === v ? C.sel : 'transparent', color: R === v ? C.gold : C.muted, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ±{ptLabel(v)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: BOARD_W, aspectRatio: `${BOARD_W} / ${BOARD_H}`, margin: '0 auto' }}>
        <button
          type="button" data-role="putt-board"
          aria-label="공이 멈춘 곳: 탭해서 지정, 드래그해서 미세 조정, 방향키로 10cm씩 이동"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} onKeyDown={onKey}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, boxSizing: 'border-box',
            border: `1px solid ${dragging ? C.gold : C.boardBorder}`, borderRadius: 18, background: C.board, overflow: 'hidden',
            cursor: dragging ? 'grabbing' : (stop ? 'grab' : 'crosshair'), fontFamily: 'inherit', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
            // 눌렀을 때 버튼 공통의 눌림 효과(전체가 줄어드는 것)는 판에서는 끈다 — 위치가 어긋난다
            transform: 'none', filter: 'none',
          }}
        >
          {rings.map((rg) => (
            <span key={rg.m} aria-hidden="true" style={{ ...centered(HOLE_X, HOLE_Y), width: pctX(rg.r * 2), aspectRatio: '1', borderRadius: '50%', border: `1px ${rg.inner ? 'solid' : 'dashed'} ${C.ring}`, boxSizing: 'border-box', background: rg.inner ? C.ringFill : 'transparent' }} />
          ))}
          <span aria-hidden="true" style={{ ...at(0, HOLE_Y), width: '100%', height: 1, background: C.axis }} />
          <span aria-hidden="true" style={{ ...at(HOLE_X, 0), width: 1, height: '100%', background: C.axis }} />
          {/* 눈금 글자는 오른쪽 위 대각선에 둔다 — 같은 높이의 좌·우 사이드 버튼과 라이 곡선(아래쪽)에 가리지 않는다 */}
          {rings.map((rg) => (
            <span key={`l${rg.m}`} aria-hidden="true" style={{ ...at(HOLE_X + rg.r * 0.7071 + 3, HOLE_Y - rg.r * 0.7071 - 16), fontSize: 12, fontWeight: 700, color: C.ringLabel }}>{ptLabel(rg.m)}</span>
          ))}
          <svg aria-hidden="true" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} fill="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <path d={`M175 ${ballY - 8} L175 168`} stroke={C.path} strokeWidth="1.5" strokeDasharray="4 4" />
            {liePath && <path d={liePath} stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" opacity="0.9" />}
            {leavePath && <path d={leavePath} stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />}
            <circle cx="175" cy={ballY} r="7" fill={C.ball} stroke={C.bg} strokeWidth="2" />
          </svg>
          <span style={{ ...at(12, 10), fontSize: 12, fontWeight: 700, color: C.text2 }}>↑ 롱 (지나침)</span>
          <span style={{ ...at(12, 292), fontSize: 12, fontWeight: 700, color: C.text2 }}>↓ 숏 (못 미침)</span>
          {passMark && (
            <svg aria-hidden="true" width="16" height="22" viewBox="0 0 16 22" fill="none" style={{ ...centered(passMark.x, 160) }}>
              <path d="M8 20V3" stroke={passMark.color} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M3 8l5-5 5 5" stroke={passMark.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span aria-hidden="true" style={{ ...at(189, Math.min(286, ballY - 9)), fontSize: 12, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{ballLabel}</span>
          {dragging && (
            <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 8, padding: '3px 8px', borderRadius: 8, background: C.sel, color: C.gold, fontSize: 12, fontWeight: 700 }}>{fine ? '미세 조정 0.5배' : '이동 중'}</span>
          )}
        </button>

        {dots.map((d) => (
          <span key={`d${d.n}`} aria-hidden="true" style={{ ...centered(d.x, d.y), width: 22, height: 22, borderRadius: '50%', background: C.line, color: C.text2, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', border: `1px solid ${C.muted}`, boxSizing: 'border-box' }}>{d.n}</span>
        ))}

        {onHoleIn && (
          <button type="button" data-role="putt-board-hole" aria-label="홀인 성공" onClick={onHoleIn}
            style={{ ...centered(HOLE_X, HOLE_Y), width: 36, height: 36, padding: 0, borderRadius: '50%', border: '2px solid #ffffff', background: '#000000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 21V4" /><path d="M7 4l11 4-11 4" /></svg>
          </button>
        )}

        {[['left', sideButton('left')], ['right', sideButton('right')]].map(([across, b]) => (
          <button key={across} type="button" data-role={`putt-side-${across}`} onClick={b.onClick} disabled={b.disabled} aria-pressed={b.on}
            style={{ position: 'absolute', [across]: 6, top: pctY(overlay ? overlay.sideY[across] : HOLE_Y), transition: 'top 0.15s ease-out', transform: 'translateY(-50%)', minWidth: 78, minHeight: 48, padding: '0 8px', boxSizing: 'border-box', borderRadius: 10, border: `1px ${b.bdStyle} ${b.bd}`, background: b.bg, color: b.color, fontFamily: 'inherit', cursor: b.cursor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>{b.text}</span>
            {b.sub && <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: b.subColor }}>{b.sub}</span>}
          </button>
        ))}

        {mk && (
          <>
            <span aria-hidden="true" style={{ ...centered(mk.x, mk.y), width: mk.size, height: mk.size, borderRadius: '50%', background: '#ffffff', border: `3px solid ${mk.ring}`, boxSizing: 'border-box', pointerEvents: 'none', boxShadow: dragging ? '0 0 0 6px rgba(201,162,40,0.25)' : 'none' }} />
            <span data-role="putt-leave-bubble" aria-hidden="true" style={{ ...centered(mk.bx, mk.by), minWidth: 60, boxSizing: 'border-box', padding: '3px 6px', textAlign: 'center', borderRadius: 8, background: C.gold, color: C.bg, fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.45)' }}>{fmtPutt(shown.leave, { digits: 1 })}</span>
          </>
        )}
      </div>
      <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>탭 = 멈춘 위치 · 끌기 = 미세 이동 · 좌우 사이드 버튼 = 홀 옆을 지난 쪽</div>

      {/* 결과 카드 */}
      <div data-role="putt-result" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, boxSizing: 'border-box', marginTop: 10, padding: '10px 14px', borderRadius: 12, border: `1px solid ${C.line}`, background: C.card }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: C.muted }}>미스 방향</span>
          <span data-role="putt-result-text" data-tone={pi?.pass === 'low' ? 'low' : 'normal'} style={{ fontSize: 17, fontWeight: 900, color: resultColor, wordBreak: 'keep-all' }}>{resultText}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: C.muted }}>남은 거리</span>
          <span data-role="putt-leave" style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>{shown ? fmtPutt(shown.leave, { digits: 1 }) : '—'}</span>
        </div>
      </div>
      {shown && (brk === 's-lr' || brk === 's-rl') && (
        <div data-role="putt-scurve-note" style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5, textAlign: 'center', wordBreak: 'keep-all' }}>
          S자는 홀 앞쪽 휨({brk === 's-lr' ? '우→좌' : '좌→우'}) 기준으로 하이·로우사이드를 계산해요. 다르면 좌우 사이드 버튼으로 바꿔 주세요.
        </div>
      )}
      {miss && (
        <button type="button" data-role="putt-clear-stop" onClick={() => onChange?.(null)}
          style={{ display: 'block', margin: '4px auto 0', padding: '10px 12px', background: 'none', border: 'none', color: C.muted, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
          찍은 위치 지우기
        </button>
      )}
    </div>
  );
}

