import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Card, Takeaway, Hint } from './widgets.jsx';
import { COLOR, fmtMeters, fmtPct } from './format.js';

const MIN_DISTANCE_SAMPLES = 3;      // 거리 막대를 그리려면 필요한 샷 수

// 클럽 — 클럽별 거리(중앙값 · 범위)와 적중, 클럽 사이의 거리 간격
export default function ClubTab({ report }) {
  const { clubs } = report;
  const rows = clubs.rows.filter((r) => r.n >= MIN_DISTANCE_SAMPLES && r.median != null);
  if (rows.length === 0) {
    return (
      <div data-role="tab-club">
        <Hint id="club-empty">클럽을 고르고 남은 거리를 입력하거나 지도로 샷 지점을 찍으면 클럽별 거리를 계산해 드려요. 클럽마다 3번 이상 쌓이면 보여요.</Hint>
      </div>
    );
  }
  const maxEnd = Math.max(...rows.map((r) => r.q3 ?? r.median));
  const scaleMax = Math.ceil((maxEnd * 1.08) / 25) * 25;
  const at = (v) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`;

  const gapTake = (() => {
    if (clubs.rows.filter((r) => r.n >= 4 && r.median != null).length < 3) return { tone: 'info', text: '거리가 4번 이상 쌓인 클럽이 3개 이상이면 클럽 사이의 간격을 알려드려요.' };
    const parts = [];
    if (clubs.wideGap) parts.push({ tone: 'warn', text: `${clubs.wideGap.longer}와 ${clubs.wideGap.shorter} 사이가 ${fmtMeters(clubs.wideGap.gap)}나 벌어져 있어요. 그 사이 거리를 칠 클럽이 없어요.` });
    if (clubs.overlap) parts.push({ tone: 'info', text: `${clubs.overlap.longer}와 ${clubs.overlap.shorter}는 거리 차이가 ${fmtMeters(clubs.overlap.gap)}뿐이에요. 한 클럽을 줄여도 괜찮을 수 있어요.` });
    return parts.length ? parts : [{ tone: 'good', text: '클럽 사이 거리 간격이 고르게 벌어져 있어요.' }];
  })();
  const gapList = Array.isArray(gapTake) ? gapTake : [gapTake];

  return (
    <div data-role="tab-club">
      <Card id="club-distance" title="CLUB DISTANCE · 클럽별 거리 (최근 20R)" info={<>
        <p>막대의 굵은 점은 거리 중앙값, 옅은 범위는 중간 절반의 샷(25~75%)이 떨어진 거리예요. 범위가 좁을수록 거리가 일정해요.</p>
        <p>거리는 지도로 잰 값이나, 남은 거리 입력 차이로 계산한 값이에요. 80m 안 칩·피치샷은 거리에서 뺐어요.</p>
        <p>적중은 티샷은 페어웨이(파3은 그린), 그 뒤 샷은 그린에 올린 비율이에요. 3번 이상 친 클럽만 보여요.</p>
      </>}>
        {rows.map((r) => (
          <div key={r.key} data-role={`club-${r.key}`} style={{ padding: '10px 0', borderBottom: `1px solid ${COLOR.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 900, width: 58, whiteSpace: 'nowrap' }}>{r.label}</span>
              <span style={{ fontSize: 11, color: COLOR.faint, flex: 1, whiteSpace: 'nowrap' }}>풀샷 {r.hitN}번</span>
              {r.hitPct != null && <span data-role="club-hit" style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, whiteSpace: 'nowrap' }}>적중 <b style={{ color: COLOR.text }}>{fmtPct(r.hitPct)}</b></span>}
              <ConfidenceBadge tier={r.tier} />
              <span data-role="club-median" style={{ fontSize: 15, fontWeight: 900, width: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMeters(r.median)}</span>
            </div>
            <div style={{ position: 'relative', height: 8, borderRadius: 4, background: COLOR.track, marginTop: 8 }}>
              {r.q1 != null && r.q3 != null && r.q3 > r.q1 && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: at(r.q1), width: `calc(${at(r.q3)} - ${at(r.q1)})`, borderRadius: 4, background: 'rgba(201,162,40,0.35)' }} />
              )}
              <div style={{ position: 'absolute', top: -2, left: `calc(${at(r.median)} - 3px)`, width: 6, height: 12, borderRadius: 3, background: COLOR.goldHi }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: COLOR.faint, marginTop: 6 }}>
          <span>0m</span><span>{scaleMax}m</span>
        </div>
      </Card>

      <Card id="club-gap" title="GAPPING · 클럽 간격">
        {gapList.map((g, i) => <Takeaway key={i} bare tone={g.tone} id="gap-take">{g.text}</Takeaway>)}
      </Card>
    </div>
  );
}
