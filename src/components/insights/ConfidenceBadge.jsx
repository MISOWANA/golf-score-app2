import styles from '../../styles/styles';
import { TIER_LABEL } from '../../engine/stats.js';

// §7-3: 신뢰도 낮음/중간도 숨기지 않고 항상 배지로 노출한다.
// 표본 수(n=)는 사용자에게 의미 없는 원자료라 배지 라벨만 보여준다.
// "높음" 만 덩그러니 있으면 성적이 높다는 말로 읽힌다. 큰 숫자 옆의 대표 배지는 full 로 "신뢰도 높음" 이라고 풀어 쓰고,
// 좁은 줄(표의 행)에서는 짧게 두되 툴팁·접근성 이름에 "신뢰도" 를 붙인다.
export default function ConfidenceBadge({ tier, full = false }) {
  const label = TIER_LABEL[tier] ?? '낮음';
  return (
    <span data-role="conf-badge" data-tier={tier ?? 'low'} title={`신뢰도 ${label}`} aria-label={`신뢰도 ${label}`}
      style={{ ...styles.riConfBadge, whiteSpace: 'nowrap', flexShrink: 0, ...(tier === 'high' ? styles.riConfBadgeHigh : {}) }}>
      {full ? `신뢰도 ${label}` : label}
    </span>
  );
}

// Wilson 95% 신뢰구간을 0~100% 트랙 위에 표시. 구간 폭이 곧 "얼마나 믿을 수 있는가"다.
export function ConfidenceIntervalBar({ low, high, center }) {
  const l = Math.max(0, Math.min(100, low * 100));
  const h = Math.max(0, Math.min(100, high * 100));
  const c = Math.max(0, Math.min(100, center * 100));
  return (
    <div style={styles.riCiTrack}>
      <div style={{ ...styles.riCiFill, left: `${l}%`, width: `${Math.max(1, h - l)}%` }} />
      <div style={{ ...styles.riCiCenter, left: `calc(${c}% - 1px)` }} />
    </div>
  );
}
