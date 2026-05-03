import React, { useState } from 'react';
import { ChevronLeft, Plus, X } from 'lucide-react';
import styles from '../../styles/styles';

export default function SetupView({ onStart, onBack }) {
  const [courseName, setCourseName] = useState('');
  const [players, setPlayers] = useState(['']);
  const [pars, setPars] = useState(Array(18).fill(4));

  const addPlayer = () => {
    if (players.length < 4) setPlayers([...players, '']);
  };

  const removePlayer = (idx) => {
    if (players.length > 1) setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx, name) => {
    const updated = [...players];
    updated[idx] = name;
    setPlayers(updated);
  };

  const updatePar = (idx, val) => {
    const updated = [...pars];
    updated[idx] = val;
    setPars(updated);
  };

  const canStart = courseName.trim() && players.every(p => p.trim());

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>New Round</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.formSection}>
        <label style={styles.formLabel}>코스 이름</label>
        <input
          style={styles.formInput}
          placeholder="예: 레이크사이드 CC"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
        />
      </div>

      <div style={styles.formSection}>
        <div style={styles.formLabelRow}>
          <label style={styles.formLabel}>플레이어 ({players.length}/4)</label>
          {players.length < 4 && (
            <button style={styles.addButton} onClick={addPlayer}>
              <Plus size={14} /> 추가
            </button>
          )}
        </div>
        {players.map((name, i) => (
          <div key={i} style={styles.playerRow}>
            <div style={styles.playerBadge}>{i + 1}</div>
            <input
              style={{ ...styles.formInput, flex: 1, marginBottom: 0 }}
              placeholder={`플레이어 ${i + 1}`}
              value={name}
              onChange={(e) => updatePlayer(i, e.target.value)}
            />
            {players.length > 1 && (
              <button style={styles.removeButton} onClick={() => removePlayer(i)}>
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={styles.formSection}>
        <label style={styles.formLabel}>파 설정</label>

        <div style={styles.parSummary}>
          <div style={styles.parSummaryMain}>
            <div style={styles.parSummaryLabel}>TOTAL PAR</div>
            <div style={styles.parSummaryValue}>{pars.reduce((a, b) => a + b, 0)}</div>
          </div>
          <div style={styles.parSummaryDivider} />
          <div style={styles.parSummaryNines}>
            <div style={styles.parSummaryNineRow}>
              <span style={styles.parSummaryNineLabel}>FRONT</span>
              <span style={styles.parSummaryNineValue}>{pars.slice(0, 9).reduce((a, b) => a + b, 0)}</span>
            </div>
            <div style={styles.parSummaryNineRow}>
              <span style={styles.parSummaryNineLabel}>BACK</span>
              <span style={styles.parSummaryNineValue}>{pars.slice(9).reduce((a, b) => a + b, 0)}</span>
            </div>
          </div>
        </div>

        <div style={styles.parTableHint}>← 왼쪽 탭: -1 · 오른쪽 탭: +1 →</div>
        {[
          { label: 'OUT', start: 0, end: 9 },
          { label: 'IN', start: 9, end: 18 }
        ].map(({ label, start, end }) => (
          <div key={label} style={styles.parTable}>
            <div style={styles.parTableRow}>
              <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>
                {label}
              </div>
              <div style={styles.parTableCells}>
                {pars.slice(start, end).map((_, localIdx) => (
                  <div key={localIdx} style={styles.parTableHoleCell}>
                    {start + localIdx + 1}
                  </div>
                ))}
              </div>
              <div style={{ ...styles.parTableTotal, ...styles.parTableTotalHeader }}>
                TOT
              </div>
            </div>
            <div style={{ ...styles.parTableRow, borderBottom: 'none' }}>
              <div style={styles.parTableLabel}>PAR</div>
              <div style={styles.parTableCells}>
                {pars.slice(start, end).map((p, localIdx) => {
                  const holeIdx = start + localIdx;
                  const canDecrease = p > 3;
                  const canIncrease = p < 6;
                  return (
                    <div key={holeIdx} style={styles.parTableParCell}>
                      <div style={{
                        ...styles.parTableParValue,
                        background: p === 3 ? 'rgba(61,184,122,0.15)' : p === 4 ? '#0e1c14' : p === 5 ? '#c9a228' : '#ef5350',
                        color: p === 3 ? '#3db87a' : p === 4 ? '#e8edf8' : '#0b0e18',
                      }}>
                        {p}
                      </div>
                      <button
                        style={{
                          ...styles.parTapZone,
                          left: 0,
                          opacity: canDecrease ? 1 : 0.3,
                          cursor: canDecrease ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() => canDecrease && updatePar(holeIdx, p - 1)}
                        disabled={!canDecrease}
                        aria-label="파 감소"
                      />
                      <button
                        style={{
                          ...styles.parTapZone,
                          right: 0,
                          opacity: canIncrease ? 1 : 0.3,
                          cursor: canIncrease ? 'pointer' : 'not-allowed',
                        }}
                        onClick={() => canIncrease && updatePar(holeIdx, p + 1)}
                        disabled={!canIncrease}
                        aria-label="파 증가"
                      />
                    </div>
                  );
                })}
              </div>
              <div style={styles.parTableTotal}>
                {pars.slice(start, end).reduce((a, b) => a + b, 0)}
              </div>
            </div>
          </div>
        ))}

        <div style={styles.parLegend}>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: 'rgba(61,184,122,0.15)', color: '#3db87a', border: '1px solid #3db87a' }}>3</span>
            <span>파 3</span>
          </div>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#0e1c14', color: '#e8edf8', border: '1px solid #1a3028' }}>4</span>
            <span>파 4</span>
          </div>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#c9a228', color: '#0b0e18' }}>5</span>
            <span>파 5</span>
          </div>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#ef5350', color: '#fff' }}>6</span>
            <span>파 6</span>
          </div>
        </div>
      </div>

      <button
        style={{ ...styles.primaryButton, opacity: canStart ? 1 : 0.4, cursor: canStart ? 'pointer' : 'not-allowed' }}
        disabled={!canStart}
        onClick={() => onStart(players.map(p => p.trim()), courseName.trim(), pars)}
      >
        라운드 시작하기
      </button>
    </div>
  );
}
