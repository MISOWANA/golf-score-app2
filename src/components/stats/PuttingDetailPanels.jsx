import { useState } from 'react';
import ConfidenceBadge from '../insights/ConfidenceBadge';
import { Metric, SplitBar, RateRow, Takeaway, Hint } from './widgets.jsx';
import PuttMissTarget from './PuttMissTarget.jsx';
import { AxisTile } from './ShortGamePatternPanel.jsx';
import { COLOR, fmtPct, fmtSigned, fmtPuttMeters } from './format.js';
import { SIDE_COLOR, meanAlongText, meanAcrossText, paceText, lineText, missMapText, lieText, lagText, forScoreText, threePuttFirstText } from './puttingText.js';
import { MIN_MAP_MISSES, MIN_ROW } from '../../engine/puttingDetail.js';
import { fmtPutt } from '../../engine/units.js';
import localizeNode from '../ui/localizeNode.js';

// 퍼팅 상세 분석의 부품들 — 스탯 '퍼팅' 탭과 인사이트 '퍼팅' 섹션이 같이 쓴다 (두 화면의 숫자와 문장이 어긋날 수 없게).
// 계산은 engine/puttingDetail.js, 문장은 ./puttingText.js. 판정하지 않는다 — 내 기록의 비율 · 중앙값 · 내 기록끼리의 차이만 보여 준다.
// 기록이 모자라면 빈 칸 대신 지금 몇 개고 무엇을 기록하면 되는지 알려 준다.

const PACE_COLOR = { short: COLOR.blue, pinHigh: COLOR.slate, long: COLOR.amber };
const sigPct = (v) => (v == null ? '–' : `${Math.round(v)}%`);

