import { useState } from 'react';
import {
  GREEN_SPEED_BANDS, STIMP_DEFAULT, STIMP_MIN, STIMP_MAX, STIMP_STEP, clampSpeed, metersToStimp, speedBand, stimpToMeters, validSpeed,
} from '../../engine/greenSpeed.js';
import { isYards } from '../../engine/units.js';
import EmptyValue from '../ui/EmptyValue.jsx';
import { useSwipeAdjust, SWIPE_STYLE } from '../ui/useSwipeAdjust.js';

// 그날의 그린 스피드를 고르는 화면. 새 라운드 설정 · 라운드 중(퍼팅 화면) · 끝난 라운드 수정에서 같이 쓴다.
//   · 느낌으로 고르는 네 칸(느림·보통·빠름·매우 빠름) — 스팀프 수치를 몰라도 고를 수 있다
//   · 가운데 숫자를 옆으로 밀거나 −/+ 로 0.5ft / 0.1m씩 맞춘다 — 코스가 알려 주는 숫자를 그대로 넣는다
// 값은 항상 스팀프 피트로 저장한다(null = 설정 안 함). 단위 선택은 화면 표시만 바꾼다.

// 처음에는 미터로 보여 준다 (거리 단위 설정이 야드이면 피트). 한 번 고른 단위는 기억한다.
const UNIT_KEY = 'bb.greenSpeedUnit';
const readUnit = () => {
  const fallback = isYards() ? 'ft' : 'm';
  try {
    const saved = localStorage.getItem(UNIT_KEY);
    return saved === 'm' || saved === 'ft' ? saved : fallback;
  } catch { return fallback; }
};
const saveUnit = (u) => {
  try { localStorage.setItem(UNIT_KEY, u); } catch { /* 기억만 못 할 뿐 */ }
};

const GOLD = '#c9a228';
const round1 = (v) => Math.round(v * 10) / 10;
// 스팀프 피트 값을 고른 단위로 — 느낌으로 고르는 칸과 안내 문구에 쓴다
const speedText = (ft, unit) => (unit === 'ft' ? `${ft.toFixed(1)}ft` : `${round1(stimpToMeters(ft)).toFixed(1)}m`);
const PX_PER_STEP = 10;   // 옆으로 이만큼 밀 때마다 한 칸 (거리 칸보다 범위가 좁아서 더 천천히)

const chip = (active) => ({
  flex: 1, minWidth: 0, padding: '10px 2px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
  border: `1.5px solid ${active ? GOLD : '#252f4a'}`,
  background: active ? 'rgba(201,162,40,0.18)' : '#1a2235',
  color: active ? GOLD : '#e8edf8',
});
const stepBtn = {
  width: 44, height: 44, borderRadius: 12, border: '1px solid #252f4a', background: '#111827',
  color: '#e8edf8', fontSize: 22, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
};

