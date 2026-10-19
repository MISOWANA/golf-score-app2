import { hasHoleMap } from '../../engine/geo.js';

// ROUND REPORT 상단의 홀별 복기 진입 그리드.
// 스코어카드의 작은 숫자를 누르게 하는 대신, 홀 번호와 스코어를 큼직하게 깔아
// "어느 홀을 되짚을지" 고르는 것이 이 화면의 첫 동작이 되게 한다.

const TONE = (diff) => {
  if (diff == null) return { color: '#4d5a78', bg: '#131d35', border: '#1b2238' };
  if (diff <= -2) return { color: '#f0c93a', bg: 'rgba(201,162,40,0.18)', border: 'rgba(201,162,40,0.55)' };
  if (diff === -1) return { color: '#3db87a', bg: 'rgba(61,184,122,0.16)', border: 'rgba(61,184,122,0.5)' };
  if (diff === 0) return { color: '#e8edf8', bg: '#1a2235', border: '#2a3650' };
  if (diff === 1) return { color: '#e57373', bg: 'rgba(229,115,115,0.12)', border: 'rgba(229,115,115,0.4)' };
  return { color: '#ef5350', bg: 'rgba(239,83,80,0.16)', border: 'rgba(239,83,80,0.5)' };
};

// 입력하지 않은 홀(touched 아님) — 저장된 기본값(파)이 합계에는 들어간다. 같은 값을 보여주되 점선으로 구분한다.
const DEFAULT_TONE = { color: '#8ca4bc', bg: '#101a30', border: '#33415f' };

export default function HoleReviewGrid({ round, player, onSelectHole }) {
  const rows = [
    { label: round.outCourseName || 'OUT', from: 0 },
    { label: round.inCourseName || 'IN', from: 9 },
  ];

  const defaultCount = round.holes.filter((h) => !h.scores?.[player]?.touched).length;

  const gpsCount = round.holes.filter((h) => hasHoleMap(h.scores?.[player])).length;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 10, marginBottom: 12,
      }}>
        <div style={{
          fontSize: 16, fontWeight: 800, color: '#e8edf8', letterSpacing: '0.02em',
        }}>홀별 복기</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#8ca4bc' }}>
          {gpsCount > 0 ? `${gpsCount}개 홀에 지도 기록` : '홀을 눌러 샷 기록 보기'}
        </div>
      </div>

      {rows.map(({ label, from }) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 12, fontWeight: 800, color: '#6e84a8',
            letterSpacing: '0.18em', marginBottom: 6,
          }}>{label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 5 }}>
            {round.holes.slice(from, from + 9).map((h, i) => {
              const idx = from + i;
              const s = h.scores?.[player];
              const entered = !!s?.touched;
              // 입력하지 않은 홀도 합계에는 저장된 스코어(파)가 들어가므로 같은 값을 보여준다
              const strokes = s?.strokes != null ? s.strokes : null;
              const diff = strokes != null ? strokes - h.par : null;
              const t = entered ? TONE(diff) : DEFAULT_TONE;
              const hasGps = hasHoleMap(s);
              return (
                <button
                  key={idx}
                  onClick={() => onSelectHole(idx)}
                  title={entered ? undefined : '입력 없이 파(2퍼트)로 저장된 홀'}
                  style={{
                    position: 'relative', padding: '7px 0 8px', borderRadius: 9,
                    border: `1.5px ${entered ? 'solid' : 'dashed'} ${t.border}`, background: t.bg,
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 2,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8ca4bc', lineHeight: 1 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: 19, fontWeight: 900, color: t.color, lineHeight: 1 }}>
                    {strokes ?? '–'}
                  </span>
                  {/* 지도 기록이 있는 홀은 점 하나로 표시 — 복기 가치가 큰 홀이다 */}
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: hasGps ? '#5b9cf6' : 'transparent',
                  }} />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {defaultCount > 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6e84a8', lineHeight: 1.5, textAlign: 'right' }}>
          점선 칸 {defaultCount}개: 입력 없이 파(2퍼트)로 저장된 홀
        </div>
      )}
    </div>
  );
}
