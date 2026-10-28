import EmptyValue from './EmptyValue.jsx';
import { useSwipeAdjust, SWIPE_STYLE } from './useSwipeAdjust.js';
import { isYards, unitInfo, unitLabel, fromDisplay } from '../../engine/units.js';

const fMiniBtn = { width:44, height:44, borderRadius: 12, border:'1px solid #252f4a', background:'#111827', color:'#e8edf8', fontSize:18, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' };

// 거리를 맞추는 칸 — 스코어 입력(티샷 · 남은 거리 · 퍼팅)과 설정(첫 퍼팅 기본 거리)이 같이 쓴다.
//
// value가 null이면 '미입력'으로 보여주고 아무것도 저장하지 않는다. 눈대중 기본값을
// 그대로 저장하면 실제와 다른 거리가 통계에 섞이기 때문 — 입력하지 않은 거리는
// 비워 두는 편이 낫다. start는 처음 조작할 때의 출발값(가운데를 탭하면 이 값으로 입력).
//
// 손가락 동작(가로로 끌기 · 세로 스크롤 · 탭)은 ui/useSwipeAdjust.js — 그린 스피드 선택기와 같이 쓴다.

// 숫자 아래 가로 슬라이더 — 엄지로 쓸어서 크게 맞추고, 정밀하게는 −/+ 와 숫자 밀기로 한다.
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
  const hint = empty && (
    <div data-role="dist-hint" style={{ fontSize: 13, color: '#8896b0', marginTop: withSlider ? 0 : 4, padding: withSlider ? '2px 0 6px' : 0, textAlign: 'center', ...(withSlider ? SWIPE_STYLE : null) }}
      {...(withSlider ? bind : null)}>
      탭하면 {clamp(base)}{unit}부터 · 밀어서 조정
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button style={fMiniBtn} onClick={() => onChange(clamp(base - step))}>−</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          data-role="dist-value"
          style={{ textAlign: 'center', padding: '8px 0', ...SWIPE_STYLE, background: active ? 'rgba(201,162,40,0.06)' : 'transparent', borderRadius: 8, transition: 'background 0.15s' }}
          {...bind}
        >
          {empty
            ? <EmptyValue />
            : <><span style={{ fontSize: 34, fontWeight: 900, color: '#e8edf8', lineHeight: 1 }}>{display}</span><span style={{ fontSize: 14, color: '#8896b0', marginLeft: 4 }}>{unit}</span></>}
          {!withSlider && hint}
        </div>
        {withSlider && <DistanceSlider value={base} empty={empty} min={min} max={sliderMax} step={step} onChange={(v) => onChange(clamp(v))} />}
        {withSlider && hint}
      </div>
      <button style={fMiniBtn} onClick={() => onChange(clamp(base + step))}>+</button>
    </div>
  );
}
