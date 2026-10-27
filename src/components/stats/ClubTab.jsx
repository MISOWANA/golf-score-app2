import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Card, Takeaway, Hint } from './widgets.jsx';
import { COLOR, fmtMeters, fmtPct } from './format.js';
import { MIN_CONSISTENCY_N, MIN_CONSISTENCY_CLUBS } from '../../engine/statsReport.js';

const MIN_DISTANCE_SAMPLES = 3;      // 거리 막대를 그리려면 필요한 샷 수

// 클럽 — 클럽별 거리(중앙값 · 범위)와 적중, 클럽별 거리 일관성
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

  const cons = clubs.consistency;
  const maxSpread = cons.list.length ? Math.max(...cons.list.map((c) => c.spread)) : 1;

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
              <span style={{ fontSize: 14, fontWeight: 900, width: 58, whiteSpace: 'nowrap' }}>{r.label}</span>
              <span style={{ fontSize: 13, color: COLOR.faint, flex: 1, whiteSpace: 'nowrap' }}>풀샷 {r.hitN}번</span>
              {r.hitPct != null && <span data-role="club-hit" style={{ fontSize: 13, fontWeight: 700, color: COLOR.muted, whiteSpace: 'nowrap' }}>적중 <b style={{ color: COLOR.text }}>{fmtPct(r.hitPct)}</b></span>}
              <ConfidenceBadge tier={r.tier} />
              <span data-role="club-median" style={{ fontSize: 16, fontWeight: 900, width: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMeters(r.median)}</span>
            </div>
            <div style={{ position: 'relative', height: 8, borderRadius: 4, background: COLOR.track, marginTop: 8 }}>
              {r.q1 != null && r.q3 != null && r.q3 > r.q1 && (
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: at(r.q1), width: `calc(${at(r.q3)} - ${at(r.q1)})`, borderRadius: 4, background: 'rgba(201,162,40,0.35)' }} />
              )}
              <div style={{ position: 'absolute', top: -2, left: `calc(${at(r.median)} - 3px)`, width: 6, height: 12, borderRadius: 3, background: COLOR.goldHi }} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLOR.faint, marginTop: 6 }}>
          <span>{fmtMeters(0)}</span><span>{fmtMeters(scaleMax)}</span>
        </div>
      </Card>

      {/* 클럽 사이가 비었는지·겹치는지는 판정하지 않는다 — 어떤 간격이 맞는지는 사람마다 다르다. 내 클럽끼리 거리가 얼마나 일정한지만 견준다. */}
      <Card id="club-consistency" title="CONSISTENCY · 거리 일관성" info={<>
        <p>같은 클럽으로 쳤을 때 거리가 얼마나 일정한지예요. 중간 절반의 샷(25~75%)이 떨어진 폭이 좁을수록 일정해요.</p>
        <p>긴 클럽일수록 폭이 절대값으로도 커서, 폭을 거리 중앙값에 견준 비율로 순서를 매겼어요. {MIN_CONSISTENCY_N}번 이상 친 풀스윙 클럽만 보여요.</p>
      </>}>
        {!cons.enough ? (
          <Hint id="consistency-empty">거리가 {MIN_CONSISTENCY_N}번 이상 쌓인 클럽이 {MIN_CONSISTENCY_CLUBS}개 이상이면 클럽끼리 거리가 얼마나 일정한지 비교해 드려요.</Hint>
        ) : (
          <>
            <Takeaway bare tone="info" id="consistency-take">
              거리가 가장 일정한 클럽은 {cons.steadiest.label}(폭 {fmtMeters(cons.steadiest.width)}), 가장 들쭉날쭉한 클럽은 {cons.widest.label}(폭 {fmtMeters(cons.widest.width)})이에요.
            </Takeaway>
            {cons.list.map((c) => (
              <div key={c.key} data-role={`consistency-${c.key}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${COLOR.line}` }}>
                <span style={{ width: 70, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                <div style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 3, background: COLOR.track }}>
                  <div style={{ height: '100%', width: `${Math.max(6, (c.spread / maxSpread) * 100)}%`, borderRadius: 3, background: 'rgba(201,162,40,0.65)' }} />
                </div>
                <span style={{ width: 62, textAlign: 'right', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>폭 {fmtMeters(c.width)}</span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 6 }}>막대가 짧을수록 거리가 일정해요 · 중앙값 대비 비율 기준</div>
          </>
        )}
      </Card>
    </div>
  );
}
