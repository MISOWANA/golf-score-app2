import React from 'react';
import { Trash2 } from 'lucide-react';
import styles from '../../styles/styles';
import { myPlayer, totalPar as sumPar } from '../../engine/players.js';

export default function HistoryCard({ round, onSelect, onDelete, userName }) {
  const firstPlayer = myPlayer(round, userName);
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = sumPar(round);
  const diff = total - totalPar;

  return (
    <div style={styles.historyCard}>
      <button style={styles.historyCardMain} onClick={onSelect}>
        <div style={styles.historyCardLeft}>
          <div style={styles.historyCourse}>{round.courseName}</div>
          <div style={styles.historyMeta}>
            {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
            <span style={styles.dot}> · </span>
            {round.players.join(', ')}
          </div>
        </div>
        <div style={styles.historyCardRight}>
          <div style={styles.historyScore}>{total}</div>
          <div style={{ ...styles.historyDiff, color: diff > 0 ? '#ef5350' : diff < 0 ? '#3db87a' : '#8896b0' }}>
            ({diff > 0 ? `+${diff}` : diff === 0 ? 'E' : diff})
          </div>
        </div>
      </button>
      <button style={styles.deleteBtn} onClick={onDelete}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}
