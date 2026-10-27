import { Card, Metric, Takeaway, TrendChip, Hint } from './widgets.jsx';
import { COLOR, fmtPct, fmtSigned, fmtPuttMeters } from './format.js';
import ShortGamePatternPanel from './ShortGamePatternPanel.jsx';
import { alongText, acrossText } from './shortGameText.js';
import ConfidenceBadge from '../insights/ConfidenceBadge';
import { MIN_ROW_SHOTS } from '../../engine/shortGamePattern.js';
import { SHORT_GAME_MAX } from '../../engine/statsReport.js';
import { fmtShot, fmtShotRange } from '../../engine/units.js';

const bandLabel = (b) => (b.min === 0 ? `${fmtShot(b.max)} 안` : fmtShotRange(b.min, b.max));

// 숏게임 — 그린을 놓친 뒤(스크램블링)와, 80m 안 샷이 핀 기준 어디에 멈추는지(탄착)
//   카드 1  스크램블링 — 그린을 놓친 홀을 파로 막았나
//   카드 2  80m 안 샷 — 그린에 올린 비율 · 첫 퍼트 · 핀 기준 위치 (같은 80m 안 샷이라 한 카드에 둔다)
//   카드 3·4 거리대별 · 클럽별
export default function ShortGameTab({ report }) {
  const { shortGame } = report;
  const near = shortGame.near;
  const p = shortGame.pattern;
  const limit = fmtShot(SHORT_GAME_MAX);   // '80m' (야드 모드에서는 야드)

  const scrTake = shortGame.attempts === 0 ? null
    : shortGame.ratePct >= 40 ? { tone: 'good', text: `그린을 놓친 홀 10개 중 ${Math.round(shortGame.ratePct / 10)}개를 파 이상으로 막아요.` }
      : { tone: 'info', text: `그린을 놓친 홀 10개 중 ${Math.round(shortGame.ratePct / 10)}개를 파 이상으로 막아요. 그린 주변에서 첫 퍼트를 2m 안에 남기는 샷이 열쇠예요.` };

  const patternRow = (id, label, row) => (
    <div key={id} data-role={id} style={{ padding: '10px 0', borderBottom: `1px solid ${COLOR.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 13, color: COLOR.faint, whiteSpace: 'nowrap' }}>{row.n}샷</span>
        <ConfidenceBadge tier={row.tier} />
      </div>
      {/* 항목 단위로만 줄이 바뀐다 — 줄 끝에 "0.6m" 만 떨어져 남지 않게 */}
      <div style={{ fontSize: 14, color: '#c4cfe0', marginTop: 4, lineHeight: 1.6 }}>
        <span style={{ whiteSpace: 'nowrap' }}>첫 퍼트 <b style={{ color: COLOR.text }}>{fmtPuttMeters(row.medianDist, 1)}</b></span>
        <span aria-hidden="true" style={{ color: COLOR.faint }}> · </span>
        <span style={{ whiteSpace: 'nowrap' }}>평균 위치 <b style={{ color: COLOR.text }}>{alongText(row.mean.y)}</b></span>
        <span aria-hidden="true" style={{ color: COLOR.faint }}> · </span>
        <span style={{ whiteSpace: 'nowrap' }}><b style={{ color: COLOR.text }}>{acrossText(row.mean.x)}</b></span>
      </div>
    </div>
  );

  return (
    <div data-role="tab-short">
      <Card id="short-game" title="SHORT GAME · 그린 놓친 뒤" info={<>
        <p>스크램블링은 그린을 놓친 홀을 파 이상으로 막은 비율이에요.</p>
      </>} right={<TrendChip delta={shortGame.trend?.delta} id="trend-scramble" label="최근 5R" />}>
        {shortGame.attempts > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <Metric id="m-scramble" value={fmtPct(shortGame.ratePct)} label="스크램블링" sub={`놓친 ${shortGame.attempts}홀 중 ${shortGame.saves}홀 세이브`} />
              <Metric id="m-missed-diff" value={fmtSigned(shortGame.avgDiff, 2)} label="그린 놓친 홀 평균" sub="파 대비 타수" align="right" />
            </div>
            <Takeaway tone={scrTake.tone}>{scrTake.text}</Takeaway>
          </>
        ) : <Hint>그린을 놓친 홀이 쌓이면 스크램블링을 보여드려요.</Hint>}
      </Card>

      <Card id="short-pattern" title="PIN PATTERN · 핀 기준 탄착" info={<>
        <p>{limit} 안에서 친 샷(칩·피치)을 모아 봐요. 최근 20라운드, 남은 거리를 입력했거나 지도로 잰 샷만 셌어요.</p>
        <p>핀 기준 위치는 퍼팅 탭에서 기록한 "온그린 랜딩 방향"(몇 시)과 "첫 퍼트 거리"를 합쳐서 계산해요. 위가 롱(핀 너머), 아래가 숏, 오른쪽이 라이트예요. 둘 다 기록한 샷만 세요.</p>
        <p>흰 점은 평균 위치(쏠림), 점선 타원은 흩어짐이에요. 쏠림은 한쪽으로 늘 치우치는 정도, 흩어짐은 샷마다 달라지는 정도예요. 어느 쪽이 맞는 모습인지는 앱이 정하지 않아요.</p>
      </>}>
        {near.n >= 5 && (
          <div data-role="near-green" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
            <Metric id="m-near-hit" value={fmtPct(near.hitPct)} label={`${limit} 안 그린에 올린 비율`} sub={`${near.n}샷 중 ${near.hit}샷`} />
            {near.puttMedian != null && <Metric id="m-near-putt" value={fmtPuttMeters(near.puttMedian, 1)} label="올린 뒤 첫 퍼트" sub={`중앙값 · ${near.puttN}샷`} align="right" />}
          </div>
        )}
        <ShortGamePatternPanel pattern={p} />
      </Card>

      {p.enough && p.byBand.length > 0 && (
        <Card id="short-by-distance" title="BY DISTANCE · 거리대별" info={<><p>친 자리에서 핀까지 남은 거리대별로 어디에 멈췄는지예요. {MIN_ROW_SHOTS}샷 이상인 거리대만 보여요.</p></>}>
          {p.byBand.map((b) => patternRow(`short-band-${b.id}`, bandLabel(b), b))}
        </Card>
      )}

      {p.enough && p.byClub.length > 0 && (
        <Card id="short-by-club" title="BY CLUB · 클럽별" info={<><p>그 클럽으로 친 샷이 어디에 멈췄는지예요. {MIN_ROW_SHOTS}샷 이상 친 클럽만 보여요.</p></>}>
          {p.byClub.map((c) => patternRow(`short-club-${c.key}`, c.label, c))}
        </Card>
      )}
    </div>
  );
}
