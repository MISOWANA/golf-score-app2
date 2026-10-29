import { ChevronRight } from 'lucide-react';
import styles from '../../styles/styles';
import { scoreTone, diffLabel } from '../ui/scoreTone.js';
import { tintWash, TINT_ROW } from '../ui/tint.js';
import { myPlayer, totalPar as sumPar } from '../../engine/players.js';
import { isNineHoleRound } from '../../engine/nines.js';
import { nineBadgeStyle } from '../ui/nineBadge.js';
import { roundDateLong } from '../../engine/dateLabel.js';

export default function RoundRow({ round, onClick, userName }) {
  const firstPlayer = myPlayer(round, userName);
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = sumPar(round);
  const diff = total - totalPar;
  const tone = scoreTone(diff);

  return (
    <button className="bb-press" style={{ ...styles.roundRow, ...tintWash(tone.fg, TINT_ROW) }} onClick={onClick}>
      <div style={styles.roundRowLeft}>
        <div style={styles.roundCourse}>
          {round.courseName}
          {isNineHoleRound(round) && <span data-role="nine-badge" style={nineBadgeStyle}>9홀</span>}
        </div>
        <div style={styles.roundDate}>
          {roundDateLong(round.date)}
          <span style={styles.dot}> · </span>
          {round.players.length}인
        </div>
      </div>
      <div style={styles.roundRowRight}>
        <div style={styles.roundScore}>{total}</div>
        <div style={{ ...styles.roundDiff, color: tone.fg, background: tone.bg }}>{diffLabel(diff)}</div>
        <ChevronRight size={16} style={styles.roundChevron} />
      </div>
    </button>
  );
}
