import { useId } from 'react';
import { LANDING_HOURS, QUADRANTS, quadrantOf, landingHour } from '../../engine/landing.js';
import { CENTER, fix, hourAngle, pol, arcPath, sectorPath, KEY_NAME, QUADRANT_NAME } from '../ui/polar.js';
import FlagMark from '../ui/FlagMark';

// 온그린 랜딩 방향 입력 — 핀을 가운데 두고 공이 멈춘 쪽을 누르는 12조각 휠.
// value 는 1~12(시) 또는 null. 같은 조각을 다시 누르면 해제한다.
const WI = 62;    // 조각 안쪽 반지름
const WO = 136;   // 조각 바깥 반지름
const QUADRANT_CENTER = { long: 0, right: 90, short: 180, left: 270 };

const nameOf = (hour) => KEY_NAME[hour] ?? `${QUADRANT_NAME[quadrantOf(hour)]} 쪽`;

export default function LandingWheel({ value, onChange }) {
  const uid = useId().replace(/:/g, '');
  const sel = landingHour(value);
  const selQuadrant = sel ? quadrantOf(sel) : null;
  const toggle = (hour) => onChange(sel === hour ? null : hour);

  return (
    <svg
      viewBox="0 0 340 340"
      role="group"
      aria-label="온그린 랜딩 방향 선택"
      data-role="landing-wheel"
      style={{ display: 'block', width: '100%', maxWidth: 320, margin: '0 auto', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8e08a" />
          <stop offset="1" stopColor="#c9a228" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 바깥의 방향 호 — 고른 조각이 속한 방향(롱·라이트·숏·레프트)이 금색으로 켜진다 */}
      {QUADRANTS.map((q) => {
        const on = selQuadrant === q, c = QUADRANT_CENTER[q];
        return (
          <path key={q} d={arcPath(WO + 12, c - 42, c + 42)} fill="none" strokeWidth="3" strokeLinecap="round"
            stroke={on ? '#f3d36b' : '#252f4a'} filter={on ? `url(#${uid}-glow)` : undefined} />
        );
      })}

      {LANDING_HOURS.map((h) => {
        const d = hourAngle(h), on = sel === h, key = !!KEY_NAME[h];
        const fill = on ? `url(#${uid}-gold)` : key ? '#1a2644' : '#131b2f';
        const p = pol((WI + WO) / 2, d);
        return (
          <g key={h}>
            <path d={sectorPath(WI + 3, WO - 3, d - 12.6, d + 12.6)} fill={fill}
              stroke={on ? '#e8c64e' : key ? '#1a2644' : '#131b2f'} strokeWidth="6" strokeLinejoin="round"
              filter={on ? `url(#${uid}-glow)` : undefined} />
            {key ? (
              <>
                <text x={fix(p[0])} y={fix(p[1] - 6)} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="900"
                  letterSpacing="0.06em" fill={on ? '#1a1405' : '#e8edf8'}>{KEY_NAME[h]}</text>
                <text x={fix(p[0])} y={fix(p[1] + 9)} textAnchor="middle" dominantBaseline="central" fontSize="11"
                  fill={on ? 'rgba(26,20,5,0.7)' : '#8aa0c4'}>{h}시</text>
              </>
            ) : (
              <text x={fix(p[0])} y={fix(p[1])} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="900"
                fill={on ? '#1a1405' : '#8896b0'}>{h}</text>
            )}
          </g>
        );
      })}

      {/* 가운데: 고른 시각, 아직 없으면 깃발 */}
      <circle cx={CENTER} cy={CENTER} r={WI - 9} fill="#0e1c14" stroke="rgba(61,184,122,0.55)" strokeWidth="1.5" />
      {sel ? (
        <>
          <text x={CENTER} y="163" textAnchor="middle" dominantBaseline="central" fontSize="25" fontWeight="900" fill="#f3d36b"
            data-role="landing-wheel-hour">{sel}시</text>
          <text x={CENTER} y="187" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" letterSpacing="0.06em" fill="#8896b0">{nameOf(sel)}</text>
        </>
      ) : (
        <>
          <FlagMark x={163} y={166} k={1.05} />
          <text x={CENTER} y="203" textAnchor="middle" fontSize="11" fill="#8aa0c4">탭해서 선택</text>
        </>
      )}

      {/* 누르는 영역: 조각보다 넉넉하게 */}
      {LANDING_HOURS.map((h) => {
        const d = hourAngle(h);
        return (
          <g key={h} role="button" tabIndex={0} data-role="landing-zone" data-hour={h}
            aria-pressed={sel === h} aria-label={`${h}시 방향 ${nameOf(h)}`}
            style={{ cursor: 'pointer', outline: 'none' }}
            onClick={() => toggle(h)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(h); } }}>
            <path d={sectorPath(WI - 6, WO + 22, d - 15, d + 15)} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}
