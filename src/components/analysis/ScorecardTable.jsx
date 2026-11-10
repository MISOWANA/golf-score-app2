import { Fragment } from 'react';
import styles from '../../styles/styles';
import { totalPar as sumPar } from '../../engine/players.js';
import { ninesOf } from '../../engine/nines.js';

const getHeaderFontSize = (text) => {
  const len = (text || '').length;
  if (len <= 3) return '13px';
  if (len <= 5) return '12px';
  if (len <= 7) return '11px';
  return '10px';
};

export default function ScorecardTable({ round, player, onSelectHole }) {
  const renderTable = (holes, label, offset) => {
    const parSum = holes.reduce((s, h) => s + h.par, 0);
    const strokesSum = holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const puttsSum = holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
    const diffSum = strokesSum - parSum;
    const diffLabel = diffSum === 0 ? 'E' : diffSum > 0 ? `+${diffSum}` : `${diffSum}`;

    return (
      <div style={styles.scorecardTable}>
        <div style={styles.scorecardTableRow}>
          <div style={{
            ...styles.scorecardRowLabel,
            ...styles.scorecardRowLabelHeader,
            fontSize: getHeaderFontSize(label),
          }}>
            {label}
          </div>
          <div style={styles.scorecardTableCells}>
            {holes.map((h, localIdx) => {
              const idx = offset + localIdx;
              return (
                <div
                  key={idx}
                  onClick={onSelectHole ? () => onSelectHole(idx) : undefined}
                  style={{
                    ...styles.scorecardHeaderCell,
                    ...(onSelectHole ? { cursor: 'pointer', color: '#1b64da' } : {}),
                  }}
                >
                  {h.holeNumber ?? idx + 1}
                </div>
              );
            })}
          </div>
          <div style={{ ...styles.scorecardTotalCell, ...styles.scorecardTotalHeader }}>
            TOT
          </div>
        </div>

        <div style={styles.scorecardTableRow}>
          <div style={styles.scorecardRowLabel}>파</div>
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
          <div style={styles.scorecardRowLabel}>스코어</div>
          <div style={styles.scorecardTableCells}>
            {holes.map((h, localIdx) => {
              const strokes = h.scores[player]?.strokes;
              const diff = strokes != null ? strokes - h.par : null;
              const isHoleInOne = strokes === 1;

              // 글자색은 표식 스타일(팔레트)이 정한다 — 입력 화면의 스코어카드와 같은 색. 입력하지 않은 홀('—')만 흐리게.
              let markerStyle = styles.markerPar;
              if (diff === null) markerStyle = { color: '#4e5968' };
              else if (isHoleInOne) markerStyle = styles.markerHoleInOne;
              else if (diff <= -2) markerStyle = styles.markerEagle;
              else if (diff === -1) markerStyle = styles.markerBirdie;
              else if (diff === 1) markerStyle = styles.markerBogey;
              else if (diff >= 2) markerStyle = styles.markerDouble;

              return (
                <div key={offset + localIdx} style={styles.scorecardScoreCell}>
                  <span style={{ ...styles.scoreMarker, ...markerStyle, fontWeight: '700' }}>
                    {isHoleInOne && <span style={styles.holeInOneStar}>★</span>}
                    {strokes || '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{
            ...styles.scorecardTotalCell,
            color: diffSum > 0 ? '#c8323a' : diffSum < 0 ? '#0a7f3f' : '#191f28',
            fontWeight: '700',
          }}>
            {strokesSum}
            <span style={styles.scorecardTotalDiff}>({diffLabel})</span>
          </div>
        </div>

        <div style={{ ...styles.scorecardTableRow, borderBottom: 'none' }}>
          <div style={styles.scorecardRowLabel}>퍼트</div>
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
  const totalPar = sumPar(round);
  const totalPutts = round.holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
  const totalDiff = totalStrokes - totalPar;

  return (
    <div style={styles.scorecardWrap}>
      {/* 18홀은 OUT·IN 두 표, 9홀은 친 9홀 한 표 */}
      {ninesOf(round).map(({ key, label, holes }) => (
        <Fragment key={key}>{renderTable(holes.map(x => x.hole), label, holes[0].index)}</Fragment>
      ))}

      <div style={styles.scorecardGrandTotal}>
        <div style={styles.scorecardGrandRow}>
          <span style={styles.scorecardGrandLabel}>합계</span>
          <div style={styles.scorecardGrandValues}>
            <span style={styles.scorecardGrandItem}>
              <span style={styles.scorecardGrandItemLabel}>Par</span>
              <span style={styles.scorecardGrandItemValue}>{totalPar}</span>
            </span>
            <span style={styles.scorecardGrandItem}>
              <span style={styles.scorecardGrandItemLabel}>Score</span>
              <span style={{
                ...styles.scorecardGrandItemValue,
                color: totalDiff > 0 ? '#c8323a' : totalDiff < 0 ? '#0a7f3f' : '#191f28',
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
