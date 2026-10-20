import { useId } from 'react';
import { LANDING_HOURS, QUADRANTS, landingSummary, landingCaption } from '../../engine/landing.js';
import { CENTER, fix, hourAngle, pol, pt, smoothClosed, KEY_NAME, QUADRANT_NAME } from '../ui/polar.js';

// 그린 랜딩 분포 — 12개 시각별 횟수를 레이더 모양으로 보여 준다.
// 기록이 몰린 쪽으로 모양이 불룩해지고, 흰 점이 평균 위치다. counts 는 { 시각(1~12): 횟수 }.
const RMAX = 96;
const RMIN = 12;
const KEY_HOURS = { long: 12, right: 3, short: 6, left: 9 };

export default function LandingRadar({ counts }) {
  const uid = useId().replace(/:/g, '');
  const sum = landingSummary(counts);
  if (!sum.total) return null;

  const radiusOf = (c) => (c ? RMIN + (RMAX - RMIN) * c / sum.max : 8);
  const pts = LANDING_HOURS.map((h) => pol(radiusOf(counts[h] ?? 0), hourAngle(h)));
  const pctOf = (q) => Math.round(sum.q[q] / sum.total * 100);
  const K = RMAX * 0.95;
  const mean = [CENTER + sum.mean.x * K, CENTER - sum.mean.y * K];
  const caption = landingCaption(sum);

  return (
    <div data-role="landing-radar">
      <svg viewBox="0 0 340 340" role="img" aria-label="그린 랜딩 분포 레이더"
        style={{ display: 'block', width: '100%', maxWidth: 340, margin: '0 auto' }}>
        <defs>
          <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id={`${uid}-fill`} gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={RMAX}>
            <stop offset="0" stopColor="#c9a228" stopOpacity="0.2" />
            <stop offset="1" stopColor="#3db87a" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={RMAX + 8} fill="#0b1120" stroke="#252f4a" strokeWidth="1.5" />
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <circle key={k} cx={CENTER} cy={CENTER} r={fix(RMAX * k)} fill="none"
            stroke={`rgba(255,255,255,${k === 1 ? 0.13 : 0.06})`} strokeDasharray={k === 1 ? undefined : '2 5'} />
        ))}
        {LANDING_HOURS.map((h) => (
          <path key={h} d={`M${CENTER} ${CENTER}L${pt(pol(RMAX + 8, hourAngle(h)))}`} stroke="rgba(255,255,255,0.055)" />
        ))}

        <path d={smoothClosed(pts)} fill={`url(#${uid}-fill)`} stroke="#f3d36b" strokeWidth="2.2" strokeLinejoin="round"
          filter={`url(#${uid}-glow)`} data-role="landing-shape" />

        {LANDING_HOURS.map((h, i) => {
          const c = counts[h] ?? 0, d = hourAngle(h);
          const peak = c > 0 && c === sum.max;
          const label = pol(Math.min(radiusOf(c) + 13, RMAX + 6), d);
          const num = pol(RMAX + 19, d);
          return (
            <g key={h} data-role="landing-point" data-hour={h} data-count={c}>
              {c > 0 && (
                <>
                  <circle cx={fix(pts[i][0])} cy={fix(pts[i][1])} r={peak ? 6 : 3.4} fill={peak ? '#f3d36b' : '#fff'}
                    stroke={peak ? '#fff' : 'rgba(0,0,0,0.3)'} strokeWidth={peak ? 1.6 : 1} filter={peak ? `url(#${uid}-glow)` : undefined} />
                  <text x={fix(label[0])} y={fix(label[1])} textAnchor="middle" dominantBaseline="central" fontSize="10.5" fontWeight="900"
                    fill={peak ? '#f3d36b' : '#e8edf8'}>{c}</text>
                </>
              )}
              {!KEY_NAME[h] && (
                <text x={fix(num[0])} y={fix(num[1])} textAnchor="middle" dominantBaseline="central" fontSize="9.5" fill="#6e84a8">{h}</text>
              )}
            </g>
          );
        })}

        {sum.bias >= 0.08 && (
          <g data-role="landing-mean">
            <path d={`M${CENTER} ${CENTER}L${pt(mean)}`} stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeDasharray="3 4" />
            <circle cx={fix(mean[0])} cy={fix(mean[1])} r="7.5" fill="#fff" stroke="#c9a228" strokeWidth="3.5" />
          </g>
        )}
        <circle cx={CENTER} cy={CENTER} r="5" fill="#0b1120" stroke="rgba(61,184,122,0.6)" />

        {QUADRANTS.map((q) => {
          const p = pol(RMAX + 40, hourAngle(KEY_HOURS[q])), hl = q === sum.top;
          return (
            <g key={q} data-role="landing-label" data-quadrant={q}>
              <text x={fix(p[0])} y={fix(p[1] - 9)} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700"
                letterSpacing="0.1em" fill={hl ? '#f3d36b' : '#8896b0'}>{QUADRANT_NAME[q]}</text>
              <text x={fix(p[0])} y={fix(p[1] + 7)} textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="900"
                fill={hl ? '#f3d36b' : '#e8edf8'}>{pctOf(q)}%</text>
            </g>
          );
        })}
      </svg>
      <div data-role="landing-caption" style={{ textAlign: 'center', fontSize: 13, color: '#8896b0', marginTop: 4 }}>
        {sum.bias >= 0.2 && (
          <span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#fff', border: '2px solid #c9a228', verticalAlign: -1, marginRight: 6, boxSizing: 'border-box' }} />
        )}
        {caption}
      </div>
    </div>
  );
}
