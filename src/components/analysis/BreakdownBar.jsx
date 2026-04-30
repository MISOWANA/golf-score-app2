import React from 'react';
import styles from '../../styles/styles';

export default function BreakdownBar({ label, count, total, color }) {
  const pct = (count / total) * 100;
  return (
    <div style={styles.breakdownRow}>
      <div style={styles.breakdownLabel}>{label}</div>
      <div style={styles.breakdownBarTrack}>
        <div style={{ ...styles.breakdownBarFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={styles.breakdownCount}>{count}</div>
    </div>
  );
}
