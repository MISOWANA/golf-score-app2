import { useId } from 'react';
import { fmtPutt } from '../../engine/units.js';
import { COLOR } from './format.js';

// 숏게임 탄착 과녁 — 핀을 가운데 두고, 80m 안 샷이 그린에 올라 멈춘 자리를 점으로 찍는다.
// 위가 롱(핀 너머), 아래가 숏, 오른쪽이 라이트 — 랜딩 휠과 같은 방향이다. 동심원은 핀까지 거리(눈금은 샷에 맞춰 달라진다).
// 흰 점이 평균 위치(쏠림), 점선 타원이 흩어짐(±1표준편차)이다. 어느 쪽이 좋다고 색으로 말하지 않는다.
// 글자는 320px 폭에서도 읽히도록 크게 잡았다 (그림이 줄어드는 만큼 작아진다).
const C = 170;            // 가운데
const R = 100;            // 가장 바깥 눈금의 반지름
const LABEL_R = 140;      // 방향 이름 · 비율 글자 자리

const DIRS = [
  { id: 'long', name: 'LONG', dx: 0, dy: -1 },
  { id: 'right', name: 'RIGHT', dx: 1, dy: 0 },
  { id: 'short', name: 'SHORT', dx: 0, dy: 1 },
  { id: 'left', name: 'LEFT', dx: -1, dy: 0 },
];

const fix = (n) => +n.toFixed(1);

export default function ShortGameTarget({ pattern }) {
  const uid = useId().replace(/:/g, '');
  const { shots, scale, q, n, top, mean, spread } = pattern;
  if (!n) return null;

  const k = R / scale.max;
  // 눈금 밖으로 나간 점은 가장자리에 붙인다 (이상치가 눈금을 늘리지 못하게 막은 상한과 짝이다)
  const place = (x, y) => {
    const d = Math.hypot(x, y) * k;
    const f = d > R ? R / d : 1;
    return [C + x * k * f, C - y * k * f];
  };
  const [mx, my] = place(mean.x, mean.y);
  const pctOf = (id) => Math.round((q[id] / n) * 100);
  const ringText = (m) => fmtPutt(m, { digits: Number.isInteger(m) ? 0 : 1 });

  return (
    <svg data-role="short-target" viewBox="0 0 340 340" role="img"
      aria-label={`숏게임 탄착 과녁 — 핀 기준 ${n}샷. 롱 ${pctOf('long')}% · 라이트 ${pctOf('right')}% · 숏 ${pctOf('short')}% · 레프트 ${pctOf('left')}%`}
      style={{ display: 'block', width: '100%', maxWidth: 340, margin: '0 auto' }}>
      <defs>
        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={C} cy={C} r={R + 8} fill="#0b1120" stroke="#252f4a" strokeWidth="1.5" />
      {scale.rings.map((m) => (
        <g key={m} data-role="short-ring" data-m={m}>
          <circle cx={C} cy={C} r={fix(m * k)} fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray={m === scale.max ? undefined : '2 5'} />
          <text x={fix(C + m * k * 0.7071 + 3)} y={fix(C - m * k * 0.7071 - 3)} fontSize="14" fill="#8aa0c4">{ringText(m)}</text>
        </g>
      ))}
      <path d={`M${C} ${C - R - 8}V${C + R + 8}M${C - R - 8} ${C}H${C + R + 8}`} stroke="rgba(255,255,255,0.07)" />

      {spread && n >= 5 && spread.x != null && spread.y != null && (
        <ellipse data-role="short-spread" cx={fix(mx)} cy={fix(my)} rx={fix(Math.max(2, spread.x * k))} ry={fix(Math.max(2, spread.y * k))}
          fill="rgba(201,162,40,0.1)" stroke="rgba(243,211,107,0.75)" strokeWidth="1.5" strokeDasharray="5 4" />
      )}

      {shots.map((s, i) => {
        const [x, y] = place(s.x, s.y);
        return <circle key={i} data-role="short-dot" data-hour={s.hour} cx={fix(x)} cy={fix(y)} r="5.5" fill="rgba(125,180,230,0.9)" stroke="#0b1120" strokeWidth="1.2" />;
      })}

      <g data-role="short-mean">
        <path d={`M${C} ${C}L${fix(mx)} ${fix(my)}`} stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeDasharray="3 4" />
        <circle cx={fix(mx)} cy={fix(my)} r="8" fill="#fff" stroke="#c9a228" strokeWidth="3.5" filter={`url(#${uid}-glow)`} />
      </g>
      {/* 핀 */}
      <circle cx={C} cy={C} r="5" fill="#0b1120" stroke="#3db87a" strokeWidth="2" />

      {DIRS.map((d) => {
        const on = d.id === top;
        const x = C + d.dx * LABEL_R, y = C + d.dy * LABEL_R;
        return (
          <g key={d.id} data-role="short-label" data-quadrant={d.id}>
            <text x={fix(x)} y={fix(y - 10)} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" letterSpacing="0.06em"
              fill={on ? COLOR.goldHi : COLOR.muted}>{d.name}</text>
            <text x={fix(x)} y={fix(y + 9)} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="900"
              fill={on ? COLOR.goldHi : COLOR.text}>{pctOf(d.id)}%</text>
          </g>
        );
      })}
    </svg>
  );
}
