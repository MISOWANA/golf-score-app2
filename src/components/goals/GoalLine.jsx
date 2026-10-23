import { Target } from 'lucide-react';
import { goalText, goalValue, metricOf } from '../../engine/goals.js';

// 오늘의 목표 한 줄 — 라운드 설정 화면과 스코어 입력 화면 위쪽. 정하기만 하고 라운드 중에 보이지 않으면 효과가 없다.
//   round  진행 중인 라운드를 넘기면 "지금 N" 도 보여 준다 (낮을수록 좋은 지표가 이미 목표를 넘었으면 빨간색)
export default function GoalLine({ goals, round = null, margin = '0 0 10px' }) {
  if (!goals?.length) return null;
  return (
    <div data-role="goal-line" style={{ margin, display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
      {goals.map((g) => {
        const m = metricOf(g.metric);
        const now = round ? goalValue(round, g.metric) : null;
        const over = now != null && m.better === 'down' && now > g.target;
        return (
          <div key={g.id} data-role="goal-line-item" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#c9a228', fontWeight: 700 }}>
            <Target size={14} style={{ flexShrink: 0 }} />
            <span style={{ minWidth: 0 }}>오늘의 목표 · {goalText(g)}</span>
            {now != null && <span data-role="goal-now" style={{ color: over ? '#ef5350' : '#8896b0', fontWeight: 600, whiteSpace: 'nowrap' }}>· 지금 {now}{m.unit}{over ? ' (초과)' : ''}</span>}
          </div>
        );
      })}
    </div>
  );
}
