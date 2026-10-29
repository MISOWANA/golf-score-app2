import { Takeaway, Hint } from './widgets.jsx';
import { COLOR, fmtPuttMeters } from './format.js';
import ShortGameTarget from './ShortGameTarget.jsx';
import { alongText, acrossText } from './shortGameText.js';
import { MIN_PATTERN_SHOTS } from '../../engine/shortGamePattern.js';
import { SHORT_GAME_MAX } from '../../engine/statsReport.js';
import { fmtShot } from '../../engine/units.js';

// 핀 기준 탄착 한 덩어리 — 과녁 · 앞뒤/좌우 쏠림과 흩어짐 · 한 줄 해석 · 표본 설명.
// 스탯 '숏게임' 탭과 인사이트 '숏게임' 섹션이 이 컴포넌트를 같이 쓴다 — 두 화면의 숫자가 어긋날 수 없게.
// 판정하지 않는다: 어느 쪽이 맞는 모습인지는 앱이 정하지 않고, 숫자와 비교만 말한다.

const DIR_KO = { long: '롱', right: '라이트', short: '숏', left: '레프트' };

// 평균 위치(쏠림)와 흩어짐을 숫자 그대로 읽어 준다
function patternTake(p) {
  const parts = [`핀 기준 평균 위치는 ${alongText(p.mean.y)} · ${acrossText(p.mean.x)}예요.`];
  if (p.top) parts.push(`가장 많이 멈춘 쪽은 ${DIR_KO[p.top]}(${p.q[p.top]}/${p.n}샷)이에요.`);
  if (p.spread?.x > 0 && p.spread?.y > 0) {
    const ratio = p.spread.y / p.spread.x;
    parts.push(ratio >= 1.3 ? `앞뒤가 좌우보다 ${ratio.toFixed(1)}배 더 흩어져요.`
      : ratio <= 1 / 1.3 ? `좌우가 앞뒤보다 ${(1 / ratio).toFixed(1)}배 더 흩어져요.`
        : '앞뒤와 좌우가 비슷하게 흩어져요.');
  }
  if (p.clear && !p.clear.x && !p.clear.y) parts.push('아직은 한쪽으로 쏠렸다고 보기 어려워요. 샷이 쌓이면 더 정확해져요.');
  return parts.join(' ');
}

// 좁은 화면(320px)에서는 두 칸이 세로로 쌓이도록 flex-basis 를 넉넉히 잡는다 — 글자가 단어 중간에서 끊기지 않게
export function AxisTile({ id, title, valueText, sd, clear }) {
  return (
    <div data-role={id} style={{ flex: '1 1 150px', minWidth: 0, background: '#0e1424', border: `1px solid ${COLOR.line}`, borderRadius: 12, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.muted, letterSpacing: '0.04em', wordBreak: 'keep-all' }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: clear === false ? COLOR.muted : COLOR.goldHi, marginTop: 3, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{valueText}</div>
      <div style={{ fontSize: 13, color: COLOR.faint, marginTop: 2, lineHeight: 1.4, wordBreak: 'keep-all' }}>
        {sd != null ? `흩어짐 ±${fmtPuttMeters(sd, 1)}` : ''}{clear === false ? ' · 쏠림은 뚜렷하지 않아요' : ''}
      </div>
    </div>
  );
}

// 표본이 모자랄 때 — 지금 몇 샷이고 어느 기록이 빠졌는지 알려 준다 (빈 화면을 두지 않는다)
export function PatternHint({ pattern }) {
  const cov = pattern.coverage;
  const limit = fmtShot(SHORT_GAME_MAX);
  return (
    <Hint id="pattern-hint">
      {cov.onGreen === 0
        ? `${limit} 안에서 친 샷이 그린에 올라간 기록이 아직 없어요. 칩·피치 전에 남은 거리를 기록하고, 올라갔다면 퍼팅 탭에서 온그린 랜딩 방향과 첫 퍼트 거리를 기록하면 여기에 핀 기준 위치가 쌓여요.`
        : `핀 기준 위치는 온그린 랜딩 방향과 첫 퍼트 거리를 둘 다 기록한 샷으로 만들어요. 지금 ${pattern.n}샷이 쌓였고 ${MIN_PATTERN_SHOTS}샷부터 보여요. 그린에 올린 ${limit} 안 샷 ${cov.onGreen}개 중 랜딩 방향을 기록한 건 ${cov.withLanding}개예요.`}
    </Hint>
  );
}

export default function ShortGamePatternPanel({ pattern: p }) {
  if (!p.enough) return <PatternHint pattern={p} />;
  const limit = fmtShot(SHORT_GAME_MAX);
  return (
    <>
      <ShortGameTarget pattern={p} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <AxisTile id="axis-along" title="앞뒤 (롱·숏)" valueText={alongText(p.mean.y)} sd={p.spread?.y} clear={p.clear?.y} />
        <AxisTile id="axis-across" title="좌우 (레프트·라이트)" valueText={acrossText(p.mean.x)} sd={p.spread?.x} clear={p.clear?.x} />
      </div>
      <Takeaway tone="info" id="pattern-take">{patternTake(p)}</Takeaway>
      <div data-role="pattern-basis" style={{ fontSize: 12, color: COLOR.faint, marginTop: 6, lineHeight: 1.5 }}>
        그린에 올린 {limit} 안 샷 {p.coverage.onGreen}개(칩인 제외) 중 방향과 첫 퍼트를 모두 기록한 {p.n}샷 기준이에요.
      </div>
    </>
  );
}