// 위 · 아래 선택 막대 (44px)
function Segmented({ id, label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} data-role={id} style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 12, background: '#0d1425', border: `1px solid ${COLOR.line}`, marginBottom: 12 }}>
      {options.map(([v, text, sub]) => {
        const on = value === v;
        return (
          <button key={v} type="button" aria-pressed={on} data-role={`${id}-${v}`} onClick={() => onChange(v)}
            style={{ flex: 1, minHeight: 44, minWidth: 0, padding: '0 6px', border: 0, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', background: on ? 'rgba(201,162,40,0.18)' : 'transparent', color: on ? COLOR.goldHi : COLOR.muted, fontSize: 14, fontWeight: 800 }}>
            {text}{sub != null && <span style={{ fontSize: 12, fontWeight: 600, marginLeft: 5, color: on ? COLOR.gold : COLOR.faint }}>{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

// 한 줄 막대 안에 몇 묶음으로 나눈 몫 — segs: [{ key, pct, color, label }]
function StackRow({ id, label, sub, segs, n, labelWidth = 66 }) {
  const shown = segs.filter((s) => s.pct > 0);
  return (
    <div data-role={id} style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: labelWidth, flexShrink: 0, fontSize: 14, fontWeight: 700, color: COLOR.text }}>
          {localizeNode(label, { abbr: true })}
          {sub && <div style={{ fontSize: 12, fontWeight: 500, color: COLOR.faint, marginTop: 1 }}>{sub}</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 2, height: 12 }} role="img" aria-label={segs.map((s) => `${s.label} ${Math.round(s.pct ?? 0)}%`).join(', ')}>
          {shown.map((s) => <i key={s.key} data-seg={s.key} style={{ display: 'block', flex: s.pct, minWidth: 4, borderRadius: 4, background: s.color }} />)}
        </div>
      </div>
      <div style={{ marginLeft: labelWidth + 8, marginTop: 4, fontSize: 13, color: COLOR.muted, lineHeight: 1.4 }}>
        {segs.map((s, i) => <span key={s.key}>{i > 0 && ' · '}{s.label} <b style={{ color: COLOR.text }}>{sigPct(s.pct)}</b></span>)}
        <span style={{ color: COLOR.faint }}> · {n}개</span>
      </div>
    </div>
  );
}

const needMore = (have, need) => `${need - have}개 더 기록하면`;

// ─── 거리별 — 성공률 · 빗나가면 남기는 거리 · 이 거리의 퍼트가 투어 평균 대비 얼마나 득실인지 ───────────────────────────
export function PuttDistancePanel({ rows }) {
  const list = rows.filter((b) => b.total > 0);
  if (!list.length) return <Hint>퍼트 거리와 결과를 기록하면 거리별 성공률을 보여드려요.</Hint>;
  return (
    <>
      {list.map((b) => {
        const notes = [];
        if (b.leaveN >= MIN_ROW) notes.push(`빗나가면 ${fmtPuttMeters(b.leaveMedian, 1)} 남음`);
        if (b.sgN >= MIN_ROW) notes.push(`투어 대비 SG ${fmtSigned(b.sgPerPutt, 2)}`);
        return (
          <div key={b.id}>
            <RateRow id={`putt-bucket-${b.id}`} label={b.label} sub={`${b.made}/${b.total}`} value={b.ratePct} text={fmtPct(b.ratePct)} tier={b.tier}
              color={b.ratePct >= 60 ? COLOR.green : b.ratePct >= 30 ? COLOR.amber : COLOR.slate} />
            {notes.length > 0 && <div data-role={`putt-bucket-note-${b.id}`} style={{ fontSize: 13, color: COLOR.faint, margin: '-2px 0 8px', lineHeight: 1.4 }}>{notes.join(' · ')}</div>}
          </div>
        );
      })}
    </>
  );
}

// ─── 미스 위치 과녁 ────────────────────────────────────────────────────────────────────────
export function PuttMissPanel({ map }) {
  const [scope, setScope] = useState('all');
  const total = map.all.n;
  if (total === 0) {
    return <Hint id="miss-empty">퍼팅 탭의 "미스 위치" 판에서 공이 멈춘 곳을 찍으면, 어느 쪽으로 빗나가는지 한눈에 모아서 보여드려요.</Hint>;
  }
  const pattern = map[scope];
  const split = fmtPutt(map.splitM, { digits: 0 });
  const options = [['all', '전체', map.all.n], ['near', `~${split}`, map.near.n], ['far', `${split}+`, map.far.n]];
  const take = missMapText(pattern);
  return (
    <>
      <Segmented id="miss-scope" label="퍼트 거리" options={options} value={scope} onChange={setScope} />
      {pattern.enough ? (
        <>
          <PuttMissTarget pattern={pattern} />
          <div data-role="miss-legend" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 14px', marginTop: 6, fontSize: 13, color: COLOR.muted }}>
            {[['low', '로우사이드'], ['high', '하이사이드'], ['none', '직선 · 라이 미입력']].map(([k, t]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: SIDE_COLOR[k], display: 'block' }} />{t}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <AxisTile id="putt-axis-along" title="앞뒤 (롱·숏)" valueText={meanAlongText(pattern.mean.y)} sd={pattern.spread?.y} clear={pattern.clear?.y} />
            <AxisTile id="putt-axis-across" title="좌우 (레프트·라이트)" valueText={meanAcrossText(pattern.mean.x)} sd={pattern.spread?.x} clear={pattern.clear?.x} />
          </div>
          {take && <Takeaway tone="info" id="putt-miss-take">{take}</Takeaway>}
        </>
      ) : (
        <Hint id="miss-hint">
          {scope === 'all' ? '빗나간 퍼트의 멈춘 곳을' : `${scope === 'near' ? `${split} 이내` : `${split} 넘는`} 퍼트의 멈춘 곳을`} {MIN_MAP_MISSES}개 이상 기록하면 과녁을 그려요 (지금 {pattern.n}개 — {needMore(pattern.n, MIN_MAP_MISSES)}).
        </Hint>
      )}
      <div data-role="miss-basis" style={{ fontSize: 12, color: COLOR.faint, marginTop: 6, lineHeight: 1.5 }}>
        퍼트마다 "공 → 홀" 라인을 위로 맞춰 겹쳤어요. 멈춘 곳을 기록한 빗나간 퍼트 {total}개 기준이에요.
      </div>
    </>
  );
}

// ─── 거리감 — 롱 · 숏 ─────────────────────────────────────────────────────────────────────
export function PuttPacePanel({ pace }) {
  const a = pace.all;
  if (a.n === 0) return <Hint id="pace-empty">빗나간 퍼트의 멈춘 곳을 기록하면 홀에 못 미치는지 지나치는지 보여드려요.</Hint>;
  const take = paceText(pace);
  const segs = (r) => [
    { key: 'short', label: '숏', pct: r.shortPct, color: PACE_COLOR.short },
    { key: 'pinHigh', label: '핀하이', pct: r.pinHighPct, color: PACE_COLOR.pinHigh },
    { key: 'long', label: '롱', pct: r.longPct, color: PACE_COLOR.long },
  ];
  return (
    <>
      <SplitBar id="pace-bar" segments={segs(a).map((s) => ({ ...s, count: `${a[s.key]}개` }))} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}><Metric id="m-short-median" value={a.short >= MIN_ROW && a.shortMedian != null ? fmtPuttMeters(a.shortMedian, 1) : '–'} label="못 미친 거리 (중앙값)" sub={`숏 ${a.short}개`} /></div>
        <div style={{ flex: 1, minWidth: 0 }}><Metric id="m-long-median" value={a.long >= MIN_ROW && a.longMedian != null ? fmtPuttMeters(a.longMedian, 1) : '–'} label="지나친 거리 (중앙값)" sub={`롱 ${a.long}개`} align="right" /></div>
      </div>
      {pace.bySlope.length > 0 && (
        <div data-role="pace-by-slope" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate }}>경사별</div>
          {pace.bySlope.map((r) => <StackRow key={r.id} id={`pace-slope-${r.id}`} label={r.label} n={r.n} segs={segs(r)} />)}
        </div>
      )}
      {pace.byDistance.length > 0 && (
        <div data-role="pace-by-dist" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate }}>퍼트 거리별</div>
          {pace.byDistance.map((r) => <StackRow key={r.id} id={`pace-dist-${r.id}`} label={r.label} n={r.n} segs={segs(r)} />)}
        </div>
      )}
      {take && <Takeaway tone="info" id="pace-take">{take}</Takeaway>}
    </>
  );
}

// ─── 라인 — 좌우 · 하이/로우사이드 ──────────────────────────────────────────────────────────
export function PuttLinePanel({ line }) {
  const side = line.side;
  const st = line.straight;
  const hasSide = side.n >= MIN_ROW;
  const hasStraight = st.n >= MIN_ROW;
  if (!hasSide && !hasStraight) {
    return <Hint id="line-empty">훅 · 슬라이스(휘는 라이)에서 빗나간 퍼트의 멈춘 곳을 기록하면 하이/로우사이드를, 직선 라이는 왼쪽/오른쪽 쏠림을 보여드려요 (지금 휘는 라이 {side.n}개 · 직선 라이 {st.n}개).</Hint>;
  }
  const take = lineText(line);
  const sideSegs = (r) => [{ key: 'low', label: '로우사이드', pct: r.lowPct, color: SIDE_COLOR.low }, { key: 'high', label: '하이사이드', pct: r.highPct, color: SIDE_COLOR.high }];
  const pctOf = (k) => (st.n > 0 ? (st[k] / st.n) * 100 : 0);
  return (
    <>
      {hasSide && (
        <div data-role="line-side">
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate, marginBottom: 8 }}>휘는 라이 (훅 · 슬라이스 · S자) — 홀 옆을 지난 쪽</div>
          <SplitBar id="side-bar" segments={sideSegs(side).map((s) => ({ ...s, count: `${side[s.key]}개` }))} />
          {line.byShape.map((r) => <StackRow key={r.id} id={`side-shape-${r.id}`} label={r.label} n={r.n} segs={sideSegs(r)} />)}
        </div>
      )}
      {hasStraight && (
        <div data-role="line-straight" style={{ marginTop: hasSide ? 16 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate, marginBottom: 8 }}>직선 라이 — 라인 기준 좌우</div>
          <SplitBar id="straight-bar" segments={[
            { key: 'left', label: '왼쪽', pct: pctOf('left'), count: `${st.left}개`, color: COLOR.blue },
            { key: 'line', label: '라인', pct: pctOf('line'), count: `${st.line}개`, color: COLOR.slate },
            { key: 'right', label: '오른쪽', pct: pctOf('right'), count: `${st.right}개`, color: COLOR.lightBlue },
          ]} />
        </div>
      )}
      {take && <Takeaway tone="info" id="line-take">{take}</Takeaway>}
    </>
  );
}

