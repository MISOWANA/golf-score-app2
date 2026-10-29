import { useId } from 'react';
import { LANDING_HOURS, QUADRANTS, landingSummary, landingCaption } from '../../engine/landing.js';
import { CENTER, fix, hourAngle, pol, arcPath, sectorPath, KEY_NAME, QUADRANT_NAME } from '../ui/polar.js';
import FlagMark from '../ui/FlagMark';

// 그린 랜딩 분포 — 입력할 때 쓰는 12조각 휠(LandingWheel)과 같은 모양으로, 조각마다 그 시각에 멈춘 횟수를 보여 준다.
// 핀을 가운데 두고 12시=롱 · 3시=라이트 · 6시=숏 · 9시=레프트. 많을수록 조각이 진하고, 가장 많은 조각은 금색으로 켜진다.
// 가운데는 깃발과 총 횟수, 흰 점은 평균 방향(쏠림이 뚜렷할 때만)이다. 어느 쪽이 좋다고 색으로 말하지 않는다.
// 입력 휠보다 조금 작게 그려 바깥에 방향 이름과 비율이 들어갈 자리를 둔다. counts 는 { 시각(1~12): 횟수 }.
const WI = 50;             // 조각 안쪽 반지름
const WO = 112;            // 조각 바깥 반지름
const ARC = WO + 11;       // 방향 호
const LABEL_R = 150;       // 방향 이름 · 비율 글자 자리 (위·아래)
const SIDE_R = 148;        // 좌·우는 글자가 옆으로 길어 조금 안쪽에
const QUADRANT_CENTER = { long: 0, right: 90, short: 180, left: 270 };
const LABEL_DIR = { long: [0, -LABEL_R], right: [SIDE_R, 0], short: [0, LABEL_R], left: [-SIDE_R, 0] };

export default function LandingDistribution({ counts }) {
  const uid = useId().replace(/:/g, '');
  const sum = landingSummary(counts);
  if (!sum.total) return null;

  const pctOf = (q) => Math.round(sum.q[q] / sum.total * 100);
  const caption = landingCaption(sum);
  // 평균 방향 — 방향이 한쪽으로 뚜렷이 쏠렸을 때만 호 위에 점으로 찍는다
  const meanAngle = (Math.atan2(sum.mean.x, sum.mean.y) * 180 / Math.PI + 360) % 360;
  const meanDot = sum.bias >= 0.2 ? pol(ARC, meanAngle) : null;

  const ariaLabel = `그린 랜딩 분포 — 총 ${sum.total}회. ${QUADRANTS.map((q) => `${{ long: '롱', right: '라이트', short: '숏', left: '레프트' }[q]} ${pctOf(q)}%`).join(' · ')}`;

  return (
    <div data-role="landing-dist">
      <svg viewBox="0 0 340 340" role="img" aria-label={ariaLabel}
        style={{ display: 'block', width: '100%', maxWidth: 340, margin: '0 auto' }}>
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

        {/* 바깥의 방향 호 — 가장 많이 멈춘 방향이 금색으로 켜진다 */}
        {QUADRANTS.map((q) => {
          const on = sum.top === q, c = QUADRANT_CENTER[q];
          return (
            <path key={q} d={arcPath(ARC, c - 42, c + 42)} fill="none" strokeWidth="3" strokeLinecap="round"
              stroke={on ? '#f3d36b' : '#252f4a'} filter={on ? `url(#${uid}-glow)` : undefined} />
          );
        })}

        {LANDING_HOURS.map((h) => {
          const c = counts[h] ?? 0, d = hourAngle(h), key = !!KEY_NAME[h];
          const peak = c > 0 && c === sum.max;
          const alpha = 0.2 + 0.32 * (c / sum.max);   // 진할수록 많이 — 흰 글자 대비 4.5:1 이 지켜지는 선까지만
          const base = key ? '#1a2644' : '#131b2f';
          const p = pol((WI + WO) / 2, d);
          const shape = sectorPath(WI + 3, WO - 3, d - 12.6, d + 12.6);
          return (
            <g key={h} data-role="landing-point" data-hour={h} data-count={c} data-peak={peak ? '1' : '0'}>
              <path d={shape} fill={base} stroke={base} strokeWidth="6" strokeLinejoin="round" />
              {c > 0 && !peak && (
                <path d={shape} fill="#c9a228" fillOpacity={alpha} stroke="#c9a228" strokeOpacity={alpha} strokeWidth="6" strokeLinejoin="round" />
              )}
              {peak && (
                <path d={shape} fill={`url(#${uid}-gold)`} stroke="#e8c64e" strokeWidth="6" strokeLinejoin="round" filter={`url(#${uid}-glow)`} />
              )}
              {c > 0 ? (
                <>
                  <text x={fix(p[0])} y={fix(p[1] - 6)} textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="900"
                    fill={peak ? '#1a1405' : '#f4f6fb'}>{c}</text>
                  <text x={fix(p[0])} y={fix(p[1] + 10)} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700"
                    fill={peak ? 'rgba(26,20,5,0.78)' : '#e1e8f5'}>{h}시</text>
                </>
              ) : (
                <text x={fix(p[0])} y={fix(p[1])} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill="#8896b0">{h}</text>
              )}
            </g>
          );
        })}

        {/* 가운데 — 핀(깃발)과 총 횟수 */}
        <circle cx={CENTER} cy={CENTER} r={WI - 9} fill="#0e1c14" stroke="rgba(61,184,122,0.55)" strokeWidth="1.5" />
        <FlagMark x={CENTER - 8} y={CENTER - 9} k={0.85} />
        <text x={CENTER} y={CENTER + 26} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="800" fill="#f3d36b" data-role="landing-hub-total">{sum.total}회</text>

        {meanDot && (
          <g data-role="landing-mean">
            <circle cx={fix(meanDot[0])} cy={fix(meanDot[1])} r="7.5" fill="#fff" stroke="#c9a228" strokeWidth="3.5" filter={`url(#${uid}-glow)`} />
          </g>
        )}

        {QUADRANTS.map((q) => {
          const [dx, dy] = LABEL_DIR[q], hl = q === sum.top;
          return (
            <g key={q} data-role="landing-label" data-quadrant={q}>
              <text x={fix(CENTER + dx)} y={fix(CENTER + dy - 9)} textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700"
                letterSpacing="0.04em" fill={hl ? '#f3d36b' : '#8896b0'}>{QUADRANT_NAME[q]}</text>
              <text x={fix(CENTER + dx)} y={fix(CENTER + dy + 8)} textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="900"
                fill={hl ? '#f3d36b' : '#e8edf8'}>{pctOf(q)}%</text>
            </g>
          );
        })}
      </svg>
      <div data-role="landing-caption" style={{ textAlign: 'center', fontSize: 14, color: '#8896b0', marginTop: 6, lineHeight: 1.5 }}>
        {meanDot && (
          <span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#fff', border: '2px solid #c9a228', verticalAlign: -1, marginRight: 6, boxSizing: 'border-box' }} />
        )}
        {caption}
      </div>
    </div>
  );
}
