import { INSIGHT_CATEGORY_LABEL } from '../../engine/rules/category.js';
import { SEVERITY_LABEL } from '../../engine/insightIndex.js';
import { SEVERITY_COLOR, SEVERITY_BG, SEVERITY_BADGE } from './insightTheme.js';

const chip = (color, bg) => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 999,
  fontSize: 10, fontWeight: 700, letterSpacing: '0.02em', color, background: bg, whiteSpace: 'nowrap',
});

const dateLabel = (d) => {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? String(d).slice(0, 10) : `${t.getMonth() + 1}/${t.getDate()}`;
};

// 인사이트 한 장. 검색·복기·리포트에서 같은 모양으로 쓴다.
//   showContext  어느 라운드·홀의 것인지 칩으로 보여준다 (검색 결과 등)
//   compact      권장 문구를 접어 둔다 (복기의 홀 목록)
// 홀 칩·홀 배지가 이미 홀을 알려 주므로 본문 앞의 "5번 홀에서 / 5번 파3 홀은 / 5번 홀(파4)에서"는 뺀다
const stripHolePrefix = (t) => String(t).replace(/^\d+번 (?:파\d )?홀(?:\([^)]*\))?(?:에서|은|는)?\s+/, '');

export default function InsightCard({ insight, showContext = false, compact = false, highlight = '', hideHole = false, hideCategory = false }) {
  const summary = insight.holeNumber != null ? stripHolePrefix(insight.summary) : insight.summary;
  const color = SEVERITY_COLOR[insight.severity] ?? '#8896b0';
  const bg = SEVERITY_BG[insight.severity] ?? 'rgba(136,150,176,0.10)';
  const hl = (text) => {
    if (!highlight) return text;
    const q = highlight.trim().split(/\s+/).filter(Boolean)[0];
    if (!q) return text;
    const i = String(text).toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return (
      <>
        {String(text).slice(0, i)}
        <mark style={{ background: 'rgba(201,162,40,0.35)', color: '#f3d36b', borderRadius: 2, padding: '0 1px' }}>{String(text).slice(i, i + q.length)}</mark>
        {String(text).slice(i + q.length)}
      </>
    );
  };
  return (
    <div data-insight-id={insight.id} style={{
      background: '#111827', border: '1px solid #1b2238', borderLeft: `3px solid ${color}`,
      borderRadius: 6, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
        <span style={chip(color, bg)}>{SEVERITY_BADGE[insight.severity]} {SEVERITY_LABEL[insight.severity] ?? ''}</span>
        {insight.category && !hideCategory && <span style={chip('#a9b8d6', 'rgba(255,255,255,0.05)')}>{INSIGHT_CATEGORY_LABEL[insight.category] ?? insight.category}</span>}
        {insight.holeNumber != null && !hideHole && (
          <span style={chip('#c9a228', 'rgba(201,162,40,0.10)')}>HOLE {insight.holeNumber}{insight.par ? ` · PAR ${insight.par}` : ''}</span>
        )}
        {insight.scope === 'round' && showContext && <span style={chip('#8ca4bc', 'rgba(140,164,188,0.10)')}>라운드 요약</span>}
        {insight.scope === 'career' && <span style={chip('#8a6fb0', 'rgba(138,111,176,0.14)')}>누적 추세</span>}
        {showContext && insight.courseName && (
          <span style={chip('#8ca4bc', 'rgba(140,164,188,0.10)')}>{dateLabel(insight.roundDate)} {insight.courseName}</span>
        )}
        {insight.count > 1 && <span style={chip('#e8edf8', 'rgba(255,255,255,0.08)')}>{insight.grouped ? `${insight.count}개 홀` : `×${insight.count}`}</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#e8edf8', lineHeight: 1.35, marginBottom: 4 }}>{hl(insight.title)}</div>
      <div style={{ fontSize: 12.5, color: '#b4c0d8', lineHeight: 1.55, wordBreak: 'keep-all' }}>{hl(summary)}</div>
      {!compact && insight.recommendation && (
        <div style={{ fontSize: 12, color: '#7f8db0', lineHeight: 1.55, marginTop: 6, wordBreak: 'keep-all' }}>
          <span style={{ color, fontWeight: 700 }}>제안 </span>{hl(insight.recommendation)}
        </div>
      )}
    </div>
  );
}