// ─── 라이별 성공률 — 입력할 때 쓰는 라이 칸과 같은 배치 ───────────────────────────────────────────
const CELL_SHORT = {
  'uphill-break-left': '오르막\n슬라이스', uphill: '오르막', 'uphill-break-right': '오르막\n훅',
  'break-left': '슬라이스', flat: '평지', 'break-right': '훅',
  'downhill-break-left': '내리막\n슬라이스', downhill: '내리막', 'downhill-break-right': '내리막\n훅',
  'uphill-s-lr': '오르막\n좌→우 S', 'uphill-s-rl': '오르막\n우→좌 S', 's-lr': '평지\n좌→우 S', 's-rl': '평지\n우→좌 S',
  'downhill-s-lr': '내리막\n좌→우 S', 'downhill-s-rl': '내리막\n우→좌 S',
};

function LieCell({ c }) {
  const enough = c.total >= MIN_ROW;
  const tint = !enough || c.total === 0 ? null : c.ratePct >= 60 ? COLOR.green : c.ratePct >= 30 ? COLOR.amber : COLOR.slate;
  return (
    <div data-role={`lie-cell-${c.id}`} data-total={c.total} data-rate={c.ratePct == null ? '' : Math.round(c.ratePct)}
      style={{ minHeight: 76, boxSizing: 'border-box', minWidth: 0, padding: '8px 4px', borderRadius: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        background: tint ? `${tint}22` : '#131b2f', border: `1px solid ${tint ? `${tint}66` : COLOR.line}`, opacity: c.total === 0 ? 0.55 : 1 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.muted, whiteSpace: 'pre-line', lineHeight: 1.25, wordBreak: 'keep-all' }}>{CELL_SHORT[c.id] ?? c.label}</span>
      <b style={{ fontSize: 18, fontWeight: 900, color: c.total === 0 ? COLOR.faint : COLOR.text, fontVariantNumeric: 'tabular-nums' }}>{c.total === 0 ? '–' : fmtPct(c.ratePct)}</b>
      <span style={{ fontSize: 12, color: COLOR.faint }}>{c.total === 0 ? '기록 없음' : `${c.made}/${c.total}`}</span>
    </div>
  );
}

