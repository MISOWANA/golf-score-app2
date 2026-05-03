import React from 'react';
import styles from '../../styles/styles';

export default function ScorecardTable({ round, player }) {
  const renderTable = (holes, label, offset) => {
    const parSum = holes.reduce((s, h) => s + h.par, 0);
    const strokesSum = holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const puttsSum = holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
    const diffSum = strokesSum - parSum;
    const diffLabel = diffSum === 0 ? 'E' : diffSum > 0 ? `+${diffSum}` : `${diffSum}`;

    return (
      <div style={styles.scorecardTable}>
        <div style={styles.scorecardTableRow}>
          <div style={{ ...styles.scorecardRowLabel, ...styles.scorecardRowLabelHeader }}>
            {label}
          </div>
          <div style={styles.scorecardTableCells}>
            {holes.map((h, localIdx) => (
              <div key={offset + localIdx} style={styles.scorecardHeaderCell}>
                {offset + localIdx + 1}
              </div>
            ))}
          </div>
          <div style={{ ...styles.scorecardTotalCell, ...styles.scorecardTotalHeader }}>
            TOT
          </div>
        </div>

        <div style={styles.scorecardTableRow}>
          <div style={styles.scorecardRowLabel}>PAR</div>
          <div style={styles.scorecardTableCells}>
            {holes.map((h, localIdx) => (
              <div key={offset + localIdx} style={styles.scorecardParCell}>
                {h.par}
              </div>
            ))}
          </div>
          <div style={styles.scorecardTotalCell}>{parSum}</div>
        </div>

        <div style={styles.scorecardTableRow}>
          <div style={styles.scorecardRowLabel}>SCORE</div>
          <div style={styles.scorecardTableCells}>
            {holes.map((h, localIdx) => {
              const strokes = h.scores[player]?.strokes;
              const diff = strokes != null ? strokes - h.par : null;
              const isHoleInOne = strokes === 1;

              let markerStyle = {};
              let markerColor = '#3a3a3a';
              if (diff !== null) {
                if (isHoleInOne) {
                  markerStyle = styles.markerHoleInOne;
                  markerColor = '#fff';
                } else if (diff <= -2) {
                  markerStyle = styles.markerEagle;
                  markerColor = '#b8410a';
                } else if (diff === -1) {
                  markerStyle = styles.markerBirdie;
                  markerColor = '#b8410a';
                } else if (diff === 1) {
                  markerStyle = styles.markerBogey;
                } else if (diff >= 2) {
                  markerStyle = styles.markerDouble;
                }
              }

              return (
                <div key={offset + localIdx} style={styles.scorecardScoreCell}>
                  <span style={{ ...styles.scoreMarker, ...markerStyle, color: markerColor, fontWeight: '700' }}>
                    {isHoleInOne && <span style={styles.holeInOneStar}>★</span>}
                    {strokes || '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{
            ...styles.scorecardTotalCell,
            color: diffSum > 0 ? '#ef5350' : diffSum < 0 ? '#3db87a' : '#e8edf8',
            fontWeight: '700',
          }}>
            {strokesSum}
            <span style={styles.scorecardTotalDiff}> {diffLabel}</span>
          </div>
        </div>

        <div style={{ ...styles.scorecardTableRow, borderBottom: 'none' }}>
          <div style={styles.scorecardRowLabel}>PUTT</div>
          <div style={styles.scorecardTableCells}>
            {holes.map((h, localIdx) => {
              const putts = h.scores[player]?.putts;
              return (
                <div key={offset + localIdx} style={styles.scorecardPuttCell}>
                  {putts != null ? putts : '—'}
                </div>
              );
            })}
          </div>
          <div style={styles.scorecardTotalCell}>{puttsSum}</div>
        </div>
      </div>
    );
  };

  const totalStrokes = round.holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
  const totalPar = round.pars.reduce((a, b) => a + b, 0);
  const totalPutts = round.holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
  const totalDiff = totalStrokes - totalPar;

  return (
    <div style={styles.scorecardWrap}>
      {renderTable(round.holes.slice(0, 9), 'OUT', 0)}
      {renderTable(round.holes.slice(9), 'IN', 9)}

      <div style={styles.scorecardGrandTotal}>
        <div style={styles.scorecardGrandRow}>
          <span style={styles.scorecardGrandLabel}>TOTAL</span>
          <div style={styles.scorecardGrandValues}>
            <span style={styles.scorecardGrandItem}>
              <span style={styles.scorecardGrandItemLabel}>Par</span>
              <span style={styles.scorecardGrandItemValue}>{totalPar}</span>
            </span>
            <span style={styles.scorecardGrandItem}>
              <span style={styles.scorecardGrandItemLabel}>Score</span>
              <span style={{
                ...styles.scorecardGrandItemValue,
                color: totalDiff > 0 ? '#ef5350' : totalDiff < 0 ? '#3db87a' : '#e8edf8',
              }}>
                {totalStrokes} ({totalDiff === 0 ? 'E' : totalDiff > 0 ? `+${totalDiff}` : totalDiff})
              </span>
            </span>
            <span style={styles.scorecardGrandItem}>
              <span style={styles.scorecardGrandItemLabel}>Putts</span>
              <span style={styles.scorecardGrandItemValue}>{totalPutts}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
