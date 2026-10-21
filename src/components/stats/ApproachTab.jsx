import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Card, Metric, RateRow, Takeaway, TrendChip, Hint, SplitBar } from './widgets.jsx';
import { COLOR, fmtMeters, fmtNum, fmtPct } from './format.js';

const MIN_BEST_WORST = 5;      // 가장 잘/못 맞는 구간·클럽을 말하려면 필요한 샷 수

// 가장 높은/낮은 한 줄을 뽑는다 (표본이 충분한 줄만, 둘이 달라야 의미가 있다)
function bestWorst(rows, min = MIN_BEST_WORST) {
  const ok = rows.filter((r) => r.n >= min && r.hitPct != null);
  if (ok.length < 2) return null;
  const best = ok.reduce((a, b) => (b.hitPct > a.hitPct ? b : a));
  const worst = ok.reduce((a, b) => (b.hitPct < a.hitPct ? b : a));
  return best === worst || best.hitPct - worst.hitPct < 10 ? null : { best, worst };
}

const DIRECTION = [['long', 'LONG', '넘침'], ['right', 'RIGHT', '오른쪽'], ['short', 'SHORT', '짧음'], ['left', 'LEFT', '왼쪽']];

// 어프로치 — 그린 적중 · 거리 구간별 · 클럽별 · 그린에 떨어진 방향
export default function ApproachTab({ report }) {
  const { approach } = report;
  const { gir, girp, conversion, firstPutt, byDistance, byLie, landing } = approach;
  if (gir.holes === 0) {
    return <div data-role="tab-approach"><Hint id="approach-empty">그린 적중을 기록한 홀이 쌓이면 거리 구간별·클럽별 적중률을 보여드려요.</Hint></div>;
  }

  const parRows = gir.byPar.filter((p) => p.n >= 3);
  const worstPar = parRows.length > 1 ? parRows.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const bestPar = parRows.length > 1 ? parRows.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;
  const girTake = worstPar && bestPar && bestPar.pct - worstPar.pct >= 15
    ? { tone: 'info', text: `파 ${worstPar.par} 홀의 그린 적중이 가장 낮아요 (${fmtPct(worstPar.pct)}). 가장 높은 파 ${bestPar.par} 홀은 ${fmtPct(bestPar.pct)}예요.` }
    : { tone: 'info', text: `그린을 놓친 홀이 ${gir.holes - gir.hit}개 (${fmtPct(100 - gir.pct)}) — 놓친 뒤의 결과는 퍼팅 탭의 숏게임에서 볼 수 있어요.` };

  const distRows = byDistance.filter((b) => b.id !== 'lt80' && b.n > 0);     // 80m 안 샷은 숏게임(퍼팅 탭)에서 본다
  const dist = bestWorst(distRows);
  const distTake = dist
    ? { tone: 'info', text: `${dist.best.label}에서 가장 잘 올리고 (${fmtPct(dist.best.hitPct)}), ${dist.worst.label}에서 가장 약해요 (${fmtPct(dist.worst.hitPct)}).` }
    : null;

  const clubRows = approach.clubs;
  const club = bestWorst(clubRows.map((r) => ({ ...r, n: r.hitN })), 5);
  const clubTake = club
    ? { tone: 'info', text: `${club.best.label}은 그린 적중 ${fmtPct(club.best.hitPct)}, ${club.worst.label}은 ${fmtPct(club.worst.hitPct)}예요.` }
    : null;

  const lieRows = byLie.filter((r) => r.n >= 3);
  const flat = lieRows.find((r) => r.id === 'flat');
  const worstLie = lieRows.filter((r) => r.id !== 'flat').reduce((a, b) => (a && a.hitPct <= b.hitPct ? a : b), null);
  const lieTake = lieRows.length >= 2 && flat && worstLie && flat.hitPct - worstLie.hitPct >= 15
    ? { tone: 'warn', text: `평지에서는 그린 적중 ${fmtPct(flat.hitPct)}, ${worstLie.label} 라이에서는 ${fmtPct(worstLie.hitPct)}예요. 경사에서는 그린 중앙을 겨냥해 보세요.` }
    : lieRows.length >= 2 ? { tone: 'info', text: '라이에 따른 적중률 차이가 크지 않아요.' } : null;

  const ls = landing.summary;
  const top = ls.top && landing.total >= 5 ? DIRECTION.find(([k]) => k === ls.top) : null;

  return (
    <div data-role="tab-approach">
      <Card id="gir" title="GIR · 그린 적중" info={<>
        <p>규정 타수에서 2타 적게(파4는 2온) 그린에 올린 홀의 비율이에요.</p>
        <p>GIRP는 규정 타수 + 1타 이내에 그린에 올린 홀이에요. GIR보다 한 타 너그러워서, 보기 플레이를 하는 골퍼도 의미 있는 숫자가 나와요. 라운드당 10개 이상이면 꾸준히 100타를 깨는 수준이에요.</p>
      </>} right={<TrendChip delta={gir.trend?.delta} id="trend-gir" label="최근 5R" />}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <Metric id="m-gir" value={fmtPct(gir.pct)} label="그린 적중" sub={`${gir.holes}홀 중 ${gir.hit}홀`} />
          <ConfidenceBadge tier={gir.tier} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {parRows.map((p) => (
            <div key={p.par} data-role={`gir-par-${p.par}`} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', background: COLOR.track, borderRadius: 12 }}>
              <div style={{ fontSize: 10, color: COLOR.muted, fontWeight: 700, letterSpacing: '0.06em' }}>PAR {p.par}</div>
              <div style={{ fontSize: 16, fontWeight: 900, marginTop: 3 }}>{fmtPct(p.pct)}</div>
              <div style={{ fontSize: 10, color: COLOR.faint, marginTop: 2 }}>{p.hit}/{p.n}홀</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div data-role="girp" style={{ flex: 1, padding: '9px 10px', background: COLOR.track, borderRadius: 12, fontSize: 11, color: COLOR.muted }}>
            18홀당 규정+1타 온 (GIRP) <b style={{ display: 'block', fontSize: 16, color: COLOR.text }}>{girp.per18 != null ? `${fmtNum(girp.per18)}홀` : '–'}</b>
          </div>
          <div data-role="conversion" style={{ flex: 1, padding: '9px 10px', background: COLOR.track, borderRadius: 12, fontSize: 11, color: COLOR.muted }}>
            그린 올린 홀 버디↑
            <b style={{ display: 'block', fontSize: 16, color: COLOR.text }}>{conversion.ratePct != null ? `${fmtPct(conversion.ratePct)}` : '–'}</b>
          </div>
        </div>
        <Takeaway tone={girTake.tone}>{girTake.text}</Takeaway>
      </Card>

      <Card id="approach-distance" title="BY DISTANCE · 거리 구간별 적중" info={<>
        <p>그 거리에서 친 샷이 그린에 올라갔는지예요. 최근 20라운드, 남은 거리를 입력했거나 지도로 잰 샷만 셌어요.</p>
        <p>80m 안 샷(칩·피치)은 퍼팅 탭의 숏게임에서 따로 봐요. 막대 옆 "첫 퍼트"는 그린에 올린 샷의 첫 퍼트 거리 중앙값이에요.</p>
      </>}>
        {distRows.length > 0 ? (
          <>
            {distRows.map((b) => (
              <RateRow key={b.id} id={`approach-bucket-${b.id}`} label={b.label} sub={`${b.n}샷`} value={b.hitPct} text={fmtPct(b.hitPct)} labelWidth={78}
                color={b.hitPct >= 50 ? COLOR.green : b.hitPct >= 25 ? COLOR.amber : COLOR.red} tier={b.tier}
                tag={b.puttMedian != null ? <span data-role="bucket-putt" style={{ fontSize: 10.5, color: COLOR.faint, whiteSpace: 'nowrap' }}>첫 퍼트 {fmtMeters(b.puttMedian, 1)}</span> : null} />
            ))}
            {distTake && <Takeaway tone={distTake.tone}>{distTake.text}</Takeaway>}
            {firstPutt.n >= 3 && (
              <div data-role="first-putt" style={{ fontSize: 11, color: COLOR.faint, marginTop: 8 }}>그린에 올린 홀의 첫 퍼트 거리 중앙값 {fmtMeters(firstPutt.median, 1)} ({firstPutt.n}홀)</div>
            )}
          </>
        ) : <Hint>세컨샷 이후의 남은 거리를 입력하면 거리 구간별 적중률을 보여드려요.</Hint>}
      </Card>

      <Card id="approach-club" title="BY CLUB · 클럽별 어프로치" info={<><p>그 클럽으로 80m 밖에서 친 어프로치가 그린에 올라간 비율이에요. 3번 이상 친 클럽만 보여요. 최근 20라운드예요.</p></>}>
        {clubRows.length > 0 ? (
          <>
            {clubRows.map((r) => (
              <RateRow key={r.key} id={`approach-club-${r.key}`} label={r.label} sub={r.median != null ? `${Math.round(r.median)}m` : `${r.hitN}샷`} value={r.hitPct} text={fmtPct(r.hitPct)}
                color={r.hitPct >= 50 ? COLOR.green : r.hitPct >= 25 ? COLOR.amber : COLOR.red} tier={r.hitTier}
                tag={<span style={{ fontSize: 10.5, color: COLOR.faint, whiteSpace: 'nowrap' }}>{r.hitN}샷</span>} />
            ))}
            {clubTake && <Takeaway tone={clubTake.tone}>{clubTake.text}</Takeaway>}
          </>
        ) : <Hint>세컨샷 클럽을 기록한 샷이 쌓이면 클럽별 적중률을 보여드려요.</Hint>}
      </Card>

      {lieRows.length >= 2 && (
        <Card id="approach-lie" title="BY LIE · 라이별 적중" info={<><p>세컨샷 이후에 입력한 라이(경사)별로 80m 밖 어프로치가 그린에 올라간 비율이에요. 3번 이상 친 라이만 보여요. 최근 20라운드예요.</p></>}>
          {lieRows.map((r) => (
            <RateRow key={r.id} id={`approach-lie-${r.id}`} label={r.label} sub={`${r.n}샷`} value={r.hitPct} text={fmtPct(r.hitPct)} tier={r.tier}
              color={r.hitPct >= 50 ? COLOR.green : r.hitPct >= 25 ? COLOR.amber : COLOR.red} />
          ))}
          {lieTake && <Takeaway tone={lieTake.tone} id="lie-take">{lieTake.text}</Takeaway>}
        </Card>
      )}

      <Card id="landing" title="LANDING · 그린에 떨어진 방향">
        {landing.total >= 5 ? (
          <>
            <SplitBar id="landing-bar" segments={DIRECTION.map(([k, , ko]) => ({
              key: k, label: ko, pct: ls.total ? (ls.q[k] / ls.total) * 100 : 0, count: `${ls.q[k]}번`,
              color: k === ls.top ? COLOR.gold : COLOR.blue,
            }))} />
            <Takeaway tone="info" id="landing-take">
              {top ? `그린에 올린 공이 ${top[2]}에 가장 많이 멈춰요 (${fmtPct((ls.q[ls.top] / ls.total) * 100)}). ` : ''}{landing.caption}
            </Takeaway>
          </>
        ) : <Hint>온그린 랜딩 방향을 5번 이상 기록하면 어느 쪽으로 치우치는지 보여드려요.</Hint>}
      </Card>
    </div>
  );
}
