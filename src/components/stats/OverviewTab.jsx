import { tintWash } from '../ui/tint.js';
import { Card, Metric, SplitBar, Takeaway, TrendChip, Hint } from './widgets.jsx';
import { COLOR, fmtNum, fmtPct, fmtSigned } from './format.js';

const SKILL_LABEL = { tee: '티샷', approach: '어프로치', shortGame: '숏게임', putting: '퍼팅' };

// 막대 밑 날짜 — 폭이 좁아 '10/14' 로 줄여 한 줄에 둔다
const shortDate = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}`; };

// 종합 — 스코어 · 영역별 요약(MY GAME) · 타수가 새는 곳 · 스코어 구성
export default function OverviewTab({ report, onGo }) {
  const { score, composition, leaks, tee, approach, shortGame, putting, balance } = report;
  const maxTotal = Math.max(...score.trend.map((t) => t.total));
  const minTotal = Math.min(...score.trend.map((t) => t.total));
  const range = maxTotal - minTotal || 1;

  const imp = score.improvement;
  const scoreTake = imp == null
    ? { tone: 'info', text: '이전 3라운드가 쌓이면 최근 5라운드와 비교해 드려요.' }
    : imp >= 1 ? { tone: 'good', text: `최근 5라운드는 그 이전보다 평균 ${fmtNum(imp)}타 덜 쳤어요.` }
      : imp <= -1 ? { tone: 'warn', text: `최근 5라운드는 그 이전보다 평균 ${fmtNum(-imp)}타 더 쳤어요.` }
        : { tone: 'info', text: '최근 5라운드와 그 이전의 평균 타수가 비슷해요 (±1타 안).' };

  const girPer18 = approach.gir.pct != null ? (approach.gir.pct * 18) / 100 : null;
  const tiles = [
    { id: 'tee', value: fmtPct(tee.hitPct), label: '페어웨이 적중',
      sub: tee.total >= 10 ? `왼쪽 미스 ${fmtPct(tee.leftPct)} · 오른쪽 ${fmtPct(tee.rightPct)}` : '기록이 쌓이면 보여요',
      trend: <TrendChip delta={tee.trend?.delta} id="trend-tee" label="최근" /> },
    { id: 'approach', value: fmtPct(approach.gir.pct), label: '그린 적중 (GIR)',
      sub: girPer18 != null ? `18홀에 ${fmtNum(girPer18)}홀 적중` : '기록이 쌓이면 보여요',
      trend: <TrendChip delta={approach.gir.trend?.delta} id="trend-approach" label="최근" /> },
    { id: 'shortGame', value: fmtPct(shortGame.ratePct), label: '스크램블링',
      sub: shortGame.attempts > 0 ? `그린 놓친 ${shortGame.attempts}홀 중 ${shortGame.saves}홀 파 세이브` : '그린을 놓친 홀이 아직 없어요',
      trend: <TrendChip delta={shortGame.trend?.delta} id="trend-shortGame" label="최근" /> },
    { id: 'putting', value: fmtNum(putting.per18), unit: '개', label: '18홀 퍼트 수',
      sub: putting.holes > 0 ? `3퍼트 ${fmtPct(putting.three.pct)}` : '기록이 쌓이면 보여요',
      trend: <TrendChip delta={putting.trend?.delta} id="trend-putting" goodWhen="down" digits={1} unit="개" flat={0.3} label="최근" /> },
  ];
  const HEADLINE = { tee: ['티샷', `페어웨이 ${fmtPct(tee.hitPct)}`], approach: ['어프로치', `그린 적중 ${fmtPct(approach.gir.pct)}`], shortGame: ['숏게임', `스크램블링 ${fmtPct(shortGame.ratePct)}`], putting: ['퍼팅', `18홀 ${fmtNum(putting.per18)}퍼트`] };
  const sentence = [balance?.strongest && HEADLINE[balance.strongest] ? `강점은 ${HEADLINE[balance.strongest][0]}(${HEADLINE[balance.strongest][1]})` : null,
    balance?.weakest && HEADLINE[balance.weakest] ? `약점은 ${HEADLINE[balance.weakest][0]}(${HEADLINE[balance.weakest][1]})` : null].filter(Boolean).join(', ');
  const tagOf = (id) => (balance?.weakest === id ? 'weak' : balance?.strongest === id ? 'strong' : null);

  const penaltyStrokes = leaks.penaltyStrokesPerRound;
  const threeStrokes = leaks.threePutt.extraStrokesPerRound;
  const leakTake = (() => {
    if (threeStrokes < 0.15 && penaltyStrokes < 0.15) return { tone: 'good', text: '3퍼트와 벌타로 잃는 타수가 거의 없어요.' };
    const diff = penaltyStrokes - threeStrokes;
    if (Math.abs(diff) < 0.3) return { tone: 'info', text: `3퍼트와 벌타로 라운드당 약 ${fmtNum(threeStrokes + penaltyStrokes)}타를 잃어요. 둘이 비슷해요.` };
    return diff > 0
      ? { tone: 'warn', text: `벌타가 3퍼트보다 라운드당 ${fmtNum(diff)}타 더 잃게 해요. 티샷·어프로치 공략이 먼저예요.` }
      : { tone: 'warn', text: `3퍼트가 벌타보다 라운드당 ${fmtNum(-diff)}타 더 잃게 해요. 첫 퍼트를 홀 가까이 붙이는 연습이 먼저예요.` };
  })();
  const leakMax = Math.max(threeStrokes, penaltyStrokes, 0.01);

  const parWorst = composition.byPar.length > 0
    ? composition.byPar.reduce((w, c) => (c.avgDiff > w.avgDiff ? c : w)) : null;

  return (
    <div data-role="tab-overview">
      <Card id="score" title="SCORE · 스코어" right={score.improvement != null && <TrendChip delta={-score.improvement} goodWhen="down" digits={1} unit="타" flat={1} label="최근 5R" id="trend-score" />}>
        {score.rounds > 0 ? (
          <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between' }}>
            <Metric id="m-avg" value={fmtNum(score.avg)} unit="타" label="평균" sub={`파 대비 ${fmtSigned(score.avgDiff)}`} />
            <Metric id="m-best" value={score.best.total} unit="타" label="베스트" sub={score.best.course || fmtSigned(score.best.diff, 0)} />
            <Metric id="m-rounds" value={score.rounds} unit="R" label="라운드" align="right" />
          </div>
        ) : (
          <div data-role="score-empty" style={{ fontSize: 14, color: COLOR.muted, lineHeight: 1.6 }}>18홀 라운드가 기록되면 평균·베스트·추세를 보여 드려요.</div>
        )}
        {score.trend.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96, marginTop: 14 }} data-role="score-trend">
            {score.trend.map((t, i) => {
              const h = ((t.total - minTotal) / range) * 55 + 25;
              const last = i === score.trend.length - 1;
              return (
                <div key={t.id ?? i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: last ? COLOR.goldHi : COLOR.muted, marginBottom: 3 }}>{t.total}</div>
                  <div style={{ width: '70%', maxWidth: 22, height: `${h}%`, borderRadius: '4px 4px 0 0', background: last ? COLOR.gold : 'rgba(201,162,40,0.4)' }} />
                  <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 4, whiteSpace: 'nowrap' }}>{shortDate(t.date)}</div>
                </div>
              );
            })}
          </div>
        )}
        {score.trend.length > 1 && <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 6 }}>최근 {score.trend.length}라운드 · 막대가 낮을수록 타수가 적어요</div>}
        <Takeaway tone={scoreTake.tone}>{scoreTake.text}</Takeaway>
      </Card>

      <Card id="skills" title="MY GAME" info={<>
        <p>영역마다 대표 숫자 하나만 보여요. 누르면 그 영역의 자세한 숫자로 넘어가요.</p>
        <p>"최근"은 최근 5라운드가 그 이전보다 좋아졌는지예요. 표본이 적으면 표시하지 않아요.</p>
        <p>강점·약점은 투어 평균과 비교한 샷별 손익(측정된 샷이 충분할 때) 또는 스코어 기준 손실로 정해요.</p>
      </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tiles.map((t) => {
            const tag = tagOf(t.id);
            const c = tag === 'weak' ? COLOR.red : tag === 'strong' ? COLOR.green : COLOR.gold;
            return (
              <button key={t.id} type="button" data-role={`skill-${t.id}`} data-tag={tag ?? ''} onClick={() => onGo(t.id === 'shortGame' ? 'short' : t.id)}
                style={{ ...tintWash(c, { strength: tag ? 0.14 : 0.08, border: tag ? 0.5 : 0.2, base: '#111827' }), borderRadius: 14, padding: '11px 12px 10px', textAlign: 'left', cursor: 'pointer', color: COLOR.text, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#c4cfe0' }}>{SKILL_LABEL[t.id]}</span>
                  {tag && <span data-role={`tag-${tag}`} style={{ fontSize: 12, fontWeight: 800, color: c, border: `1px solid ${c}`, borderRadius: 999, padding: '1px 7px' }}>{tag === 'weak' ? '약점' : '강점'}</span>}
                </div>
                <Metric value={t.value} unit={t.unit} label={t.label} sub={t.sub} />
                <div style={{ marginTop: 2, minHeight: 20 }}>{t.trend}</div>
              </button>
            );
          })}
        </div>
        {sentence && <Takeaway tone="info" id="skills-sentence">{sentence}예요.</Takeaway>}
        {balance?.weakest === 'penalty' && (
          <Takeaway tone="warn" id="takeaway-penalty">가장 큰 손실은 어느 영역이 아니라 벌타예요. 아래 "타수가 새는 곳"을 먼저 보세요.</Takeaway>
        )}
      </Card>

      <Card id="leaks" title="LEAKS · 타수가 새는 곳" info={<>
        <p>라운드당 잃는 타수의 근사값이에요. 3퍼트는 두 번 넘게 친 퍼트 수, 벌타는 OB 2타 · 해저드와 언플레이어블 1타로 셌어요.</p>
      </>} right={<span style={{ fontSize: 13, color: COLOR.faint }}>라운드당</span>}>
        {[['3퍼트', threeStrokes, `${fmtNum(leaks.threePutt.perRound)}회`, COLOR.amber, 'leak-three'],
          ['벌타', penaltyStrokes, `OB ${fmtNum(leaks.ob.perRound)} · 해저드 ${fmtNum(leaks.hazard.perRound)}회`, COLOR.red, 'leak-penalty']].map(([label, strokes, sub, color, id]) => (
          <div key={id} data-role={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ width: 52, fontSize: 14, fontWeight: 800 }}>{label}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 8, borderRadius: 4, background: COLOR.track, overflow: 'hidden' }}>
                <div style={{ width: `${(strokes / leakMax) * 100}%`, height: '100%', borderRadius: 4, background: color, minWidth: strokes > 0 ? 4 : 0 }} />
              </div>
              <div style={{ fontSize: 13, color: COLOR.faint, marginTop: 4 }}>{sub}</div>
            </div>
            <div data-role={`${id}-strokes`} style={{ width: 60, textAlign: 'right', fontSize: 16, fontWeight: 900 }}>−{fmtNum(strokes)}<span style={{ fontSize: 13, color: COLOR.muted, fontWeight: 700 }}>타</span></div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <div data-role="leak-double" style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: COLOR.track, fontSize: 13, color: COLOR.muted }}>
            더블보기 이상 <b style={{ display: 'block', fontSize: 17, color: COLOR.text }}>{fmtNum(leaks.doubleHoles.perRound)}홀</b>
          </div>
        </div>
        <Takeaway tone={leakTake.tone}>{leakTake.text}</Takeaway>
      </Card>

      <Card id="composition" title="HOLES · 스코어 구성">
        {composition.total > 0 ? (
          <>
            <SplitBar id="composition-bar" segments={[
              { key: 'birdie', label: '버디↑', pct: (composition.counts.birdie / composition.total) * 100, count: `${composition.counts.birdie}홀`, color: COLOR.green },
              { key: 'par', label: '파', pct: (composition.counts.par / composition.total) * 100, count: `${composition.counts.par}홀`, color: COLOR.blue },
              { key: 'bogey', label: '보기', pct: (composition.counts.bogey / composition.total) * 100, count: `${composition.counts.bogey}홀`, color: COLOR.slate },
              { key: 'double', label: '더블+', pct: (composition.counts.double / composition.total) * 100, count: `${composition.counts.double}홀`, color: COLOR.red },
            ]} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {composition.byPar.map((p) => (
                <div key={p.par} data-role={`par-${p.par}`} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: COLOR.track, borderRadius: 12, border: `1px solid ${p === parWorst && composition.byPar.length > 1 ? COLOR.red : 'transparent'}` }}>
                  <div style={{ fontSize: 12, color: COLOR.muted, fontWeight: 700, letterSpacing: '0.06em' }}>PAR {p.par}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 3, color: p === parWorst && composition.byPar.length > 1 ? COLOR.red : COLOR.text }}>{fmtSigned(p.avgDiff, 2)}</div>
                  <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 2 }}>{p.count}홀 평균</div>
                </div>
              ))}
            </div>
            {parWorst && composition.byPar.length > 1 && (
              <Takeaway tone="info">파 {parWorst.par} 홀에서 가장 많이 잃어요 (홀당 {fmtSigned(parWorst.avgDiff, 2)}타).</Takeaway>
            )}
          </>
        ) : <Hint>홀 기록이 쌓이면 보여요.</Hint>}
      </Card>
    </div>
  );
}
