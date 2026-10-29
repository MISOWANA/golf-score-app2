import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Card, Metric, SplitBar, RateRow, Takeaway, TrendChip, Hint } from './widgets.jsx';
import { COLOR, fmtNum, fmtPct, fmtSigned } from './format.js';
import { PUTT_CAUSE_LABEL, PUTT_CAUSE_ORDER } from '../../engine/puttAnalysis.js';
import { sgTier } from '../../engine/strokesGained.js';
import { PuttDistancePanel, PuttMissPanel, PuttPacePanel, PuttLinePanel, PuttLiePanel, PuttLagPanel, PuttForPanel } from './PuttingDetailPanels.jsx';

const CAUSE_ADVICE = {
  lag: '롱 퍼트는 홀보다 1m 원 안에 세우는 거리 연습이 먼저예요.',
  short: '1.5m 안쪽 퍼트는 같은 루틴으로 끝까지 마무리하는 연습이 먼저예요.',
  both: '롱 퍼트를 붙이는 연습과 1.5m 안쪽 마무리 연습이 둘 다 필요해요.',
  mid: '3~6m는 홀 주변 60cm 원에 세우는 속도를 먼저 맞춰 보세요.',
  close: '가까운 거리는 홀 뒤 30cm를 넘기지 않는 속도로 쳐 보세요.',
};

