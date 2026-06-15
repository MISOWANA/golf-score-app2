import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Plus, X } from 'lucide-react';
import styles from '../../styles/styles';
import { searchCourses } from '../../data/courseDatabase';

export default function SetupView({ onStart, onBack }) {
  const [courseName, setCourseName] = useState('');
  const [outCourseName, setOutCourseName] = useState('');
  const [inCourseName, setInCourseName] = useState('');
  const [players, setPlayers] = useState(['']);
  const [pars, setPars] = useState(Array(18).fill(4));
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleCourseNameChange = (val) => {
    setCourseName(val);
    const results = searchCourses(val);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  const selectCourse = (course) => {
    setCourseName(course.name);
    setOutCourseName(course.outName);
    setInCourseName(course.inName);
    setPars([...course.pars]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

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

  const canStart = courseName.trim() && outCourseName.trim() && inCourseName.trim() && players.every(p => p.trim());

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>New Round</div>
        <div style={{ width: 40 }} />
      </header>

      {/* 골프장 검색 */}
      <div style={styles.formSection}>
        <label style={styles.formLabel}>골프장 이름</label>
        <div ref={searchRef} style={{ position: 'relative' }}>
          <input
            style={styles.formInput}
            placeholder="골프장 이름 검색..."
            value={courseName}
            onChange={(e) => handleCourseNameChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            maxLength={50}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#131d35', border: '1px solid #252f4a', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 500, overflow: 'hidden',
            }}>
              {suggestions.map((course, i) => (
                <button
                  key={i}
                  style={{
                    width: '100%', textAlign: 'left', padding: '11px 14px',
                    background: 'transparent', border: 'none',
                    borderBottom: i < suggestions.length - 1 ? '1px solid #1b2744' : 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                  onMouseDown={(e) => { e.preventDefault(); selectCourse(course); }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e8edf8' }}>{course.name}</div>
                    <div style={{ fontSize: 10, color: '#4d5a78', marginTop: 2 }}>
                      {course.outName} · {course.inName} &nbsp;|&nbsp; PAR {course.pars.reduce((a,b)=>a+b,0)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: '#3d4d65', background: '#0d1425', border: '1px solid #1b2744', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                    {course.location}
                  </span>
                </button>
              ))}
              <div style={{ padding: '7px 14px', fontSize: 9, color: '#3d4d65', borderTop: '1px solid #1b2744' }}>
                찾는 코스가 없으면 직접 입력 후 파 수정 가능
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 코스 이름 */}
      <div style={styles.formSection}>
        <label style={styles.formLabel}>코스 이름</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#8a9a8a', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '6px' }}>OUT (1~9홀)</div>
            <input
              style={{ ...styles.formInput, marginBottom: 0 }}
              placeholder="예: 파인"
              value={outCourseName}
              onChange={(e) => setOutCourseName(e.target.value)}
              maxLength={20}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#8a9a8a', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '6px' }}>IN (10~18홀)</div>
            <input
              style={{ ...styles.formInput, marginBottom: 0 }}
              placeholder="예: 레이크"
              value={inCourseName}
              onChange={(e) => setInCourseName(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>
      </div>

      {/* 플레이어 */}
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
              maxLength={20}
            />
            {players.length > 1 && (
              <button style={styles.removeButton} onClick={() => removePlayer(i)}>
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 파 설정 */}
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
                        style={{ ...styles.parTapZone, left: 0, opacity: canDecrease ? 1 : 0.3, cursor: canDecrease ? 'pointer' : 'not-allowed' }}
                        onClick={() => canDecrease && updatePar(holeIdx, p - 1)}
                        disabled={!canDecrease}
                        aria-label="파 감소"
                      />
                      <button
                        style={{ ...styles.parTapZone, right: 0, opacity: canIncrease ? 1 : 0.3, cursor: canIncrease ? 'pointer' : 'not-allowed' }}
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
        onClick={() => onStart(players.map(p => p.trim()), courseName.trim(), pars, outCourseName.trim(), inCourseName.trim())}
      >
        라운드 시작하기
      </button>
    </div>
  );
}