export default function GreenSpeedPicker({ value, onChange }) {
  const [unit, setUnit] = useState(readUnit);
  const speed = validSpeed(value) ? value : null;
  const band = speedBand(speed);

  const pickUnit = (u) => { setUnit(u); saveUnit(u); };
  const step = (dir) => {
    const base = speed ?? STIMP_DEFAULT;
    if (unit === 'ft') onChange(clampSpeed(base + dir * STIMP_STEP));
    else onChange(metersToStimp(round1(round1(stimpToMeters(base)) + dir * 0.1)));
  };

  // 밀어서 맞추기 — 고른 단위의 숫자로 계산하고(피트 0.5 · 미터 0.1 칸), 저장은 스팀프 피트로 바꿔서 한다
  const unitStep = unit === 'ft' ? STIMP_STEP : 0.1;
  const inUnit = (ft) => (unit === 'ft' ? ft : round1(stimpToMeters(ft)));
  const snap = (v) => Math.max(inUnit(STIMP_MIN), Math.min(inUnit(STIMP_MAX), round1(Math.round(v / unitStep) * unitStep)));
  const startAtDefault = () => { if (speed == null) onChange(STIMP_DEFAULT); };
  const { active, bind } = useSwipeAdjust({
    base: inUnit(speed ?? STIMP_DEFAULT), step: unitStep, clamp: snap, pxPerStep: PX_PER_STEP,
    onChange: (v) => onChange(unit === 'ft' ? clampSpeed(v) : metersToStimp(v)),
    onTap: startAtDefault,
  });

  const mainText = speed == null ? null : unit === 'ft' ? speed.toFixed(1) : round1(stimpToMeters(speed)).toFixed(1);
  const subText = speed == null ? null : unit === 'ft'
    ? `약 ${round1(stimpToMeters(speed)).toFixed(1)}m`
    : `스팀프 ${speed.toFixed(1)}피트`;

  return (
    <div data-role="green-speed-picker">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {GREEN_SPEED_BANDS.map((b) => {
          const on = band?.id === b.id;
          return (
            <button key={b.id} type="button" data-role={`gs-preset-${b.id}`} aria-pressed={on}
              style={chip(on)} onClick={() => onChange(b.preset)}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{b.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: on ? GOLD : '#8896b0' }}>{speedText(b.preset, unit)}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" data-role="gs-minus" aria-label="그린 스피드 낮추기" style={stepBtn} onClick={() => step(-1)}>−</button>
        {/* 가운데 숫자: 옆으로 밀면 값이 바뀌고, 비어 있을 때 탭하면 보통 값부터 시작한다 (키보드는 Enter 로) */}
        <button type="button" data-role="gs-value" {...bind}
          onClick={(e) => { if (e.detail === 0) startAtDefault(); }}
          style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '4px 0', border: 'none', borderRadius: 8, ...SWIPE_STYLE,
            background: active ? 'rgba(201,162,40,0.06)' : 'transparent', transition: 'background 0.15s', color: 'inherit', font: 'inherit' }}>
          {speed == null
            ? <EmptyValue height={30} />
            : <>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#e8edf8', lineHeight: 1 }}>{mainText}</span>
              <span style={{ fontSize: 14, color: '#8896b0', marginLeft: 4 }}>{unit === 'ft' ? 'ft' : 'm'}</span>
            </>}
          <div style={{ fontSize: 13, color: '#8896b0', marginTop: 4 }}>
            {speed == null
              ? <><span style={{ whiteSpace: 'nowrap' }}>탭하면</span> <span style={{ whiteSpace: 'nowrap' }}>보통({unit === 'ft' ? `스팀프 ${STIMP_DEFAULT.toFixed(1)}` : speedText(STIMP_DEFAULT, unit)})부터</span></>
              : `${subText}${band ? ` · ${band.label}` : ''}`}
          </div>
          <div data-role="gs-swipe-hint" style={{ fontSize: 12, color: '#6e84a8', marginTop: 3, letterSpacing: '0.06em' }}>
            ← 밀어서 {speed == null ? '' : `${unit === 'ft' ? '0.5ft' : '0.1m'} 단위 `}조정 →
          </div>
        </button>
        <button type="button" data-role="gs-plus" aria-label="그린 스피드 높이기" style={stepBtn} onClick={() => step(1)}>+</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div role="group" aria-label="단위" style={{ display: 'flex', gap: 2, background: '#0d1425', borderRadius: 999, padding: 2 }}>
          {[['m', '미터'], ['ft', '피트(스팀프)']].map(([u, l]) => (
            <button key={u} type="button" data-role={`gs-unit-${u}`} aria-pressed={unit === u} onClick={() => pickUnit(u)}
              style={{
                border: 'none', cursor: 'pointer', borderRadius: 999, padding: '4px 10px', fontSize: 13, fontWeight: 700,
                background: unit === u ? GOLD : 'transparent', color: unit === u ? '#0b0e18' : '#8896b0',
              }}>{l}</button>
          ))}
        </div>
        {speed != null && (
          <button type="button" data-role="gs-clear" onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', color: '#8896b0', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}>
            설정 안 함
          </button>
        )}
      </div>
    </div>
  );
}
