import { useEffect, useRef } from 'react';
import EmptyValue from './EmptyValue.jsx';
import { useSwipeAdjust, SWIPE_STYLE } from './useSwipeAdjust.js';
import { isYards, unitInfo, unitLabel, fromDisplay } from '../../engine/units.js';

const fMiniBtn = { width:44, height:44, borderRadius: 12, border:'1px solid #252f4a', background:'#111827', color:'#e8edf8', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink: 0, touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' };

// 거리 칸 −/+ 버튼 — 한 번 누르면 한 칸, 길게 누르면 계속 바뀐다 (처음 0.45초는 한 칸만, 그 뒤 0.09초마다 · 오래 누를수록 큰 폭으로).
// onStep(cur) 은 지금 값(cur)에서 한 칸 옮긴 값을 돌려주고, 더 못 가면(끝) 같은 값을 돌려준다 — 그러면 반복을 멈춘다.
//   cur 는 눌러 둔 동안 이 안에서 따로 이어 간다 (부모가 새 값을 돌려주길 기다리지 않는다).
const HOLD_DELAY = 450;
const HOLD_TICK = 90;
const HOLD_BOOST = [[0, 1], [12, 2], [24, 4]];   // [몇 번째 반복부터, 몇 칸씩]
function RepeatButton({ label, dir, base, step, clamp, onChange }) {
  const timers = useRef({ delay: null, tick: null });
  const held = useRef(false);        // 길게 눌러 반복했다 — 손을 뗄 때 따라오는 click 을 삼킨다
  const latest = useRef({ base, step, clamp, onChange });
  useEffect(() => { latest.current = { base, step, clamp, onChange }; });

  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.tick);
    timers.current = { delay: null, tick: null };
  };
  useEffect(() => stop, []);

  const start = () => {
    held.current = false;
    stop();
    timers.current.delay = setTimeout(() => {
      held.current = true;
      let cur = latest.current.base;
      let n = 0;
      timers.current.tick = setInterval(() => {
        const { step: st, clamp: cl, onChange: set } = latest.current;
        const mult = [...HOLD_BOOST].reverse().find(([from]) => n >= from)[1];
        const next = cl(cur + dir * st * mult);
        n += 1;
        if (next === cur) { stop(); return; }
        cur = next;
        set(next);
      }, HOLD_TICK);
    }, HOLD_DELAY);
  };

  const release = () => { stop(); setTimeout(() => { held.current = false; }, 120); };   // 뗀 뒤에 오는 click 까지는 표시를 남겨 둔다
  const abort = () => { stop(); held.current = false; };                               // 취소 — click 이 따라오지 않는다
  // 버튼 밖으로 손가락(마우스)이 벗어나도 떼는 순간을 이 버튼이 받도록 포인터를 붙잡아 둔다 — 반복이 멈추지 않는 일이 없게
  const press = (ev) => {
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* 지원하지 않으면 그냥 진행 */ }
    start();
  };

  return (
    <button type="button" aria-label={label} style={fMiniBtn}
      onPointerDown={press} onPointerUp={release} onPointerCancel={abort}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (held.current) { held.current = false; return; }
        const { base: b, step: st, clamp: cl, onChange: set } = latest.current;
        set(cl(b + dir * st));
      }}>
      {dir < 0 ? '−' : '+'}
    </button>
  );
}

// 거리를 맞추는 칸 — 스코어 입력(티샷 · 남은 거리 · 퍼팅)과 설정(첫 퍼팅 기본 거리)이 같이 쓴다.
//
// value가 null이면 '미입력'으로 보여주고 아무것도 저장하지 않는다. 눈대중 기본값을
// 그대로 저장하면 실제와 다른 거리가 통계에 섞이기 때문 — 입력하지 않은 거리는
// 비워 두는 편이 낫다. start는 처음 조작할 때의 출발값(가운데를 탭하면 이 값으로 입력).
//
// 손가락 동작(가로로 끌기 · 세로 스크롤 · 탭)은 ui/useSwipeAdjust.js — 그린 스피드 선택기와 같이 쓴다.

