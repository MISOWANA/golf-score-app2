import InsightCard from './InsightCard.jsx';
import InfoNote from '../ui/InfoNote';
import KoEnTitle from '../ui/KoEnTitle';
import { FOCUS_METRIC, MAX_GOALS } from '../../engine/goals.js';
import { PUTT_CAUSE_LABEL, PUTT_CAUSE_ORDER } from '../../engine/puttAnalysis.js';
import { speedLabel } from '../../engine/greenSpeed.js';

// 인사이트 리포트의 조각들. 리포트 자체(buildInsightReport)는 InsightsView 가 한 번 계산해서
// 아래 조각들에 나눠 준다 — 장(章)마다 알맞은 자리에 놓기 위해서다:
//   ReportHeader     1장  한 줄 요약
//   ReportFindings   1장  잘한 점 · 개선 포인트
//   ThreePuttCause   4장  퍼팅 — 3퍼트 원인
//   NextFocus        5장  다음 라운드 포커스

const CAUSE_COLOR = { lag: '#c9a228', short: '#ef5350', both: '#c04a3e', mid: '#6b8cae', close: '#8a6fb0', unknown: '#4d5a78' };

// note: 제목 옆 (!) 버튼으로 여는 설명 (noteTitle 은 알림창 제목)
export const Section = ({ title, sub, note, noteTitle, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#8ca4bc', letterSpacing: '0.16em' }}>
        <KoEnTitle text={title} info={note && <InfoNote title={noteTitle}>{note}</InfoNote>} />
      </div>
      {sub && <div style={{ fontSize: 13, color: '#6e84a8' }}>{sub}</div>}
    </div>
    {children}
  </div>
);

// 한 줄 요약 카드. 어느 라운드(들)인지는 위의 범위 카드가 말하므로 여기서는 요약 문장만 둔다.
export function ReportHeader({ rep, past = false }) {
  const single = rep.replays.length === 1 ? rep.replays[0] : null;
  const speed = rep.mode === 'round' ? rep.greenSpeed?.latest?.speed : null;
  return (
    <div data-panel="report" style={{ background: 'linear-gradient(135deg, #0e1c14 0%, #0f2218 100%)', border: '1px solid #1d3a2a', borderRadius: 16, padding: '16px 16px 16px', marginBottom: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#e8edf8', lineHeight: 1.55, wordBreak: 'keep-all' }} data-role="report-headline">
        {single
          ? single.headline
          : `평균 ${rep.stats.avgScore.toFixed(1)}타 · 3퍼트 ${rep.stats.threePutts}회 · 페널티 ${rep.stats.penalties}회 (${rep.stats.rounds}라운드)`}
      </div>
      {speed != null && (
        <div data-role="report-green-speed" style={{ fontSize: 13, color: '#8ca4bc', marginTop: 8 }}>{past ? '그날' : '오늘'} 그린 · {speedLabel(speed)}</div>
      )}
    </div>
  );
}

export function ReportFindings({ rep }) {
  return (
    <>
      <Section title="STRENGTHS · 잘한 점" sub={`${rep.strengths.length}개`}>
        {rep.strengths.length === 0
          ? <div style={{ fontSize: 14, color: '#8896b0' }}>이번에는 뚜렷한 강점 신호가 없어요. 기록이 쌓이면 강점이 보입니다.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rep.strengths.map(i => <InsightCard key={i.insightType} insight={i} compact />)}</div>}
      </Section>
      <Section title="IMPROVE · 개선 포인트" sub={`${rep.issues.length}개`}>
        {rep.issues.length === 0
          ? <div style={{ fontSize: 14, color: '#3db87a' }}>눈에 띄는 약점 신호가 없습니다.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{rep.issues.map(i => <InsightCard key={i.insightType} insight={i} />)}</div>}
      </Section>
    </>
  );
}

export function ThreePuttCause({ rep }) {
  const c = rep.causes;
  if (c.total === 0) return null;
  return (
    <Section
      title="THREE-PUTT · 3퍼트 원인 (퍼트 거리 기준)" sub={`${c.total}회`} noteTitle="3퍼트 원인 구분"
      note={c.counts.unknown > 0
        ? '판단 보류는 퍼트 거리가 기록되지 않은 3퍼트입니다 — 거리를 입력하면 거리감 / 숏퍼트 미스로 나눠 보여드려요.'
        : '모든 3퍼트의 원인을 퍼트 거리 기록으로 구분했습니다.'}
    >
      <div style={{ background: '#111827', border: '1px solid #1b2238', borderRadius: 16, padding: '12px 14px' }} data-role="cause-card">
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#1b2238', marginBottom: 12 }}>
          {PUTT_CAUSE_ORDER.filter(k => c.counts[k] > 0).map(k => (
            <div key={k} style={{ width: `${(c.counts[k] / c.total) * 100}%`, background: CAUSE_COLOR[k] }} />
          ))}
        </div>
        {PUTT_CAUSE_ORDER.filter(k => c.counts[k] > 0).map(k => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: CAUSE_COLOR[k], flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#b4c0d8' }}>{PUTT_CAUSE_LABEL[k]}</span>
            <b style={{ color: '#e8edf8' }}>{c.counts[k]}회</b>
            <span style={{ width: 40, textAlign: 'right', color: '#6e84a8' }}>{Math.round((c.counts[k] / c.total) * 100)}%</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// goals · onSetGoal(metric): 포커스를 목표로 정하는 버튼 — 그 영역의 목표 지표가 아직 없고 목표가 2개 미만일 때만
export function NextFocus({ rep, goals = [], onSetGoal }) {
  return (
    <Section title="FOCUS · 다음 라운드 포커스">
      <div style={{ background: '#111827', border: '1px solid #1b2238', borderRadius: 16, padding: '4px 14px' }}>
        {rep.focus.length === 0
          ? <div style={{ fontSize: 14, color: '#8896b0', padding: '12px 0' }}>지금처럼 루틴을 유지하세요.</div>
          : rep.focus.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 0', borderBottom: i < rep.focus.length - 1 ? '1px solid #1b2238' : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,162,40,0.15)', color: '#c9a228', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: '#e8edf8', lineHeight: 1.55, wordBreak: 'keep-all', flex: 1, minWidth: 0 }}>
                {f.text}
                {(() => {
                  const metric = FOCUS_METRIC[f.category];
                  if (!onSetGoal || !metric || goals.length >= MAX_GOALS || goals.some((g) => g.metric === metric)) return null;
                  return (
                    <div><button type="button" data-role="focus-set-goal" onClick={() => onSetGoal(metric)}
                      style={{ marginTop: 6, padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(201,162,40,0.6)', background: 'rgba(201,162,40,0.14)', color: '#f3d36b', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>목표로 정하기</button></div>
                  );
                })()}
              </div>
            </div>
          ))}
      </div>
    </Section>
  );
}
