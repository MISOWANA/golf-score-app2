import styles from '../../styles/styles';
import InfoNote from '../ui/InfoNote';
import ConfidenceBadge from '../insights/ConfidenceBadge';
import { tintWash } from '../ui/tint.js';
import { COLOR, fmtNum, isBetter } from './format.js';
import localizeNode from '../ui/localizeNode.js';

// 스탯 화면을 이루는 작은 부품들. 영역마다 같은 모양으로 읽히게 한다:
//   Card(제목 · 보조 설명(!) · 추세) → 대표 숫자(Metric) → 묶음(SplitBar · RateRow · RangeRow) → 한 줄 해석(Takeaway)

export function Card({ id, title, info, infoTitle, right, children }) {
  return (
    <div data-role={id ? `card-${id}` : undefined}
      style={{ ...tintWash(COLOR.gold, { strength: 0.06, border: 0.18 }), borderRadius: 18, padding: '14px 14px 14px', marginBottom: 12, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, minHeight: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', color: COLOR.slate }}>
          {title}
          {info && <InfoNote title={infoTitle ?? title}>{info}</InfoNote>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// 대표 숫자 — 큼직하게
export function Metric({ id, value, unit, label, sub, tone, align = 'left' }) {
  const color = tone === 'good' ? COLOR.green : tone === 'bad' ? COLOR.red : COLOR.text;
  return (
    <div data-role={id} style={{ minWidth: 0, textAlign: align }}>
      {label && <div style={{ fontSize: 13, color: COLOR.muted, marginBottom: 3, fontWeight: 600 }}>{localizeNode(label)}</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.05, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {unit && <span style={{ fontSize: 14, fontWeight: 700, color: COLOR.muted }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 13, color: COLOR.faint, marginTop: 3 }}>{localizeNode(sub)}</div>}
    </div>
  );
}

// 최근 5라운드와 그 이전의 차이. goodWhen: 값이 올라야 좋으면 'up', 내려야 좋으면 'down'.
export function TrendChip({ delta, unit = '%p', goodWhen = 'up', digits = 0, flat = 0.5, label = '최근 5R', id }) {
  if (delta == null || Number.isNaN(delta)) return null;
  const abs = Math.abs(delta);
  const steady = abs < flat;
  const better = isBetter(delta, goodWhen);
  const color = steady ? COLOR.faint : better ? COLOR.green : COLOR.red;
  const arrow = steady ? '–' : delta > 0 ? '▲' : '▼';
  const word = steady ? '비슷' : better ? '좋아짐' : '나빠짐';
  return (
    <span data-role={id ?? 'trend'} data-trend={steady ? 'flat' : better ? 'better' : 'worse'}
      aria-label={`${label} ${word}`}
      style={{ fontSize: 13, fontWeight: 700, color, whiteSpace: 'nowrap', padding: '2px 8px', borderRadius: 999, border: `1px solid ${color}55`, background: `${color}14` }}>
      {label} {arrow} {steady ? word : `${fmtNum(abs, digits)}${unit}`}
    </span>
  );
}

// 한 줄 해석 — 숫자가 무슨 뜻인지
export function Takeaway({ tone = 'info', children, id, bare = false }) {
  const color = tone === 'good' ? COLOR.green : tone === 'warn' ? COLOR.amber : COLOR.slate;
  return (
    <div data-role={id ?? 'takeaway'} data-tone={tone}
      style={{ display: 'flex', gap: 8, alignItems: 'flex-start', ...(bare ? { padding: '4px 0' } : { marginTop: 12, paddingTop: 10, borderTop: `1px solid ${COLOR.line}` }), fontSize: 14, lineHeight: 1.55, color: '#c4cfe0', wordBreak: 'keep-all' }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 7 }} />
      <span>{localizeNode(children)}</span>
    </div>
  );
}

export function Hint({ children, id }) {
  return (
    <div data-role={id ?? 'hint'}
      style={{ fontSize: 14, color: COLOR.muted, lineHeight: 1.6, padding: '14px 12px', border: `1px dashed ${COLOR.line}`, borderRadius: 12, textAlign: 'center', wordBreak: 'keep-all' }}>
      {localizeNode(children)}
    </div>
  );
}

// 여러 몫으로 나뉜 한 줄 막대 + 범례. segments: [{ key, label, pct, count?, color }]
export function SplitBar({ segments, id }) {
  const shown = segments.filter((s) => s.pct > 0);
  return (
    <div data-role={id}>
      <div style={{ display: 'flex', gap: 3, height: 14 }} role="img"
        aria-label={segments.map((s) => `${s.label} ${Math.round(s.pct ?? 0)}%`).join(', ')}>
        {shown.map((s) => (
          <i key={s.key} data-seg={s.key} style={{ display: 'block', flex: s.pct, minWidth: 6, borderRadius: 5, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))`, gap: 6, marginTop: 8 }}>
        {segments.map((s) => (
          <div key={s.key} data-legend={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, fontSize: 13, color: COLOR.muted, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <i style={{ width: 8, height: 8, borderRadius: 3, background: s.color, display: 'block' }} />{s.label}
            </span>
            <b style={{ fontSize: 16, fontWeight: 900, color: COLOR.text, fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.pct ?? 0)}%</b>
            {s.count != null && <span style={{ fontSize: 12, color: COLOR.faint }}>{s.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// 항목 하나의 비율/수치 막대. value 는 0~scale 사이 숫자(없으면 막대 없음), text 는 오른쪽에 보이는 값.
export function RateRow({ id, label, sub, value, scale = 100, text, tier, color = COLOR.green, labelWidth = 84, dim = false, tag }) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, (value / scale) * 100));
  return (
    <div data-role={id ?? 'rate-row'} style={{ ...styles.riStatRow, opacity: dim ? 0.55 : 1, alignItems: 'center' }}>
      <div style={{ ...styles.riStatRowLabel, width: labelWidth }}>
        {localizeNode(label, { abbr: true })}
        {sub && <div style={{ fontSize: 12, fontWeight: 500, color: COLOR.faint, marginTop: 1 }}>{localizeNode(sub, { abbr: true })}</div>}
      </div>
      <div style={styles.riStatRowBarTrack}><div style={{ ...styles.riStatRowBarFill, width: `${width}%`, background: color }} /></div>
      <div style={{ ...styles.riStatRowValue, width: 56 }}>{text ?? (value == null ? '–' : Math.round(value))}</div>
      {tag}
      {tier && <ConfidenceBadge tier={tier} />}
    </div>
  );
}

// 거리 막대: 중앙값(굵은 점) 과 사분위 범위(q1~q3) 를 0~scaleMax 눈금 위에 그린다.
export function RangeRow({ id, label, sub, median, q1, q3, scaleMax, text, right, labelWidth = 62 }) {
  const at = (v) => `${Math.max(0, Math.min(100, (v / scaleMax) * 100))}%`;
  const hasRange = q1 != null && q3 != null && q3 > q1;
  return (
    <div data-role={id ?? 'range-row'} style={{ ...styles.riStatRow, alignItems: 'center' }}>
      <div style={{ ...styles.riStatRowLabel, width: labelWidth }}>
        {localizeNode(label, { abbr: true })}
        {sub && <div style={{ fontSize: 12, fontWeight: 500, color: COLOR.faint, marginTop: 1 }}>{localizeNode(sub, { abbr: true })}</div>}
      </div>
      <div style={{ ...styles.riStatRowBarTrack, position: 'relative', overflow: 'visible', height: 8 }}>
        {hasRange && <div style={{ position: 'absolute', top: 0, bottom: 0, left: at(q1), width: `calc(${at(q3)} - ${at(q1)})`, borderRadius: 4, background: 'rgba(201,162,40,0.35)' }} />}
        {median != null && <div style={{ position: 'absolute', top: -2, left: `calc(${at(median)} - 3px)`, width: 6, height: 12, borderRadius: 3, background: COLOR.goldHi }} />}
      </div>
      <div style={{ ...styles.riStatRowValue, width: 48 }}>{text}</div>
      {right}
    </div>
  );
}
