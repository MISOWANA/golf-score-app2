import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Card, Metric, SplitBar, RateRow, Takeaway, TrendChip, Hint } from './widgets.jsx';
import { COLOR, fmtPct } from './format.js';

// 티샷 — 페어웨이(미스 방향) · 클럽별 · 구질 · 티샷 사고
export default function TeeTab({ report }) {
  const { tee, clubs } = report;
  const driverDist = clubs.rows.find((r) => r.key === 'driver' && r.n >= 3 && r.median != null);
  if (tee.total === 0) {
    return (
      <div data-role="tab-tee">
        <Hint id="tee-empty">파4·5 티샷의 페어웨이 결과를 기록하면 미스 방향, 클럽별·구질별 적중률을 보여드려요.</Hint>
      </div>
    );
  }
  const other = tee.side === 'right' ? '왼쪽' : '오른쪽';
  const fwTake = tee.side
    ? { tone: 'warn', text: `${tee.side === 'right' ? '오른쪽' : '왼쪽'} 미스가 더 많아요 (오른쪽 ${fmtPct(tee.rightPct)} · 왼쪽 ${fmtPct(tee.leftPct)}). 페어웨이 ${other} 가장자리를 겨냥해 보세요.` }
    : tee.left + tee.right >= 5
      ? { tone: 'info', text: `왼쪽 ${fmtPct(tee.leftPct)} · 오른쪽 ${fmtPct(tee.rightPct)} — 좌우 미스가 고르게 나뉘어요.` }
      : { tone: 'info', text: '미스 방향이 더 쌓이면 어느 쪽으로 치우치는지 알려드려요.' };

  // 드라이버가 다른 클럽보다 크게 덜 맞으면 알려 준다 (양쪽 모두 5번 이상)
  const driver = tee.byClub.find((r) => r.key === 'driver');
  const others = tee.byClub.filter((r) => r.key !== 'driver' && r.n >= 5);
  const bestOther = others.length ? others.reduce((a, b) => (b.hitPct > a.hitPct ? b : a)) : null;
  const clubTake = driver && driver.n >= 5 && bestOther && bestOther.hitPct - driver.hitPct >= 15
    ? { tone: 'warn', text: `드라이버 페어웨이 ${fmtPct(driver.hitPct)} · ${bestOther.label} ${fmtPct(bestOther.hitPct)}. 좁은 홀에서는 ${bestOther.label}도 좋은 선택이에요.` }
    : null;

  const topShape = tee.byShape[0];
  const shapeTotal = tee.byShape.reduce((a, r) => a + r.n, 0);
  const weakShape = tee.byShape.find((r) => r.n >= 5 && tee.hitPct != null && r.hitPct <= tee.hitPct - 15);
  const shapeTake = topShape
    ? (weakShape
      ? { tone: 'warn', text: `${weakShape.label} ${weakShape.n}번은 페어웨이 ${fmtPct(weakShape.hitPct)}에 그쳐요 (전체 ${fmtPct(tee.hitPct)}).` }
      : { tone: 'info', text: `주로 ${topShape.label}(${fmtPct((topShape.n / shapeTotal) * 100)})을 쳐요. 페어웨이 ${fmtPct(topShape.hitPct)}.` })
    : null;

  const pen = tee.penalty;
  const penTake = pen.teeShots === 0 ? null
    : pen.ob === 0 && pen.other === 0 ? { tone: 'good', text: `티샷 ${pen.teeShots}번 동안 OB·해저드가 없었어요.` }
      : pen.ob > 0 ? { tone: 'warn', text: `티샷 ${Math.round(pen.teeShots / pen.ob)}번에 한 번꼴로 OB가 나요. OB 한 번은 2타예요.` }
        : { tone: 'info', text: `OB는 없고 해저드·언플레이어블이 ${pen.other}번 있었어요.` };

  return (
    <div data-role="tab-tee">
      <Card id="fairway" title="FAIRWAY · 페어웨이" info={<>
        <p>파4·5 티샷이 페어웨이에 멈춘 비율이에요. 그린에 바로 올린 1온도 페어웨이는 아니라서 미적중으로 세요.</p>
        <p>왼쪽·오른쪽은 미적중 방향이에요.</p>
      </>} right={<TrendChip delta={tee.trend?.delta} id="trend-fairway" label="최근 5R" />}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
          <Metric id="m-fir" value={fmtPct(tee.hitPct)} label="적중률" sub={`티샷 ${tee.total}번 중 ${tee.hit}번`} />
          <ConfidenceBadge tier={tee.tier} />
        </div>
        <SplitBar id="fairway-bar" segments={[
          { key: 'left', label: '왼쪽', pct: tee.leftPct ?? 0, count: `${tee.left}번`, color: COLOR.amber },
          { key: 'hit', label: '적중', pct: tee.hitPct ?? 0, count: `${tee.hit}번`, color: COLOR.green },
          { key: 'right', label: '오른쪽', pct: tee.rightPct ?? 0, count: `${tee.right}번`, color: COLOR.orange },
          ...(tee.green > 0 ? [{ key: 'green', label: '1온', pct: tee.greenPct ?? 0, count: `${tee.green}번`, color: COLOR.gold }] : []),
          ...(tee.unknown > 0 ? [{ key: 'unknown', label: '방향 없음', pct: (tee.unknown / tee.total) * 100, count: `${tee.unknown}번`, color: '#4d5a78' }] : []),
        ]} />
        <Takeaway tone={fwTake.tone}>{fwTake.text}</Takeaway>
      </Card>

      {driverDist && (
        <Card id="tee-distance" title="DRIVER · 드라이버 거리" info={<><p>지도로 티샷 지점을 잰 샷의 거리예요. 최근 20라운드, 3번 이상 쌓이면 보여요. 벌타가 난 티샷은 뺐어요.</p></>}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <Metric id="m-driver" value={Math.round(driverDist.median)} unit="m" label="중앙값" sub={`${driverDist.n}번`} />
            {driverDist.q1 != null && driverDist.q3 != null && <Metric id="m-driver-range" value={`${Math.round(driverDist.q1)}~${Math.round(driverDist.q3)}`} unit="m" label="중간 절반의 샷" align="right" />}
          </div>
          {driverDist.q1 != null && driverDist.q3 != null && (
            <Takeaway tone={driverDist.q3 - driverDist.q1 > driverDist.median * 0.15 ? 'warn' : 'good'}>
              {driverDist.q3 - driverDist.q1 > driverDist.median * 0.15
                ? `드라이버 거리가 ${Math.round(driverDist.q3 - driverDist.q1)}m 폭으로 들쭉날쭉해요. 일정하게 맞히는 게 거리보다 먼저예요.`
                : '드라이버 거리가 꾸준해요.'}
            </Takeaway>
          )}
        </Card>
      )}

      <Card id="tee-club" title="BY CLUB · 클럽별 페어웨이">
        {tee.byClub.length > 0 ? (
          <>
            {tee.byClub.map((r) => (
              <RateRow key={r.key} id={`tee-club-${r.key}`} label={r.label} sub={`${r.n}번`} value={r.hitPct} text={fmtPct(r.hitPct)}
                color={tee.hitPct != null && r.hitPct >= tee.hitPct ? COLOR.green : COLOR.amber} tier={r.tier} />
            ))}
            {clubTake && <Takeaway tone={clubTake.tone}>{clubTake.text}</Takeaway>}
          </>
        ) : <Hint>클럽별 티샷은 3번 이상 기록된 클럽부터 보여드려요.</Hint>}
      </Card>

      <Card id="tee-shape" title="SHOT SHAPE · 구질">
        {tee.byShape.length > 0 ? (
          <>
            {tee.byShape.slice(0, 5).map((r) => (
              <RateRow key={r.key} id={`tee-shape-${r.key}`} label={r.label} sub={`${r.n}번 · ${fmtPct((r.n / shapeTotal) * 100)}`} value={r.hitPct} text={fmtPct(r.hitPct)}
                color={tee.hitPct != null && r.hitPct >= tee.hitPct ? COLOR.green : COLOR.amber} tier={r.tier} />
            ))}
            <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 6 }}>막대는 그 구질의 페어웨이 적중률이에요.</div>
            <Takeaway tone={shapeTake.tone}>{shapeTake.text}</Takeaway>
          </>
        ) : <Hint>구질은 3번 이상 기록된 것부터 보여드려요.</Hint>}
      </Card>

      <Card id="tee-penalty" title="MISTAKES · 티샷 사고">
        {pen.teeShots > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><Metric id="m-ob" value={fmtPct(pen.obRate * 100, 1)} label="티샷 OB" sub={`${pen.ob}/${pen.teeShots}번`} tone={pen.ob > 0 ? 'bad' : 'good'} /></div>
              <div style={{ flex: 1 }}><Metric id="m-hazard" value={fmtPct(pen.otherRate * 100, 1)} label="해저드·언플" sub={`${pen.other}/${pen.teeShots}번`} /></div>
            </div>
            <Takeaway tone={penTake.tone}>{penTake.text}</Takeaway>
          </>
        ) : <Hint>티샷 클럽까지 기록한 홀이 쌓이면 보여드려요.</Hint>}
      </Card>
    </div>
  );
}