export function PuttLiePanel({ byLie }) {
  if (byLie.n === 0) return <Hint id="lie-empty">퍼팅 탭에서 퍼트마다 라이(경사 · 휨)를 고르면 라이별 성공률을 보여드려요.</Hint>;
  const take = lieText(byLie);
  const rowOf = (r, prefix) => (r.total > 0 ? <RateRow key={r.id} id={`${prefix}-${r.id}`} label={r.label} sub={`${r.made}/${r.total}`} value={r.ratePct} text={fmtPct(r.ratePct)} tier={r.tier} color={r.ratePct >= 60 ? COLOR.green : r.ratePct >= 30 ? COLOR.amber : COLOR.slate} labelWidth={74} /> : null);
  return (
    <>
      <div data-role="lie-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {byLie.cells.map((c) => <LieCell key={c.id} c={c} />)}
      </div>
      {byLie.compound.length > 0 && (
        <div data-role="lie-compound" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate, marginBottom: 6 }}>복합 라이 (S자)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
            {byLie.compound.map((c) => <LieCell key={c.id} c={c} />)}
          </div>
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate, margin: '14px 0 2px' }}>경사별</div>
      {byLie.bySlope.map((r) => rowOf(r, 'lie-slope'))}
      <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.slate, margin: '10px 0 2px' }}>휨별</div>
      {byLie.byBreak.map((r) => rowOf(r, 'lie-break'))}
      {take && <Takeaway tone="info" id="lie-take">{take}</Takeaway>}
      <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 6, lineHeight: 1.5 }}>라이를 고른 퍼트 {byLie.n}개 기준이에요. 칸이 어둡고 숫자가 없으면 아직 기록이 없는 라이예요. (탭인은 라이를 몰라서 빠져요)</div>
    </>
  );
}

// ─── 첫 퍼트 붙이기 ────────────────────────────────────────────────────────────────────────
function LagStat({ label, value, sub }) {
  return (
    <div style={{ minWidth: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: COLOR.muted, lineHeight: 1.3, wordBreak: 'keep-all' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: COLOR.text, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLOR.faint }}>{sub}</div>}
    </div>
  );
}

