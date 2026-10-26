import { useState } from 'react';
import { COLOR } from '../stats/format.js';
import { toDisplay, fromDisplay, unitLabel } from '../../engine/units.js';

// 거리 입력: [−5][−1] 숫자 [+1][+5]. 숫자를 눌러 직접 쓸 수도 있다 (쓰는 동안은 저장하지 않고, 칸을 벗어나거나 Enter 에서 저장).
// 마이백의 클럽 편집 칸과 등록 화면(거리 맞추기)이 함께 쓴다.
// 값(value · onChange)은 늘 미터다. 거리 단위 설정이 야드이면 야드로 보이고 입력하며, 미터로 바꿔 돌려준다.

export const MAX_M = 350;

export default function DistanceField({ label, sub, value, onChange, id, color }) {
  const [draft, setDraft] = useState(null);   // 쓰는 중인 글자 (null 이면 value 를 보여 준다)
  const u = unitLabel('shot');
  const maxD = Math.round(toDisplay(MAX_M, 'shot'));
  const v = Math.round(toDisplay(value ?? 0, 'shot'));   // 화면에 보이는 값 (표시 단위의 정수)
  // 보이는 값이 그대로면 저장된 값을 건드리지 않는다 — 야드로 한 번 눌러 봤다 되돌려도 미터 값이 소수로 바뀌지 않게
  const emit = (n) => { const next = Math.max(0, Math.min(maxD, n)); if (next !== v) onChange(fromDisplay(next, 'shot')); };
  const commit = () => {
    if (draft == null) return;
    const n = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(n)) emit(n);
  };
  const step = (d) => emit(v + d);
  const btn = (d, text) => (
    <button type="button" aria-label={`${label} ${d > 0 ? '+' : ''}${d}${u}`} data-role={`${id}-${d > 0 ? 'up' : 'down'}${Math.abs(d)}`}
      disabled={(d < 0 && v <= 0) || (d > 0 && v >= maxD)} onClick={() => step(d)}
      style={{ width: 'clamp(30px, 9.5vw, 40px)', height: 44, borderRadius: 10, border: `1px solid ${COLOR.line}`, background: '#131c30', color: COLOR.muted, fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0, padding: 0, opacity: (d < 0 && v <= 0) || (d > 0 && v >= maxD) ? 0.35 : 1 }}>{text}</button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 'clamp(42px, 12.5vw, 46px)', flexShrink: 0, textAlign: 'left' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color }}>{label}</div>
        <div style={{ fontSize: 12, color: COLOR.faint, letterSpacing: '0.02em' }}>{sub}</div>
      </div>
      {btn(-5, '−5')}{btn(-1, '−1')}
      <label style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2, height: 44, borderRadius: 10, background: '#0b0e18', border: `1px solid ${COLOR.line}` }}>
        <input type="text" inputMode="numeric" aria-label={`${label} 거리(${u})`} data-role={`${id}-input`}
          value={draft ?? String(v)}
          onFocus={(e) => { setDraft(String(v)); e.target.select(); }}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{ width: 'clamp(34px, 11vw, 46px)', border: 'none', background: 'transparent', color: COLOR.text, fontSize: 19, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums', outline: 'none', padding: 0, alignSelf: 'center' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: COLOR.muted, alignSelf: 'center' }}>{u}</span>
      </label>
      {btn(1, '+1')}{btn(5, '+5')}
    </div>
  );
}
