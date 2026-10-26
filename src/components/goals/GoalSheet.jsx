import { useState } from 'react';
import styles from '../../styles/styles';
import KoEnTitle from '../ui/KoEnTitle';
import { GOAL_METRICS, metricOf, goalText, suggestTarget, recentAverage, newGoal } from '../../engine/goals.js';

// 다음 라운드 목표 정하기 — 지표를 고르고 목표값을 맞춘다. 목표값은 최근 라운드 평균보다 조금 나은 값으로 먼저 채워 준다.
//   existing  이미 있는 목표를 고칠 때 (지표는 그대로 두고 값만 고친다. 삭제도 여기서)
//   initialMetric  인사이트·리포트의 포커스에서 열 때 미리 고를 지표
//   rounds    제안·평균에 쓰는 라운드 (통계에 들어가는 라운드)
export default function GoalSheet({ rounds, goals, initialMetric = null, existing = null, onSave, onRemove, onClose }) {
  const taken = new Set(goals.filter((g) => g.id !== existing?.id).map((g) => g.metric));
  const free = GOAL_METRICS.filter((m) => !taken.has(m.id));
  const startMetric = existing?.metric ?? (initialMetric && !taken.has(initialMetric) ? initialMetric : free[0]?.id ?? null);
  const [metric, setMetric] = useState(startMetric);
  const [target, setTarget] = useState(existing?.target ?? (startMetric ? suggestTarget(startMetric, rounds) : 0));
  const m = metricOf(metric);
  if (!m) return null;
  const recent = recentAverage(metric, rounds);

  const pick = (id) => { setMetric(id); setTarget(suggestTarget(id, rounds)); };
  const bump = (dir) => setTarget((t) => Math.min(m.max, Math.max(m.min, t + dir * m.step)));
  const save = () => onSave(existing ? { ...existing, target } : newGoal({ metric, target }));

  const stepBtn = { width: 44, height: 44, borderRadius: 12, border: '1.5px solid #2c3a5c', background: '#1a2235', color: '#e8edf8', fontSize: 22, fontWeight: 800, cursor: 'pointer' };
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div data-role="goal-sheet" role="dialog" aria-modal="true" aria-label="다음 라운드 목표" style={{ ...styles.modalCard, maxWidth: 380, width: 'calc(100% - 32px)', textAlign: 'left', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 12, color: '#b4c0d8' }}><KoEnTitle ko={existing ? '목표 고치기' : '다음 라운드 목표'} en="GOAL" /></div>

        {!existing && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 6, marginBottom: 14 }}>
            {GOAL_METRICS.map((x) => {
              const on = x.id === metric;
              const off = taken.has(x.id);
              return (
                <button key={x.id} type="button" data-role={`goal-metric-${x.id}`} aria-pressed={on} disabled={off} onClick={() => pick(x.id)}
                  style={{ padding: '10px 4px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.35 : 1, textAlign: 'center',
                    border: on ? '2px solid #c9a228' : '1.5px solid #252f4a', background: on ? 'rgba(201,162,40,0.18)' : '#1a2235', color: on ? '#c9a228' : '#e8edf8' }}>{x.label}</button>
              );
            })}
          </div>
        )}
        {existing && <div style={{ fontSize: 16, fontWeight: 800, color: '#e8edf8', marginBottom: 10 }}>{m.label}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 6 }}>
          <button type="button" data-role="goal-minus" aria-label="목표값 줄이기" style={stepBtn} onClick={() => bump(-1)}>−</button>
          <div data-role="goal-target" style={{ minWidth: 120, textAlign: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: '#e8edf8', fontVariantNumeric: 'tabular-nums' }}>{target}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#8896b0', marginLeft: 4 }}>{m.unit} {m.better === 'down' ? '이하' : '이상'}</span>
          </div>
          <button type="button" data-role="goal-plus" aria-label="목표값 늘리기" style={stepBtn} onClick={() => bump(1)}>＋</button>
        </div>
        <div data-role="goal-recent" style={{ textAlign: 'center', fontSize: 13, color: '#8896b0', minHeight: 20, marginBottom: 10 }}>
          {recent ? `최근 ${recent.n}라운드 평균 ${Number.isInteger(recent.avg) ? recent.avg : recent.avg.toFixed(1)}${m.unit}` : '아직 비교할 라운드가 없어요'}
        </div>
        <div data-role="goal-text" style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#c9a228', marginBottom: 6 }}>{goalText({ metric, target })}</div>
        <div style={{ fontSize: 13, color: '#8aa0c4', lineHeight: 1.6, textAlign: 'center', marginBottom: 14, wordBreak: 'keep-all' }}>
          다음 라운드부터 끝날 때마다 달성했는지 알려 드려요. 18홀 1인 라운드만 판정해요.
        </div>

        <div style={styles.modalActions}>
          <button style={styles.modalBtnCancel} onClick={onClose}>취소</button>
          <button data-role="goal-save" style={styles.modalBtnPrimary} onClick={save}>{existing ? '저장' : '목표로 정하기'}</button>
        </div>
        {existing && (
          <button type="button" data-role="goal-remove" onClick={() => onRemove(existing.id)}
            style={{ width: '100%', marginTop: 10, padding: '10px', background: 'none', border: 'none', color: '#ef5350', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>이 목표 지우기</button>
        )}
      </div>
    </div>
  );
}