export function PuttLagPanel({ lag, comeback, threePutt }) {
  if (!lag.length) return <Hint id="lag-empty">첫 퍼트 거리를 기록한 홀이 거리대마다 {MIN_ROW}개 이상 쌓이면, 얼마나 붙이는지 · 몇 퍼트로 끝나는지 보여드려요.</Hint>;
  const take = lagText(lag);
  const threeTake = threePuttFirstText(threePutt);
  return (
    <>
      {lag.map((r) => (
        <div key={r.id} data-role={`lag-${r.id}`} style={{ marginTop: 8, padding: '10px 10px 12px', borderRadius: 12, background: '#0e1424', border: `1px solid ${COLOR.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: COLOR.text }}>{localizeNode(r.label, { abbr: true })} <span style={{ fontSize: 13, fontWeight: 600, color: COLOR.faint }}>첫 퍼트 {r.n}번</span></span>
            {r.leaveN >= MIN_ROW && <ConfidenceBadge tier={r.tier} />}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }}>
            <LagStat label="1퍼트" value={sigPct(r.onePuttPct)} />
            <LagStat label={localizeNode('1m 안 마무리')} value={sigPct(r.within1Pct)} sub={r.within1N < r.n ? `${r.within1N}번 기준` : null} />
            <LagStat label="3퍼트" value={sigPct(r.threePuttPct)} />
            <LagStat label="빗나가면 남김" value={r.leaveMedian != null && r.leaveN >= MIN_ROW ? fmtPuttMeters(r.leaveMedian, 1) : '–'} sub={r.leaveMedian != null && r.leaveN >= MIN_ROW ? '중앙값' : null} />
          </div>
        </div>
      ))}
      {comeback.total >= MIN_ROW && (
        <div data-role="comeback" style={{ marginTop: 12, fontSize: 14, color: '#c4cfe0', lineHeight: 1.5 }}>
          {localizeNode('컴백 퍼트(두 번째 이후, 2m 이내)')} <b style={{ color: COLOR.text }}>{fmtPct(comeback.ratePct)}</b> <span style={{ color: COLOR.faint }}>({comeback.made}/{comeback.total})</span>
        </div>
      )}
      {take && <Takeaway tone="info" id="lag-take">{take}</Takeaway>}
      {threeTake && <Takeaway tone="info" id="lag-three-take" bare>{threeTake}</Takeaway>}
    </>
  );
}

// ─── 어떤 퍼트였나 — 버디 · 파 · 보기 퍼트 ─────────────────────────────────────────────────────
export function PuttForPanel({ forScore }) {
  const rows = forScore.filter((r) => r.total > 0);
  if (!rows.length) return <Hint id="for-empty">스코어를 입력한 홀의 첫 퍼트 결과를 기록하면, 버디 · 파 · 보기 퍼트를 얼마나 넣는지 보여드려요.</Hint>;
  const take = forScoreText(forScore);
  return (
    <>
      {rows.map((r) => {
        const color = r.ratePct >= 60 ? COLOR.green : r.ratePct >= 30 ? COLOR.amber : COLOR.slate;
        return (
          <div key={r.id} data-role={`for-${r.id}`} style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: COLOR.text }}>{r.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', color: COLOR.text }}>{fmtPct(r.ratePct)}</b><ConfidenceBadge tier={r.tier} /></span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: COLOR.track, margin: '6px 0 4px', overflow: 'hidden' }}><div style={{ width: `${r.ratePct}%`, height: '100%', background: color }} /></div>
            <div style={{ fontSize: 13, color: COLOR.faint }}>{r.made}/{r.total}{r.distMedian != null ? ` · 퍼트 거리 중앙값 ${fmtPuttMeters(r.distMedian, 1)}` : ''}</div>
          </div>
        );
      })}
      {take && <Takeaway tone="info" id="for-take">{take}</Takeaway>}
      <div style={{ fontSize: 12, color: COLOR.faint, marginTop: 6, lineHeight: 1.5 }}>첫 퍼트가 들어가면 그 홀이 버디 · 파 · 보기 이상이었을 퍼트로 나눠서 셌어요.</div>
    </>
  );
}
