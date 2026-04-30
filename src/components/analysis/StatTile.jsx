import React from 'react';
import styles from '../../styles/styles';

export default function StatTile({ label, value, sub }) {
  return (
    <div style={styles.statTile}>
      <div style={styles.tileLabel}>{label}</div>
      <div style={styles.tileValue}>{value}</div>
      <div style={styles.tileSub}>{sub}</div>
    </div>
  );
}
