import { Trash2 } from 'lucide-react';
import styles from '../../styles/styles';
import { scoreTone, diffLabel } from '../ui/scoreTone.js';
import { tintWash, TINT_ROW } from '../ui/tint.js';
import { myPlayer, totalPar as sumPar } from '../../engine/players.js';
import { isNineHoleRound } from '../../engine/nines.js';
import { nineBadgeStyle } from '../ui/nineBadge.js';

// 홈의 최근 라운드 행과 같은 모양: 파 대비 색이 점수 쪽에서 번지는 틴트 · 점수 · 파 대비 배지. 오른쪽 끝은 삭제.
export default function HistoryCard({ round, onSelect, onDelete, userName }) {
  const firstPlayer = myPlayer(round, userName);
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = sumPar(round);
  const diff = total - totalPar;
  const tone = scoreTone(diff);

  return (
    <div style={{ ...styles.historyCard, ...tintWash(tone.fg, TINT_ROW) }}>
      <button className="bb-press" style={styles.historyCardMain} onClick={onSelect}>
        <div style={styles.historyCardLeft}>
          <div style={styles.historyCourse}>
            {round.courseName}
            {isNineHoleRound(round) && <span data-role="nine-badge" style={nineBadgeStyle}>9홀</span>}
          </div>
          <div style={styles.historyMeta}>
            {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
            <span style={styles.dot}> · </span>
            {round.players.join(', ')}
          </div>
        </div>
        <div style={styles.historyCardRight}>
          <div style={styles.historyScore}>{total}</div>
          <div style={{ ...styles.roundDiff, color: tone.fg, background: tone.bg }}>{diffLabel(diff)}</div>
        </div>
      </button>
      <button style={styles.deleteBtn} onClick={onDelete} aria-label="라운드 삭제">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
