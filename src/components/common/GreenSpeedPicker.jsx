import { useState } from 'react';
import {
  GREEN_SPEED_BANDS, STIMP_DEFAULT, STIMP_STEP, clampSpeed, metersToStimp, speedBand, stimpToMeters, validSpeed,
} from '../../engine/greenSpeed.js';

// 그날의 그린 스피드를 고르는 화면. 새 라운드 설정 · 라운드 중(퍼팅 화면) · 끝난 라운드 수정에서 같이 쓴다.
//   · 느낌으로 고르는 네 칸(느림·보통·빠름·매우 빠름) — 스팀프 수치를 몰라도 고를 수 있다
//   · 스팀프 피트 또는 미터로 0.5ft / 0.1m씩 맞추는 스테퍼 — 코스가 알려 주는 숫자를 그대로 넣는다
// 값은 항상 스팀프 피트로 저장한다(null = 설정 안 함). 단위 선택은 화면 표시만 바꾼다.

const UNIT_KEY = 'bb.greenSpeedUnit';
const readUnit = () => {
  try { return localStorage.getItem(UNIT_KEY) === 'm' ? 'm' : 'ft'; } catch { return 'ft'; }
};
const saveUnit = (u) => {
  try { localStorage.setItem(UNIT_KEY, u); } catch { /* 기억만 못 할 뿐 */ }
};

const GOLD = '#c9a228';
const round1 = (v) => Math.round(v * 10) / 10;

const chip = (active) => ({
  flex: 1, minWidth: 0, padding: '10px 2px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
  border: `1.5px solid ${active ? GOLD : '#252f4a'}`,
  background: active ? 'rgba(201,162,40,0.18)' : '#1a2235',
  color: active ? GOLD : '#e8edf8',
});
const stepBtn = {
  width: 44, height: 44, borderRadius: 10, border: '1px solid #252f4a', background: '#111827',
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

  const mainText = speed == null ? '—' : unit === 'ft' ? speed.toFixed(1) : round1(stimpToMeters(speed)).toFixed(1);
  const subText = speed == null ? null : unit === 'ft'
    ? `약 ${round1(stimpToMeters(speed)).toFixed(1)}m`
    : `스팀프 ${speed.toFixed(1)}피트`;

  return (
    <div data-role="green-speed-picker">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {GREEN_SPEED_BANDS.map((b) => {
          const active = band?.id === b.id;
          return (
            <button key={b.id} type="button" data-role={`gs-preset-${b.id}`} aria-pressed={active}
              style={chip(active)} onClick={() => onChange(b.preset)}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{b.label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2, color: active ? GOLD : '#8896b0' }}>{b.preset.toFixed(1)}ft</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" data-role="gs-minus" aria-label="그린 스피드 낮추기" style={stepBtn} onClick={() => step(-1)}>−</button>
        <button type="button" data-role="gs-value" onClick={() => speed == null && onChange(STIMP_DEFAULT)}
          style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '4px 0', background: 'transparent', border: 'none', cursor: speed == null ? 'pointer' : 'default' }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: speed == null ? '#4d5a78' : '#e8edf8', lineHeight: 1 }}>{mainText}</span>
          <span style={{ fontSize: 13, color: '#8896b0', marginLeft: 4 }}>{unit === 'ft' ? 'ft' : 'm'}</span>
          <div style={{ fontSize: 11, color: '#8896b0', marginTop: 4 }}>
            {speed == null ? '탭하면 보통(스팀프 9.0)부터 시작' : `${subText}${band ? ` · ${band.label}` : ''}`}
          </div>
        </button>
        <button type="button" data-role="gs-plus" aria-label="그린 스피드 높이기" style={stepBtn} onClick={() => step(1)}>+</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div role="group" aria-label="단위" style={{ display: 'flex', gap: 2, background: '#0d1425', borderRadius: 999, padding: 2 }}>
          {[['ft', '피트(스팀프)'], ['m', '미터']].map(([u, l]) => (
            <button key={u} type="button" data-role={`gs-unit-${u}`} aria-pressed={unit === u} onClick={() => pickUnit(u)}
              style={{
                border: 'none', cursor: 'pointer', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                background: unit === u ? GOLD : 'transparent', color: unit === u ? '#0b0e18' : '#8896b0',
              }}>{l}</button>
          ))}
        </div>
        {speed != null && (
          <button type="button" data-role="gs-clear" onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', color: '#8896b0', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}>
            설정 안 함
          </button>
        )}
      </div>
    </div>
  );
}
