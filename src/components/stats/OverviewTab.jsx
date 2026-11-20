import { tintWash } from '../ui/tint.js';
import { Card, Metric, SplitBar, Takeaway, TrendChip, Hint } from './widgets.jsx';
import { COLOR, fmtNum, fmtPct, fmtSigned } from './format.js';
import { roundDateLabel } from '../../engine/dateLabel.js';

const SKILL_LABEL = { tee: '티샷', approach: '어프로치', shortGame: '숏게임', putting: '퍼팅' };

// 종합 — 스코어 · 영역별 요약(내 게임) · 타수가 새는 곳 · 스코어 구성
// 요약 화면이라 카드마다 꼭 필요한 숫자만 둔다 (2026-11-20 "숫자가 너무 많다"는 요청).
//   - 같은 숫자를 두 번 말하지 않는다 (위 칩과 아래 문장, 막대 옆 숫자와 아래 문장)
//   - 자세한 숫자(좌우 미스 · 홀 수 · 횟수 · OB/해저드 나눔)는 각 탭과 인사이트에 있다 — 칸을 누르면 넘어간다
//   - 스코어 막대는 가장 최근 막대에만 타수, 날짜는 처음과 끝 두 개만
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

  // 영역마다 대표 숫자 하나 + "최근 좋아짐/나빠짐/비슷" (자세한 숫자는 칸을 눌러 넘어간 탭에서)
  const tiles = [
    { id: 'tee', value: fmtPct(tee.hitPct), label: '페어웨이 적중',
      trend: <TrendChip words delta={tee.trend?.delta} id="trend-tee" label="최근" /> },
    { id: 'approach', value: fmtPct(approach.gir.pct), label: '그린 적중 (GIR)',
      trend: <TrendChip words delta={approach.gir.trend?.delta} id="trend-approach" label="최근" /> },
    { id: 'shortGame', value: fmtPct(shortGame.ratePct), label: '스크램블링',
      trend: <TrendChip words delta={shortGame.trend?.delta} id="trend-shortGame" label="최근" /> },
    { id: 'putting', value: fmtNum(putting.per18), unit: '개', label: '18홀 퍼트 수',
      trend: <TrendChip words delta={putting.trend?.delta} id="trend-putting" goodWhen="down" digits={1} unit="개" flat={0.3} label="최근" /> },
  ];
  const tagOf = (id) => (balance?.weakest === id ? 'weak' : balance?.strongest === id ? 'strong' : null);

  // 잃는 타수는 바로 위 줄 오른쪽에 적혀 있어서 문장에서는 숫자를 되풀이하지 않는다
  const penaltyStrokes = leaks.penaltyStrokesPerRound;
  const threeStrokes = leaks.threePutt.extraStrokesPerRound;
  const leakTake = (() => {
    if (threeStrokes < 0.15 && penaltyStrokes < 0.15) return { tone: 'good', text: '3퍼트와 벌타로 잃는 타수가 거의 없어요.' };
    // 한쪽이 거의 없으면 "벌타보다 더" 처럼 없는 것과 견주지 않고, 있는 쪽만 말한다
    if (penaltyStrokes < 0.15) return { tone: 'warn', text: '잃는 타수는 거의 3퍼트에서 나와요. 벌타로는 거의 잃지 않아요. 첫 퍼트를 홀 가까이 붙이는 연습이 먼저예요.' };
    if (threeStrokes < 0.15) return { tone: 'warn', text: '잃는 타수는 거의 벌타에서 나와요. 3퍼트로는 거의 잃지 않아요. 티샷·어프로치 공략이 먼저예요.' };
    const diff = penaltyStrokes - threeStrokes;
    if (Math.abs(diff) < 0.3) return { tone: 'info', text: '3퍼트와 벌타로 잃는 타수가 비슷해요.' };
    return diff > 0
      ? { tone: 'warn', text: '벌타로 잃는 타수가 3퍼트보다 많아요. 티샷·어프로치 공략이 먼저예요.' }
      : { tone: 'warn', text: '3퍼트로 잃는 타수가 벌타보다 많아요. 첫 퍼트를 홀 가까이 붙이는 연습이 먼저예요.' };
  })();
  const leakMax = Math.max(threeStrokes, penaltyStrokes, 0.01);

  const parWorst = composition.byPar.length > 0
    ? composition.byPar.reduce((w, c) => (c.avgDiff > w.avgDiff ? c : w)) : null;

  const trendFirst = score.trend[0];
  const trendLast = score.trend[score.trend.length - 1];

  return (
    <div data-role="tab-overview">
      <Card id="score" title="SCORE · 스코어">
        {score.rounds > 0 ? (
          <div style={{ display: 'flex', gap: 32 }}>
            <Metric id="m-avg" value={fmtNum(score.avg)} unit="타" label="평균" />
            <Metric id="m-best" value={score.best.total} unit="타" label="베스트" sub={score.best.course || null} />
          </div>
        ) : (
          <div data-role="score-empty" style={{ fontSize: 14, color: COLOR.muted, lineHeight: 1.6 }}>18홀 라운드가 기록되면 평균·베스트·추세를 보여 드려요.</div>
        )}
        {score.trend.length > 1 && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 96, marginTop: 14 }} data-role="score-trend">
              {score.trend.map((t, i) => {
                const h = ((t.total - minTotal) / range) * 55 + 25;
                const last = i === score.trend.length - 1;
                return (
                  <div key={t.id ?? i} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    {last && <div data-role="trend-last" style={{ fontSize: 13, fontWeight: 800, color: COLOR.goldHi, marginBottom: 3 }}>{t.total}</div>}
                    <div style={{ width: '70%', maxWidth: 22, height: `${h}%`, borderRadius: '4px 4px 0 0', background: last ? COLOR.gold : 'rgba(27,100,218,0.4)' }} />
                  </div>
                );
              })}
            </div>
            <div data-role="trend-dates" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: COLOR.faint, marginTop: 4 }}>
              <span data-role="trend-date">{roundDateLabel(trendFirst.date)}</span>
              <span data-role="trend-date">{roundDateLabel(trendLast.date)}</span>
            </div>
            <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 6 }}>최근 {score.trend.length}라운드 · 막대가 낮을수록 타수가 적어요</div>
          </>
        )}
        <Takeaway tone={scoreTake.tone}>{scoreTake.text}</Takeaway>
      </Card>

      <Card id="skills" title="내 게임" info={<>
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
                style={{ ...tintWash(c, { strength: tag ? 0.14 : 0.08, border: tag ? 0.5 : 0.2, base: '#f2f4f6' }), borderRadius: 14, padding: '11px 12px 10px', textAlign: 'left', cursor: 'pointer', color: COLOR.text, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#333d4b' }}>{SKILL_LABEL[t.id]}</span>
                  {tag && <span data-role={`tag-${tag}`} style={{ fontSize: 12, fontWeight: 800, color: c, border: `1px solid ${c}`, borderRadius: 999, padding: '1px 7px' }}>{tag === 'weak' ? '약점' : '강점'}</span>}
                </div>
                <Metric value={t.value} unit={t.unit} label={t.label} />
                <div style={{ marginTop: 2, minHeight: 20 }}>{t.trend}</div>
              </button>
            );
          })}
        </div>
        {balance?.weakest === 'penalty' && (
          <Takeaway tone="warn" id="takeaway-penalty">가장 큰 손실은 어느 영역이 아니라 벌타예요. 아래 "타수가 새는 곳"을 먼저 보세요.</Takeaway>
        )}
      </Card>

      <Card id="leaks" title="LEAKS · 타수가 새는 곳" info={<>
        <p>라운드당 잃는 타수의 근사값이에요. 3퍼트는 두 번 넘게 친 퍼트 수, 벌타는 OB 2타 · 해저드와 언플레이어블 1타로 셌어요.</p>
        <p>횟수(3퍼트 · OB · 해저드)는 퍼팅 · 티샷 탭과 인사이트에서 볼 수 있어요.</p>
      </>} right={<span style={{ fontSize: 13, color: COLOR.faint }}>라운드당</span>}>
        {[['3퍼트', threeStrokes, COLOR.amber, 'leak-three'],
          ['벌타', penaltyStrokes, COLOR.red, 'leak-penalty']].map(([label, strokes, color, id]) => (
          <div key={id} data-role={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ width: 52, fontSize: 14, fontWeight: 800 }}>{label}</div>
            <div style={{ flex: 1, minWidth: 0, height: 8, borderRadius: 4, background: COLOR.track, overflow: 'hidden' }}>
              <div style={{ width: `${(strokes / leakMax) * 100}%`, height: '100%', borderRadius: 4, background: color, minWidth: strokes > 0 ? 4 : 0 }} />
            </div>
            <div data-role={`${id}-strokes`} style={{ width: 60, textAlign: 'right', fontSize: 16, fontWeight: 900 }}>{strokes < 0.05 ? '0' : `−${fmtNum(strokes)}`}<span style={{ fontSize: 13, color: COLOR.muted, fontWeight: 700 }}>타</span></div>
          </div>
        ))}
        <Takeaway tone={leakTake.tone}>{leakTake.text}</Takeaway>
      </Card>

      <Card id="composition" title="HOLES · 스코어 구성">
        {composition.total > 0 ? (
          <>
            <SplitBar id="composition-bar" segments={[
              { key: 'birdie', label: '버디↑', pct: (composition.counts.birdie / composition.total) * 100, color: COLOR.green },
              { key: 'par', label: '파', pct: (composition.counts.par / composition.total) * 100, color: COLOR.blue },
              { key: 'bogey', label: '보기', pct: (composition.counts.bogey / composition.total) * 100, color: COLOR.slate },
              { key: 'double', label: '더블+', pct: (composition.counts.double / composition.total) * 100, color: COLOR.red },
            ]} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              {composition.byPar.map((p) => (
                <div key={p.par} data-role={`par-${p.par}`} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', background: COLOR.track, borderRadius: 12, border: `1px solid ${p === parWorst && composition.byPar.length > 1 ? COLOR.red : 'transparent'}` }}>
                  <div style={{ fontSize: 12, color: COLOR.muted, fontWeight: 700, letterSpacing:'0' }}>파 {p.par}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 3, color: p === parWorst && composition.byPar.length > 1 ? COLOR.red : COLOR.text }}>{fmtSigned(p.avgDiff, 2)}</div>
                  <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 2 }}>홀당</div>
                </div>
              ))}
            </div>
            {parWorst && composition.byPar.length > 1 && (
              <Takeaway tone="info">파 {parWorst.par} 홀에서 가장 많이 잃어요.</Takeaway>
            )}
          </>
        ) : <Hint>홀 기록이 쌓이면 보여요.</Hint>}
      </Card>
    </div>
  );
}
