import { Target, Plus } from 'lucide-react';
import styles from '../../styles/styles';
import { goalText, goalProgress, MAX_GOALS } from '../../engine/goals.js';

// 홈의 목표 카드 — 정한 목표와 최근 라운드의 달성 흐름. 목표가 없으면 정하도록 이끈다 (기록이 있을 때만).
//   rounds  판정에 쓰는 라운드 (통계에 들어가는 라운드)
//   onOpen({ goalId?, metric? })  목표 시트 열기
export default function GoalsCard({ goals, rounds, hasRounds, onOpen }) {
  if (goals.length === 0) {
    if (!hasRounds) return null;
    return (
      <div data-role="goals-empty" style={{ ...styles.liveCard, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Target size={22} color="#c9a228" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8' }}>다음 라운드 목표를 정해 보세요</div>
          <div style={{ fontSize: 13, color: '#8896b0', lineHeight: 1.5, marginTop: 2, wordBreak: 'keep-all' }}>약점을 목표로 바꾸면 라운드가 끝날 때마다 달성했는지 알려 드려요.</div>
        </div>
        <button type="button" className="bb-press" data-role="goal-add" onClick={() => onOpen({})}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(201,162,40,0.6)', background: 'rgba(201,162,40,0.12)', color: '#c9a228', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>목표 정하기</button>
      </div>
    );
  }
  return (
    <div data-role="goals-card" style={styles.liveCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...styles.statLabel, marginBottom: 0 }}>목표</div>
        {goals.length < MAX_GOALS && (
          <button type="button" data-role="goal-add" onClick={() => onOpen({})}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#c9a228', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 4 }}><Plus size={14} />추가</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {goals.map((g) => {
          const p = goalProgress(g, rounds);
          const dots = [...p.results].reverse();
          return (
            <button key={g.id} type="button" className="bb-press" data-role="goal-row" onClick={() => onOpen({ goalId: g.id })}
              style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid #1b2238', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span data-role="goal-row-text" style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8' }}>{goalText(g)}</span>
                <span style={{ display: 'inline-flex', gap: 4 }} aria-hidden="true">
                  {dots.map((r) => <span key={r.id} data-met={r.met ? '1' : '0'} style={{ width: 10, height: 10, borderRadius: '50%', background: r.met ? '#3db87a' : 'transparent', border: `1.5px solid ${r.met ? '#3db87a' : '#ef5350'}` }} />)}
                </span>
              </div>
              <div data-role="goal-row-progress" style={{ fontSize: 13, color: '#8896b0', marginTop: 3 }}>
                {p.total > 0 ? `최근 ${p.total}라운드 중 ${p.met}번 달성` : '다음 라운드부터 판정해요'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
