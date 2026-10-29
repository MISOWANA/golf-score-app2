import { useId } from 'react';
import { fmtPutt } from '../../engine/units.js';
import { COLOR } from './format.js';
import { SIDE_COLOR } from './puttingText.js';

// 퍼트 미스 위치 과녁 — 홀을 가운데 두고, 빗나간 퍼트가 멈춘 자리를 점으로 모아 찍는다.
// 퍼트마다 "공 → 홀" 라인이 위로 가게 맞춰 둔 좌표라서, 위가 롱(홀 너머) · 아래가 숏(못 미침) · 오른쪽이 라이트다.
// 점 색: 로우사이드(주황) · 하이사이드(금색) · 그 밖(직선 라이거나 라이를 고르지 않은 퍼트, 파랑). 어느 쪽이 좋다고 말하는 색이 아니다.
// 흰 점이 평균 위치(쏠림), 점선 타원이 흩어짐(±1표준편차). 동심원은 홀까지 거리이고 눈금은 가장 멀리 멈춘 퍼트에 맞춰진다.
const C = 170;            // 가운데
const R = 100;            // 가장 바깥 눈금의 반지름
const LABEL_R = 138;      // 방향 이름 자리

const NAMES = [['LONG', 0, -1], ['RIGHT', 1, 0], ['SHORT', 0, 1], ['LEFT', -1, 0]];
const fix = (n) => +n.toFixed(1);

export default function PuttMissTarget({ pattern, id = 'putt-miss-target' }) {
  const uid = useId().replace(/:/g, '');
  const { shots, scale, n, mean, spread } = pattern;
  if (!n) return null;

  const k = R / scale.max;
  const place = (x, y) => {
    const d = Math.hypot(x, y) * k;
    const f = d > R ? R / d : 1;                       // 눈금 밖으로 나간 점은 가장자리에 붙인다
    return [C + x * k * f, C - y * k * f];
  };
  const [mx, my] = place(mean.x, mean.y);
  const ringText = (m) => fmtPutt(m, { digits: Number.isInteger(m) ? 0 : 1 });

  return (
    <svg data-role={id} viewBox="0 0 340 340" role="img"
      aria-label={`퍼트 미스 위치 과녁 — 빗나간 퍼트 ${n}개가 홀 기준 어디에 멈췄는지. 위가 롱, 아래가 숏, 오른쪽이 라이트`}
      style={{ display: 'block', width: '100%', maxWidth: 340, margin: '0 auto' }}>
      <defs>
        <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={C} cy={C} r={R + 8} fill="#0b1120" stroke="#252f4a" strokeWidth="1.5" />
      {scale.rings.map((m) => (
        <g key={m} data-role="putt-ring" data-m={m}>
          <circle cx={C} cy={C} r={fix(m * k)} fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray={m === scale.max ? undefined : '2 5'} />
          <text x={fix(C + m * k * 0.7071 + 3)} y={fix(C - m * k * 0.7071 - 3)} fontSize="13" fill="#8aa0c4">{ringText(m)}</text>
        </g>
      ))}
      <path d={`M${C} ${C - R - 8}V${C + R + 8}M${C - R - 8} ${C}H${C + R + 8}`} stroke="rgba(255,255,255,0.07)" />

      {spread && n >= 5 && spread.x != null && spread.y != null && (
        <ellipse data-role="putt-spread" cx={fix(mx)} cy={fix(my)} rx={fix(Math.max(2, spread.x * k))} ry={fix(Math.max(2, spread.y * k))}
          fill="rgba(201,162,40,0.1)" stroke="rgba(243,211,107,0.75)" strokeWidth="1.5" strokeDasharray="5 4" />
      )}

      {shots.map((s, i) => {
        const [x, y] = place(s.x, s.y);
        return <circle key={i} data-role="putt-dot" data-side={s.side ?? 'none'} cx={fix(x)} cy={fix(y)} r="5.5" fill={SIDE_COLOR[s.side] ?? SIDE_COLOR.none} stroke="#0b1120" strokeWidth="1.2" />;
      })}

      <g data-role="putt-mean">
        <path d={`M${C} ${C}L${fix(mx)} ${fix(my)}`} stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeDasharray="3 4" />
        <circle cx={fix(mx)} cy={fix(my)} r="8" fill="#fff" stroke={COLOR.gold} strokeWidth="3.5" filter={`url(#${uid}-glow)`} />
      </g>
      {/* 홀 */}
      <circle cx={C} cy={C} r="7" fill="#000" stroke="#fff" strokeWidth="2" />

      {NAMES.map(([name, dx, dy]) => (
        <text key={name} data-role="putt-label" x={fix(C + dx * LABEL_R)} y={fix(C + dy * LABEL_R)} textAnchor="middle" dominantBaseline="central"
          fontSize="13" fontWeight="700" letterSpacing="0.06em" fill={COLOR.muted}>{name}</text>
      ))}
    </svg>
  );
}
