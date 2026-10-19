import { useMemo } from 'react';
import InsightCard from './InsightCard.jsx';
import GreenSpeedPanel from './GreenSpeedPanel.jsx';
import { buildInsightReport } from '../../engine/insightIndex.js';
import { PUTT_CAUSE_LABEL, PUTT_CAUSE_ORDER } from '../../engine/puttAnalysis.js';

const CAUSE_COLOR = { lag: '#c9a228', short: '#ef5350', both: '#c04a3e', mid: '#6b8cae', close: '#8a6fb0', unknown: '#4d5a78' };

const Section = ({ title, sub, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#8ca4bc', letterSpacing: '0.16em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: '#6e84a8' }}>{sub}</div>}
    </div>
    {children}
  </div>
);

// 인사이트 리포트 — 이번 라운드(또는 누적)의 핵심만 한 장으로.
export default function InsightReportPanel({ rounds, mode = 'round', onModeChange = null }) {
  const rep = useMemo(() => buildInsightReport(rounds, mode), [rounds, mode]);
  if (!rep) return null;
  const single = rep.replays.length === 1 ? rep.replays[0] : null;
  const c = rep.causes;

  return (
    <div data-panel="report">
      {/* 한 줄 요약 */}
      <div style={{ background: 'linear-gradient(135deg, #0e1c14 0%, #0f2218 100%)', border: '1px solid #1d3a2a', borderRadius: 8, padding: '14px 16px 14px', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#8ca4bc', letterSpacing: '0.2em' }}>
            {single ? `${single.courseName ?? ''} 리포트` : `${rep.stats.rounds}라운드 누적 리포트`}
          </div>
          {onModeChange && (
            <div role="group" aria-label="분석 기간" style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.25)', borderRadius: 999, padding: 2, flexShrink: 0 }}>
              {[['round', '이번 라운드'], ['career', `${rounds.filter(r => r.players.length === 1).length}라운드 누적`]].map(([k, l]) => (
                <button key={k} aria-pressed={mode === k} onClick={() => onModeChange(k)}
                  style={{
                    border: 'none', cursor: 'pointer', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    background: mode === k ? '#c9a228' : 'transparent', color: mode === k ? '#0b0e18' : '#8ca4bc',
                  }}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8', lineHeight: 1.55, wordBreak: 'keep-all' }} data-role="report-headline">
          {single
            ? single.headline
            : `평균 ${rep.stats.avgScore.toFixed(1)}타 · 3퍼트 ${rep.stats.threePutts}회 · 페널티 ${rep.stats.penalties}회 (${rep.stats.rounds}라운드)`}
        </div>
      </div>

      {/* 잘한 점 / 개선 포인트 */}
      <Section title="STRENGTHS · 잘한 점" sub={`${rep.strengths.length}개`}>
        {rep.strengths.length === 0
          ? <div style={{ fontSize: 12, color: '#8896b0' }}>이번에는 뚜렷한 강점 신호가 없어요. 기록이 쌓이면 강점이 보입니다.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rep.strengths.map(i => <InsightCard key={i.insightType} insight={i} compact />)}</div>}
      </Section>
      <Section title="IMPROVE · 개선 포인트" sub={`${rep.issues.length}개`}>
        {rep.issues.length === 0
          ? <div style={{ fontSize: 12, color: '#3db87a' }}>눈에 띄는 약점 신호가 없습니다.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rep.issues.map(i => <InsightCard key={i.insightType} insight={i} />)}</div>}
      </Section>

      {/* 3퍼트 원인 */}
      {c.total > 0 && (
        <Section title="THREE-PUTT · 3퍼트 원인 (퍼트 거리 기준)" sub={`${c.total}회`}>
          <div style={{ background: '#111827', border: '1px solid #1b2238', borderRadius: 8, padding: '12px 14px' }} data-role="cause-card">
            <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#1b2238', marginBottom: 12 }}>
              {PUTT_CAUSE_ORDER.filter(k => c.counts[k] > 0).map(k => (
                <div key={k} style={{ width: `${(c.counts[k] / c.total) * 100}%`, background: CAUSE_COLOR[k] }} />
              ))}
            </div>
            {PUTT_CAUSE_ORDER.filter(k => c.counts[k] > 0).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: CAUSE_COLOR[k], flexShrink: 0 }} />
                <span style={{ flex: 1, color: '#b4c0d8' }}>{PUTT_CAUSE_LABEL[k]}</span>
                <b style={{ color: '#e8edf8' }}>{c.counts[k]}회</b>
                <span style={{ width: 40, textAlign: 'right', color: '#6e84a8' }}>{Math.round((c.counts[k] / c.total) * 100)}%</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: '#6e84a8', lineHeight: 1.6, marginTop: 8 }}>
              {c.counts.unknown > 0
                ? '판단 보류는 퍼트 거리가 기록되지 않은 3퍼트입니다 — 거리를 입력하면 거리감 / 숏퍼트 미스로 나눠 보여드려요.'
                : '모든 3퍼트의 원인을 퍼트 거리 기록으로 구분했습니다.'}
            </div>
          </div>
        </Section>
      )}

      {/* 그린 스피드 — 그날의 그린이 빠르거나 느렸는지에 따라 퍼팅을 나눠 본다 */}
      {rep.greenSpeed && (
        <Section title="GREEN SPEED · 그린 스피드" sub={rep.mode === 'career' ? `${rep.greenSpeed.speedRounds}/${rep.greenSpeed.rounds}라운드 기록` : undefined}>
          <GreenSpeedPanel report={rep.greenSpeed} />
        </Section>
      )}

      {/* 다음 라운드 포커스 */}
      <Section title="NEXT ROUND · 다음 라운드 포커스">
        <div style={{ background: '#111827', border: '1px solid #1b2238', borderRadius: 8, padding: '4px 14px' }}>
          {rep.focus.length === 0
            ? <div style={{ fontSize: 12, color: '#8896b0', padding: '12px 0' }}>지금처럼 루틴을 유지하세요.</div>
            : rep.focus.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 0', borderBottom: i < rep.focus.length - 1 ? '1px solid #1b2238' : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,162,40,0.15)', color: '#c9a228', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: '#e8edf8', lineHeight: 1.55, wordBreak: 'keep-all' }}>{f.text}</div>
              </div>
            ))}
        </div>
      </Section>
    </div>
  );
}

