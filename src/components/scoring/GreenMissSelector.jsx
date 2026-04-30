import React from 'react';

const S = 200;
const CX = S / 2;
const CY = S / 2;
const R = 88;

function polar(deg, r = R) {
  const rad = (deg - 90) * (Math.PI / 180);
  return {
    x: +(CX + r * Math.cos(rad)).toFixed(3),
    y: +(CY + r * Math.sin(rad)).toFixed(3),
  };
}

function sectorPath(startDeg, endDeg) {
  const s = polar(startDeg);
  const e = polar(endDeg);
  return `M ${CX} ${CY} L ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y} Z`;
}

// 방향: 0°=top(LONG), 90°=right(RIGHT), 180°=bottom(SHORT), 270°=left(LEFT)
const SECTORS = [
  { id: 'long',  label: 'LONG',  start: 315, end: 45,  lAngle: 0   },
  { id: 'right', label: 'RIGHT', start: 45,  end: 135, lAngle: 90  },
  { id: 'short', label: 'SHORT', start: 135, end: 225, lAngle: 180 },
  { id: 'left',  label: 'LEFT',  start: 225, end: 315, lAngle: 270 },
];

const ACTIVE_COLOR  = '#4cae7a';
const BASE_COLORS   = ['#1f5e3a', '#1a5233'];

export default function GreenMissSelector({ value, onChange, stats }) {
  const isDisplay = !!stats;

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: isDisplay ? 260 : 210,
        display: 'block',
        margin: '0 auto',
      }}
    >
      <defs>
        <clipPath id="gcClip">
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>

      {/* 기본 원 배경 */}
      <circle cx={CX} cy={CY} r={R} fill="#1f5e3a" />

      {SECTORS.map((sec, i) => {
        const isActive = value === sec.id;
        const lp = polar(sec.lAngle, R * 0.56);

        let fill;
        if (isActive) {
          fill = ACTIVE_COLOR;
        } else if (isDisplay && stats.total > 0) {
          const ratio = (stats[sec.id] || 0) / stats.total;
          const l = 22 + ratio * 22;
          fill = `hsl(150, 52%, ${l}%)`;
        } else {
          fill = BASE_COLORS[i % 2];
        }

        const pct = isDisplay && stats.total > 0
          ? Math.round(((stats[sec.id] || 0) / stats.total) * 100)
          : null;

        // 상하/좌우에 따른 텍스트 y 오프셋 조정
        const isTop    = sec.lAngle === 0;
        const isBottom = sec.lAngle === 180;
        const isHoriz  = !isTop && !isBottom;

        const labelY     = isDisplay
                         ? (isTop || isBottom ? lp.y - 14 : lp.y - 16)
                         : lp.y + 4;
        const pctY       = isTop ? lp.y + 4  : isBottom ? lp.y + 4  : lp.y + 2;
        const countY     = isTop ? lp.y + 19 : isBottom ? lp.y + 19 : lp.y + 17;

        return (
          <g key={sec.id}>
            <path
              d={sectorPath(sec.start, sec.end)}
              fill={fill}
              clipPath="url(#gcClip)"
              style={{ cursor: onChange ? 'pointer' : 'default', transition: 'fill 0.18s' }}
              onClick={() => onChange && onChange(isActive ? null : sec.id)}
            />

            {/* 방향 라벨 */}
            <text
              x={lp.x} y={labelY}
              textAnchor="middle"
              fill={isActive ? '#fff' : 'rgba(255,255,255,0.9)'}
              fontSize={isDisplay ? 11 : 13}
              fontWeight="700"
              fontFamily="'Noto Sans KR', sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {sec.label}
            </text>

            {/* 퍼센트 (인사이트 표시 모드) */}
            {isDisplay && pct !== null && (
              <text
                x={lp.x} y={pctY}
                textAnchor="middle"
                fill="rgba(255,255,255,0.95)"
                fontSize="15"
                fontWeight="700"
                fontFamily="'Noto Sans KR', sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                {pct}%
              </text>
            )}

            {/* 횟수 (인사이트 표시 모드) */}
            {isDisplay && (
              <text
                x={lp.x} y={countY}
                textAnchor="middle"
                fill="rgba(255,255,255,0.55)"
                fontSize="9"
                fontFamily="'Noto Sans KR', sans-serif"
                style={{ pointerEvents: 'none' }}
              >
                ({stats[sec.id] || 0}회)
              </text>
            )}
          </g>
        );
      })}

      {/* 바깥 테두리 */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2"
      />

      {/* 45° 대각선 구분선 (황금 점선) */}
      {[45, 135, 225, 315].map(deg => {
        const p = polar(deg, R - 1);
        return (
          <line
            key={deg}
            x1={CX} y1={CY}
            x2={p.x} y2={p.y}
            stroke="rgba(255,210,80,0.65)"
            strokeWidth="1.5"
            strokeDasharray="5,4"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* 중앙 깃대 마커 */}
      <g style={{ pointerEvents: 'none' }}>
        <circle cx={CX} cy={CY} r={10} fill="#0d1f16" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <line x1={CX} y1={CY - 7} x2={CX} y2={CY + 7} stroke="#d0cfc8" strokeWidth="1.5" strokeLinecap="round" />
        <polygon points={`${CX},${CY - 7} ${CX + 7},${CY - 4} ${CX},${CY - 1}`} fill="#c04a3e" />
      </g>

      {/* 선택 시 하이라이트 링 */}
      {value && onChange && (
        <circle
          cx={CX} cy={CY} r={R - 2}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
