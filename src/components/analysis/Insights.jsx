import React from 'react';
import styles from '../../styles/styles';
import { toHoleInput, analyzeRound } from '../../engine/engine.js';
import { HOLE_RULES } from '../../engine/rules/holeRules.js';
import { ROUND_RULES } from '../../engine/rules/roundRules.js';

const SEVERITY_COLOR  = { positive: '#1f5e3a', neutral: '#6b6558', warning: '#d97706', critical: '#c04a3e' };
const SEVERITY_BG     = { positive: '#e8f5eb', neutral: '#f5f0e6', warning: '#fef3c7', critical: '#fde8e3' };
const SEVERITY_BADGE  = { positive: '✓', neutral: '·', warning: '△', critical: '!' };

export default function Insights({ round, player }) {
  const holeInputs = round.holes.map(h => toHoleInput(h, player));
  const { roundInsights, holeInsights } = analyzeRound(holeInputs, HOLE_RULES, ROUND_RULES);

  // 라운드 인사이트: critical/warning/positive 중 상위 5개
  const topRoundInsights = roundInsights
    .filter(i => i.severity !== 'neutral')
    .slice(0, 5);

  // 홀 인사이트: 홀당 가장 심각한 1개만, warning/critical 우선
  const notableHoles = holeInsights
    .flatMap(insights =>
      insights
        .filter(i => i.severity === 'critical' || i.severity === 'warning')
        .slice(0, 1)
    )
    .sort((a, b) => {
      const order = { critical: 0, warning: 1 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    })
    .slice(0, 3);

  const allInsights = [...topRoundInsights, ...notableHoles];

  if (allInsights.length === 0) {
    return (
      <div style={styles.insightsList}>
        <div style={styles.insightRow}>
          <div style={styles.insightIcon}>✨</div>
          <div style={styles.insightText}>균형 잡힌 라운드였습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.insightCards}>
      {allInsights.map((ins, i) => {
        const color = SEVERITY_COLOR[ins.severity] ?? '#6b6558';
        const bg    = SEVERITY_BG[ins.severity]    ?? '#f5f0e6';
        const badge = SEVERITY_BADGE[ins.severity] ?? '·';
        return (
          <div key={i} style={{ ...styles.insightCard, borderLeftColor: color }}>
            <div style={{ ...styles.insightCardBadge, background: bg, color }}>
              {badge}
            </div>
            <div style={styles.insightCardContent}>
              {ins.holeNumber != null && (
                <div style={{ fontSize: 10, color: '#8b6f47', fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>
                  HOLE {ins.holeNumber}
                </div>
              )}
              <div style={styles.insightCardTitle}>{ins.title}</div>
              <div style={styles.insightCardDetail}>{ins.summary}</div>
              <div style={{ ...styles.insightCardDetail, color: '#888', marginTop: 3 }}>
                {ins.recommendation}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
