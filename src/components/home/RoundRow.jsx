import React from 'react';
import styles from '../../styles/styles';

export default function RoundRow({ round, onClick }) {
  const firstPlayer = round.players[0];
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = round.pars.reduce((a, b) => a + b, 0);
  const diff = total - totalPar;

  return (
    <button style={styles.roundRow} onClick={onClick}>
      <div style={styles.roundRowLeft}>
        <div style={styles.roundCourse}>{round.courseName}</div>
        <div style={styles.roundDate}>
          {new Date(round.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
          <span style={styles.dot}> · </span>
          {round.players.length}인
        </div>
      </div>
      <div style={styles.roundRowRight}>
        <div style={styles.roundScore}>{total}</div>
        <div style={{ ...styles.roundDiff, color: diff > 0 ? '#c04a3e' : diff < 0 ? '#1f5e3a' : '#6b6558' }}>
          {diff > 0 ? `+${diff}` : diff === 0 ? 'E' : diff}
        </div>
      </div>
    </button>
  );
}
