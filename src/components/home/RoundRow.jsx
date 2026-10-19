import { ChevronRight } from 'lucide-react';
import styles from '../../styles/styles';
import { myPlayer, totalPar as sumPar } from '../../engine/players.js';

// 파 대비 색: 언더 초록 · 오버 빨강 · 이븐 회색 (막대·배지가 같은 색을 쓴다)
const TONE = {
  under: { fg: '#3db87a', bg: 'rgba(61,184,122,0.12)' },
  over: { fg: '#ef5350', bg: 'rgba(239,83,80,0.12)' },
  even: { fg: '#8896b0', bg: 'rgba(136,150,176,0.12)' },
};

export default function RoundRow({ round, onClick, userName }) {
  const firstPlayer = myPlayer(round, userName);
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = sumPar(round);
  const diff = total - totalPar;
  const tone = diff < 0 ? TONE.under : diff > 0 ? TONE.over : TONE.even;

  return (
    <button className="bb-press" style={styles.roundRow} onClick={onClick}>
      <div style={{ ...styles.roundAccent, background: tone.fg }} />
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
        <div style={{ ...styles.roundDiff, color: tone.fg, background: tone.bg }}>
          {diff > 0 ? `+${diff}` : diff === 0 ? 'E' : diff}
        </div>
        <ChevronRight size={16} style={styles.roundChevron} />
      </div>
    </button>
  );
}