// 퍼팅 — 라운드당 퍼트 · 거리별 성공률 · 어떻게 빗나가나(미스 위치 · 거리감 · 라인) · 라이별 · 첫 퍼트 붙이기 · 3퍼트 원인 (숏게임은 '숏게임' 탭)
// 거리 · 라이 · 미스 위치를 합친 계산은 engine/puttingDetail.js — 인사이트의 퍼팅 섹션도 같은 부품(PuttingDetailPanels)을 쓴다.
export default function PuttingTab({ report }) {
  const { putting } = report;
  if (putting.holes === 0) {
    return <div data-role="tab-putting"><Hint id="putting-empty">퍼트 수를 기록한 홀이 쌓이면 거리별 성공률과 3퍼트 원인을 보여드려요.</Hint></div>;
  }
  const d = putting.detail;

  const threePct = putting.three.pct ?? 0;
  const puttTake = threePct >= 15
    ? { tone: 'warn', text: `3퍼트가 ${fmtPct(threePct)} (${putting.three.n}홀)예요. 퍼트로 새는 타수는 대부분 여기서 나와요.` }
    : putting.one.pct != null && putting.one.pct >= 15
      ? { tone: 'good', text: `원퍼트 ${fmtPct(putting.one.pct)}, 3퍼트 ${fmtPct(threePct)} — 퍼트가 안정적이에요.` }
      : { tone: 'info', text: `3퍼트는 ${fmtPct(threePct)} (${putting.three.n}홀)예요.` };

  // 위 표의 1-2m 줄과 같은 숫자를 쓴다 (인사이트의 3~7피트 구간은 범위가 달라 따로 보여준다)
  const zone = putting.byDistance.find((b) => b.id === '1to2');
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
        {d.sg.measured ? (
          <div data-role="putt-sg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, padding: '8px 10px', borderRadius: 8, background: '#0e1424', border: `1px solid ${COLOR.line}` }}>
            <span style={{ fontSize: 14, color: '#8ca4bc', fontWeight: 700 }}>투어 평균 대비 퍼팅 SG</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b data-role="putt-sg-value" style={{ fontSize: 17, fontVariantNumeric: 'tabular-nums', color: d.sg.perRound >= 0 ? COLOR.green : COLOR.red }}>
                {fmtSigned(d.sg.perRound, 2)}<span style={{ fontSize: 12, fontWeight: 700, color: COLOR.muted, marginLeft: 2 }}>/R</span>
              </b>
              <ConfidenceBadge tier={sgTier(d.sg.strokes)} />
            </span>
          </div>
        ) : (
          <div data-role="putt-sg-pending" style={{ fontSize: 13, color: COLOR.faint, marginTop: 10, lineHeight: 1.5 }}>퍼트 거리를 기록하면 투어 평균 대비 얻은 · 잃은 타수(SG)를 보여드려요.</div>
        )}
        <Takeaway tone={puttTake.tone}>{puttTake.text}</Takeaway>
      </Card>

      <Card id="putt-distance" title="BY DISTANCE · 거리별 성공률" info={<>
        <p>퍼트마다 거리와 홀인 결과를 기록한 것만 셌어요. 막대는 그 거리에서 넣은 비율이에요.</p>
        <p>"빗나가면 남음"은 빗나간 퍼트가 멈춘 자리(미스 위치)나 다음 퍼트 거리로 잰 중앙값이에요. "투어 대비 SG"는 그 거리의 퍼트 한 번이 투어 평균보다 평균 몇 타를 아꼈는지(Strokes Gained)예요 — 홀에 붙이는 것까지 합친 값이에요.</p>
      </>}>
        <PuttDistancePanel rows={putting.byDistance} />
        {zoneTake && <Takeaway tone={zoneTake.tone} id="zone-take">{zoneTake.text}</Takeaway>}
      </Card>

      {d.n.withMiss === 0 ? (
        <Card id="putt-miss" title="MISS ANALYSIS · 미스 분석">
          <Hint id="miss-empty">퍼팅 탭의 "미스 위치" 판에서 빗나간 퍼트가 멈춘 곳을 찍으면, 어느 쪽으로 빗나가는지(미스 위치 과녁) · 홀에 못 미치는지 지나치는지(거리감) · 하이/로우사이드(라인)를 분석해 드려요.</Hint>
        </Card>
      ) : (
        <>
        <Card id="putt-miss" title="MISS MAP · 미스 위치" info={<>
          <p>퍼팅 탭의 "미스 위치" 판에서 찍은, 빗나간 퍼트가 멈춘 자리를 모아서 그려요. 퍼트마다 공에서 홀로 가는 라인이 위를 향하게 맞춰 겹쳤어요.</p>
          <p>흰 점은 평균 위치(쏠림), 점선 타원은 흩어짐이에요. 쏠림은 늘 한쪽으로 치우치는 정도, 흩어짐은 퍼트마다 달라지는 정도예요. 점 색은 하이/로우사이드를 가려요.</p>
        </>}>
          <PuttMissPanel map={d.missMap} />
        </Card>

        <Card id="putt-pace" title="PACE · 거리감 (롱 · 숏)" info={<>
          <p>빗나간 퍼트가 홀에 못 미쳤는지(숏), 홀 높이에 멈췄는지(핀하이), 지나쳤는지(롱)를 센 거예요. 어느 쪽이 맞는 모습인지는 앱이 정하지 않아요.</p>
          <p>경사별 · 거리별로 나누면 오르막에서 짧아지는지, 먼 퍼트에서 지나치는지 같은 내 습관을 볼 수 있어요.</p>
        </>}>
          <PuttPacePanel pace={d.pace} />
        </Card>

        <Card id="putt-line" title="LINE · 라인 (좌우 · 하이/로우사이드)" info={<>
          <p>하이사이드는 홀보다 높은(공이 덜 휘는) 쪽, 로우사이드는 낮은(공이 휘어 내려가는) 쪽으로 홀 옆을 지난 거예요. 훅은 왼쪽이, 슬라이스는 오른쪽이 로우사이드예요.</p>
          <p>S자는 홀 앞쪽의 휨을 기준으로 해요. 직선 라이는 하이/로우사이드가 없어서 라인 기준 왼쪽 · 오른쪽으로 나눠요.</p>
        </>}>
          <PuttLinePanel line={d.line} />
        </Card>

        </>
      )}

      <Card id="putt-lie" title="BY LIE · 라이별 성공률" info={<>
        <p>퍼팅 탭에서 퍼트마다 고른 라이(경사 × 휨)별 성공률이에요. 입력할 때 쓰는 칸과 같은 배치예요. 표본이 3개 미만인 칸은 색을 칠하지 않아요.</p>
      </>}>
        <PuttLiePanel byLie={d.byLie} />
      </Card>

      <Card id="putt-lag" title="FIRST PUTT · 첫 퍼트 붙이기" info={<>
        <p>첫 퍼트를 시작한 거리대마다, 한 번에 넣은 비율 · 1m 안에서 끝낸 비율(넣었거나 1m 안에 남긴 것) · 3퍼트 비율을 보여 줘요.</p>
        <p>"빗나가면 남김"은 첫 퍼트가 멈춘 자리에서 홀까지 거리의 중앙값이에요. 멈춘 자리를 기록하지 않았으면 두 번째 퍼트 거리를 써요.</p>
      </>}>
        <PuttLagPanel lag={d.lag} comeback={d.comeback} threePutt={d.threePutt} />
      </Card>

      <Card id="putt-for" title="PUTT FOR · 어떤 퍼트였나" info={<>
        <p>그 홀의 첫 퍼트가 들어가면 버디(그린에 규정 타수보다 2타 적게 올린 홀) · 파 · 보기 이상이었을 퍼트로 나눠서 성공률을 봐요. 칩으로 올린 홀은 칩 타수를 빼고 세요.</p>
      </>}>
        <PuttForPanel forScore={d.forScore} />
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
