import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from '../../styles/styles';

export default function Stepper({ value, suffix, onDecrement, onIncrement, canDecrement, canIncrement, highlight }) {
  return (
    <div style={{ ...styles.clubStepper, ...(highlight ? styles.clubStepperHighlight : {}) }}>
      <button
        style={{
          ...styles.miniStepperTapZone,
          opacity: canDecrement ? 1 : 0.3,
          cursor: canDecrement ? 'pointer' : 'not-allowed',
        }}
        onClick={() => canDecrement && onDecrement()}
        disabled={!canDecrement}
      >
        <ChevronLeft size={16} strokeWidth={2.5} />
      </button>
      <div style={styles.clubStepperValue}>
        <span style={styles.clubAvgNum}>{value}</span>
        <span style={styles.clubAvgUnit}>{suffix}</span>
      </div>
      <button
        style={{
          ...styles.miniStepperTapZone,
          opacity: canIncrement ? 1 : 0.3,
          cursor: canIncrement ? 'pointer' : 'not-allowed',
        }}
        onClick={() => canIncrement && onIncrement()}
        disabled={!canIncrement}
      >
        <ChevronRight size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