// 숫자 아래 가로 슬라이더 — 엄지로 쓸어서 크게 맞추고, 정밀하게는 −/+ (길게 누르기) 와 숫자 밀기로 한다.
// 슬라이더는 −/+ 버튼 아래로 칸 전체 폭을 쓴다 (좁은 폭에서 1px 이 몇 m 인지가 맞추기 쉬운지를 정한다).
// 슬라이더는 흔히 쓰는 범위(sliderMax 까지)만 덮는다. 그보다 큰 값은 오른쪽 끝에 붙어 보이고, 입력은 −/+ · 숫자 밀기로 계속 된다.
// 값이 비어 있는 동안은 흐린 손잡이(출발값 자리)만 보이고, 건드려야 값이 들어간다 — 눈대중 기본값이 저장되지 않게.
function DistanceSlider({ value, empty, min, max, step, onChange }) {
  const at = Math.max(min, Math.min(max, value));
  return (
    <input
      type="range" className="dist-slider" data-role="dist-slider" data-empty={empty ? '1' : '0'}
      aria-label="거리 슬라이더" min={min} max={max} step={step} value={at}
      style={{ '--frac': (at - min) / (max - min) }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

// kind('shot'|'putt')를 주면 거리 단위 설정을 따른다 — 야드 모드에서는 야드(퍼트는 피트)로 보이고 조절하며, onChange 에는
// 늘 미터를 돌려준다. 받는 value·start·min·max·sliderMax 도 미터다 (engine/units.js).
// sliderMax 를 주면 숫자 아래에 슬라이더가 붙는다 (바람 세기처럼 거리가 아닌 칸은 주지 않는다).
export default function SwipeDistance({ value: valueM, start: startM, min: minM = 1, max: maxM = 300, sliderMax: sliderMaxM = null, onChange: onChangeM, step: stepM = 1, decimals: decimalsM = 0, unit: unitM = 'm', kind = null }) {
  const conv = kind != null && isYards();
  const f = conv ? unitInfo()[`${kind}F`] : 1;
  const inView = (v) => (v == null || !conv ? v : Math.round(v * f));
  const value = inView(valueM);
  const start = inView(startM);
  const min = conv ? Math.max(1, Math.round(minM * f)) : minM;
  const max = conv ? Math.round(maxM * f) : maxM;
  const step = conv ? 1 : stepM;
  const decimals = conv ? 0 : decimalsM;
  const unit = conv ? unitLabel(kind) : unitM;
  const onChange = (v) => onChangeM(conv ? fromDisplay(v, kind, 'yd') : v);
  const clamp = v => parseFloat(Math.max(min, Math.min(max, Math.round(v / step) * step)).toFixed(decimals));
  const empty = value == null;
  const base = empty ? (start ?? min) : value;
  const { active, bind } = useSwipeAdjust({ base, step, clamp, onChange, onTap: () => { if (empty) onChange(clamp(base)); } });   // 미입력 칸을 탭 → 출발값으로 입력

  const display = empty ? null : (decimals > 0 ? Number(value).toFixed(decimals) : Math.round(value));
  const sliderMax = sliderMaxM == null ? null : Math.min(max, conv ? Math.round(sliderMaxM * f) : sliderMaxM);
  const withSlider = sliderMax != null && sliderMax > min;
  // 슬라이더가 있을 때 힌트 줄은 손가락이 닿기 쉽게 44px 높이로 — 탭하면 출발값이 들어간다
  const hint = empty && (
    <div data-role="dist-hint" style={{ fontSize: 13, color: '#8896b0', marginTop: withSlider ? 0 : 4, padding: withSlider ? '0 0 4px' : 0, textAlign: 'center', ...(withSlider ? { ...SWIPE_STYLE, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' } : null) }}
      {...(withSlider ? bind : null)}>
      탭하면 {clamp(base)}{unit}부터 · 밀어서 조정
    </div>
  );
  const adjust = { base, step, clamp, onChange };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <RepeatButton label="줄이기" dir={-1} {...adjust} />
        <div
          data-role="dist-value"
          style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 0', ...SWIPE_STYLE, background: active ? 'rgba(201,162,40,0.06)' : 'transparent', borderRadius: 8, transition: 'background 0.15s' }}
          {...bind}
        >
          {empty
            ? <EmptyValue />
            : <><span style={{ fontSize: 34, fontWeight: 900, color: '#e8edf8', lineHeight: 1 }}>{display}</span><span style={{ fontSize: 14, color: '#8896b0', marginLeft: 4 }}>{unit}</span></>}
          {!withSlider && hint}
        </div>
        <RepeatButton label="늘리기" dir={1} {...adjust} />
      </div>
      {withSlider && <DistanceSlider value={base} empty={empty} min={min} max={sliderMax} step={step} onChange={(v) => onChange(clamp(v))} />}
      {withSlider && hint}
    </div>
  );
}
