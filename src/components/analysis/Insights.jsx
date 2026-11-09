import styles from '../../styles/styles';
import { tintWash, TINT_SOFT } from '../ui/tint.js';
import { buildCheckpoints } from '../../engine/roundCheckpoints.js';

const SEVERITY_COLOR  = { warning: '#c9a228', critical: '#ef5350' };
const SEVERITY_BG     = { warning: 'rgba(201,162,40,0.12)', critical: 'rgba(239,83,80,0.12)' };
const SEVERITY_BADGE  = { warning: '△', critical: '!' };

// 결과 화면 아래쪽 "짚어 볼 곳" — 문제가 없으면 구역 자체를 그리지 않는다. said: 위 요약 카드가 이미 말한 항목 [{ title, hole }].
export default function Insights({ round, player, said = [] }) {
  const items = buildCheckpoints(round, player, said);
  if (items.length === 0) return null;
  return (
    <div style={styles.section} data-role="checkpoints">
      <div style={styles.sectionTitle}>CHECK · 짚어 볼 곳</div>
      <div style={styles.insightCards}>
        {items.map((it) => {
          const color = SEVERITY_COLOR[it.severity] ?? '#8896b0';
          return (
            <div key={it.key} data-role="checkpoint" style={{ ...styles.insightCard, ...tintWash(color, TINT_SOFT) }}>
              <div style={{ ...styles.insightCardBadge, background: SEVERITY_BG[it.severity], color }}>{SEVERITY_BADGE[it.severity]}</div>
              <div style={{ ...styles.insightCardContent, textAlign: 'left', minWidth: 0 }}>
                {it.holes.length > 0 && (
                  <div data-role="checkpoint-holes" style={{ fontSize: 13, color: '#e6c35a', fontWeight: 800, marginBottom: 2 }}>
                    {it.holes.join(' · ')}번 홀
                  </div>
                )}
                <div style={styles.insightCardTitle}>{it.title}</div>
                {/* 홀에서 난 문제는 제목이 상황을 말하므로 조언만, 라운드 전체 문제는 상황 설명도 */}
                {it.holes.length === 0 && <div style={styles.insightCardDetail}>{it.summary}</div>}
                <div style={it.holes.length === 0 ? { ...styles.insightCardDetail, color: '#8896b0', marginTop: 3 } : styles.insightCardDetail}>{it.recommendation}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
