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
        <Target size={22} color="#1b64da" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#191f28' }}>다음 라운드 목표를 정해 보세요</div>
          <div style={{ fontSize: 13, color: '#4e5968', lineHeight: 1.5, marginTop: 2, wordBreak: 'keep-all' }}>약점을 목표로 바꾸면 라운드가 끝날 때마다 달성했는지 알려 드려요.</div>
        </div>
        <button type="button" className="bb-press" data-role="goal-add" onClick={() => onOpen({})}
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 10, border: '1.5px solid rgba(27,100,218,0.6)', background: 'rgba(27,100,218,0.12)', color: '#1b64da', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>목표 정하기</button>
      </div>
    );
  }
  return (
    <div data-role="goals-card" style={styles.liveCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ ...styles.statLabel, marginBottom: 0 }}>목표</div>
        {goals.length < MAX_GOALS && (
          <button type="button" data-role="goal-add" onClick={() => onOpen({})}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1b64da', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44, margin: '-10px -6px', padding: '0 10px' }}><Plus size={14} />추가</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {goals.map((g) => {
          const p = goalProgress(g, rounds);
          const dots = [...p.results].reverse();
          return (
            <button key={g.id} type="button" className="bb-press" data-role="goal-row" onClick={() => onOpen({ goalId: g.id })}
              style={{ width: '100%', textAlign: 'left', background: 'rgba(25,31,40,0.024)', border: '1px solid #e5e8eb', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span data-role="goal-row-text" style={{ fontSize: 15, fontWeight: 800, color: '#191f28' }}>{goalText(g)}</span>
                <span style={{ display: 'inline-flex', gap: 4 }} aria-hidden="true">
                  {dots.map((r) => <span key={r.id} data-met={r.met ? '1' : '0'} style={{ width: 10, height: 10, borderRadius: '50%', background: r.met ? '#0a7f3f' : 'transparent', border: `1.5px solid ${r.met ? '#0a7f3f' : '#c8323a'}` }} />)}
                </span>
              </div>
              <div data-role="goal-row-progress" style={{ fontSize: 13, color: '#4e5968', marginTop: 3 }}>
                {p.total > 0 ? `최근 ${p.total}라운드 중 ${p.met}번 달성` : '다음 라운드부터 판정해요'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
