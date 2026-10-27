import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Card, Metric, SplitBar, RateRow, Takeaway, TrendChip, Hint } from './widgets.jsx';
import { COLOR, fmtNum, fmtPct } from './format.js';
import { PUTT_CAUSE_LABEL, PUTT_CAUSE_ORDER } from '../../engine/puttAnalysis.js';

const CAUSE_ADVICE = {
  lag: '롱 퍼트는 홀보다 1m 원 안에 세우는 거리 연습이 먼저예요.',
  short: '1.5m 안쪽 퍼트는 같은 루틴으로 끝까지 마무리하는 연습이 먼저예요.',
  both: '롱 퍼트를 붙이는 연습과 1.5m 안쪽 마무리 연습이 둘 다 필요해요.',
  mid: '3~6m는 홀 주변 60cm 원에 세우는 속도를 먼저 맞춰 보세요.',
  close: '가까운 거리는 홀 뒤 30cm를 넘기지 않는 속도로 쳐 보세요.',
};

// 퍼팅 — 라운드당 퍼트 · 거리별 성공률 · 3퍼트 원인 (숏게임은 '숏게임' 탭)
export default function PuttingTab({ report }) {
  const { putting } = report;
  if (putting.holes === 0) {
    return <div data-role="tab-putting"><Hint id="putting-empty">퍼트 수를 기록한 홀이 쌓이면 거리별 성공률과 3퍼트 원인을 보여드려요.</Hint></div>;
  }

  const threePct = putting.three.pct ?? 0;
  const puttTake = threePct >= 15
    ? { tone: 'warn', text: `3퍼트가 ${fmtPct(threePct)} (${putting.three.n}홀)예요. 퍼트로 새는 타수는 대부분 여기서 나와요.` }
    : putting.one.pct != null && putting.one.pct >= 15
      ? { tone: 'good', text: `원퍼트 ${fmtPct(putting.one.pct)}, 3퍼트 ${fmtPct(threePct)} — 퍼트가 안정적이에요.` }
      : { tone: 'info', text: `3퍼트는 ${fmtPct(threePct)} (${putting.three.n}홀)예요.` };

  const distRows = putting.byDistance.filter((b) => b.total > 0);
  // 위 표의 1-2m 줄과 같은 숫자를 쓴다 (인사이트의 3~7피트 구간은 범위가 달라 따로 보여준다)
  const zone = distRows.find((b) => b.id === '1to2');
  const zoneTake = zone && zone.total >= 5
    ? { tone: zone.ratePct < 60 ? 'warn' : 'good', text: `1~2m 퍼트 성공률 ${fmtPct(zone.ratePct)} (${zone.made}/${zone.total}). 아마추어가 퍼트로 가장 많이 잃는 구간이에요.` }
    : null;

  const causes = putting.causes;
  const causeRows = PUTT_CAUSE_ORDER.filter((c) => causes.counts[c] > 0);
  const causeTake = causes.total === 0 ? null
    : causes.known === 0
      ? { tone: 'info', text: '퍼트 거리를 기록하면 3퍼트가 거리감 때문인지, 짧은 퍼트 미스인지 알려드려요.' }
      : { tone: 'warn', text: `가장 큰 원인은 ${PUTT_CAUSE_LABEL[causes.dominant]}예요. ${CAUSE_ADVICE[causes.dominant]}` };

  return (
    <div data-role="tab-putting">
      <Card id="putting" title="PUTTING · 퍼팅" right={<TrendChip delta={putting.trend?.delta} goodWhen="down" digits={1} unit="개" flat={0.3} id="trend-putting" label="최근 5R" />}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
          <Metric id="m-putts" value={fmtNum(putting.per18)} unit="개" label="18홀 퍼트 수" sub={`홀당 ${fmtNum(putting.perHole, 2)}개 · ${putting.holes}홀`} />
          {putting.perGir != null && <Metric id="m-putts-gir" value={fmtNum(putting.perGir, 2)} unit="개" label="그린 올린 홀" sub={`${putting.girHoles}홀 평균`} align="right" />}
        </div>
        <SplitBar id="putts-bar" segments={[
          { key: 'one', label: '1퍼트', pct: putting.one.pct ?? 0, count: `${putting.one.n}홀`, color: COLOR.green },
          { key: 'two', label: '2퍼트', pct: putting.two.pct ?? 0, count: `${putting.two.n}홀`, color: COLOR.blue },
          { key: 'three', label: '3퍼트+', pct: putting.three.pct ?? 0, count: `${putting.three.n}홀`, color: COLOR.red },
        ]} />
        <Takeaway tone={puttTake.tone}>{puttTake.text}</Takeaway>
      </Card>

      <Card id="putt-distance" title="BY DISTANCE · 거리별 성공률" info={<><p>퍼트마다 거리와 홀인 결과를 기록한 것만 셌어요. 막대는 그 거리에서 넣은 비율이에요.</p></>}>
        {distRows.length > 0 ? (
          <>
            {distRows.map((b) => (
              <RateRow key={b.id} id={`putt-bucket-${b.id}`} label={b.label} sub={`${b.made}/${b.total}`} value={b.ratePct} text={fmtPct(b.ratePct)} tier={b.tier}
                color={b.ratePct >= 60 ? COLOR.green : b.ratePct >= 30 ? COLOR.amber : COLOR.slate} />
            ))}
            {zoneTake && <Takeaway tone={zoneTake.tone} id="zone-take">{zoneTake.text}</Takeaway>}
          </>
        ) : <Hint>퍼트 거리와 결과를 기록하면 거리별 성공률을 보여드려요.</Hint>}
      </Card>

      <Card id="three-putt" title="3-PUTT · 3퍼트 원인" info={<>
        <p>3퍼트가 난 홀을 퍼트 거리로 나눠요. 거리가 기록되지 않았으면 원인을 짐작하지 않고 "판단 보류"로 둬요.</p>
      </>} right={causes.total > 0 && <ConfidenceBadge tier={causes.known >= 8 ? 'high' : causes.known >= 4 ? 'mid' : 'low'} />}>
        {causes.total > 0 ? (
          <>
            <div style={{ fontSize: 14, color: COLOR.muted, marginBottom: 4 }}>3퍼트 이상 <b style={{ color: COLOR.text }}>{causes.total}홀</b></div>
            {causeRows.map((c) => (
              <RateRow key={c} id={`cause-${c}`} label={PUTT_CAUSE_LABEL[c]} value={(causes.counts[c] / causes.total) * 100} text={`${causes.counts[c]}홀`}
                color={c === 'unknown' ? '#8896b0' : c === causes.dominant ? COLOR.red : COLOR.amber} labelWidth={110} />
            ))}
            {causeTake && <Takeaway tone={causeTake.tone}>{causeTake.text}</Takeaway>}
          </>
        ) : <Hint>3퍼트가 없었어요. 잘하고 있어요.</Hint>}
      </Card>
    </div>
  );
}
