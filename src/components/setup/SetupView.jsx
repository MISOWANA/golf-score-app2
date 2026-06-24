import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Plus, X } from 'lucide-react';
import styles from '../../styles/styles';
import { searchCourses } from '../../data/courseDatabase';

export default function SetupView({ onStart, onBack, currentUser }) {
  const [courseName, setCourseName] = useState('');
  const [outCourseName, setOutCourseName] = useState('');
  const [inCourseName, setInCourseName] = useState('');
  const [players, setPlayers] = useState([currentUser?.userName || '']);
  const [pars, setPars] = useState(Array(18).fill(4));
  const [teeBox, setTeeBox] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 다중코스 선택 상태
  const [selectedClub, setSelectedClub] = useState(null); // 클럽 전체 데이터
  const [selectedOut, setSelectedOut] = useState(null);   // 선택된 OUT 9홀 코스
  const [selectedIn, setSelectedIn] = useState(null);     // 선택된 IN 9홀 코스
  const [selectedPairIdx, setSelectedPairIdx] = useState(null);
  const [pairReversed, setPairReversed] = useState(false);

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

  // OUT/IN 코스 선택될 때마다 파 자동 계산
  useEffect(() => {
    if (selectedOut) setOutCourseName(selectedOut.name);
    if (selectedIn)  setInCourseName(selectedIn.name);
    if (selectedOut && selectedIn) {
      setPars([...selectedOut.pars, ...selectedIn.pars]);
    }
  }, [selectedOut, selectedIn]);

  const handleCourseNameChange = (val) => {
    setCourseName(val);
    setSelectedClub(null);
    setSelectedOut(null);
    setSelectedIn(null);
    setSelectedPairIdx(null);
    setPairReversed(false);
    const results = searchCourses(val);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  const selectClub = (club) => {
    setCourseName(club.name);
    setSelectedClub(club);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedPairIdx(null);
    setPairReversed(false);

    if (club.pairs) {
      setSelectedOut(null);
      setSelectedIn(null);
      setOutCourseName('');
      setInCourseName('');
    } else if (club.courses.length === 2) {
      setSelectedOut(club.courses[0]);
      setSelectedIn(club.courses[1]);
    } else {
      setSelectedOut(null);
      setSelectedIn(null);
      setOutCourseName('');
      setInCourseName('');
    }
  };

  const selectPair = (pairIdx, reversed) => {
    const pair = selectedClub.pairs[pairIdx];
    const courseA = selectedClub.courses.find(c => c.name === pair[0]);
    const courseB = selectedClub.courses.find(c => c.name === pair[1]);
    const rev = reversed ?? false;
    setSelectedPairIdx(pairIdx);
    setPairReversed(rev);
    setSelectedOut(rev ? courseB : courseA);
    setSelectedIn(rev ? courseA : courseB);
  };

  const getPairLabel = (pair) => {
    const a = pair[0].replace(/OUT$|IN$/, '');
    const b = pair[1].replace(/OUT$|IN$/, '');
    return a === b ? a : `${pair[0]}/${pair[1]}`;
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

  const needsPairSelect = !!(selectedClub?.pairs);
  const needsCourseSelect = selectedClub && !selectedClub.pairs && selectedClub.courses.length > 2;
  const canStart = courseName.trim() && outCourseName.trim() && inCourseName.trim() && players.every(p => p.trim()) && teeBox;

  const chipStyle = (active) => ({
    flex: 1, padding: '10px 6px', borderRadius: 8, textAlign: 'center',
    border: `1.5px solid ${active ? '#c9a228' : '#252f4a'}`,
    background: active ? 'rgba(201,162,40,0.18)' : '#1a2235',
    color: active ? '#c9a228' : '#8896b0',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  });

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
              {suggestions.map((club, i) => {
                const subLabel = club.pairs
                  ? club.pairs.map(p => p.join('/')).join(' · ')
                  : club.courses.length === 2
                    ? `${club.courses[0].pars.reduce((a,b)=>a+b,0)+club.courses[1].pars.reduce((a,b)=>a+b,0)} PAR | ${club.courses.map(c=>c.name).join(' · ')}`
                    : `${club.courses.length}개 코스`;
                return (
                  <button
                    key={i}
                    style={{
                      width: '100%', textAlign: 'left', padding: '11px 14px',
                      background: 'transparent', border: 'none',
                      borderBottom: i < suggestions.length - 1 ? '1px solid #1b2744' : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseDown={(e) => { e.preventDefault(); selectClub(club); }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8edf8' }}>{club.name}</div>
                      <div style={{ fontSize: 10, color: '#4d5a78', marginTop: 2 }}>{subLabel}</div>
                    </div>
                    <span style={{ fontSize: 10, color: '#3d4d65', background: '#0d1425', border: '1px solid #1b2744', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                      {club.location}
                    </span>
                  </button>
                );
              })}
              <div style={{ padding: '7px 14px', fontSize: 9, color: '#3d4d65', borderTop: '1px solid #1b2744' }}>
                찾는 코스가 없으면 직접 입력 후 파 수정 가능
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 고정 페어 선택 UI (군산CC 등) */}
      {needsPairSelect && (
        <div style={{ margin: '0 0 16px', padding: '14px 16px', background: '#0d1425', borderRadius: 12, border: '1px solid #1b2744' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4d5a78', letterSpacing: '0.15em', marginBottom: 12 }}>
            코스 조합 선택
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: selectedPairIdx !== null ? 12 : 0 }}>
            {selectedClub.pairs.map((pair, idx) => (
              <button key={idx}
                style={{ ...chipStyle(selectedPairIdx === idx), width: 'calc(50% - 3px)', flex: 'none' }}
                onClick={() => selectPair(idx, selectedPairIdx === idx ? pairReversed : false)}>
                {getPairLabel(pair)}
              </button>
            ))}
          </div>
          {selectedPairIdx !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#3db87a', fontWeight: 600 }}>
                OUT: {selectedOut?.name} → IN: {selectedIn?.name}
              </span>
              <button
                style={{ fontSize: 10, color: '#c9a228', background: 'none', border: '1px solid #c9a228', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => selectPair(selectedPairIdx, !pairReversed)}>
                ⇄ 순서 변경
              </button>
            </div>
          )}
        </div>
      )}

      {/* 다중 코스 선택 UI */}
      {needsCourseSelect && (
        <div style={{ margin: '0 0 16px', padding: '14px 16px', background: '#0d1425', borderRadius: 12, border: '1px solid #1b2744' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#4d5a78', letterSpacing: '0.15em', marginBottom: 12 }}>
            코스 조합 선택
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#3d4d65', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>OUT (1~9홀)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {selectedClub.courses.map((c, idx) => (
                <button key={c.name} style={chipStyle(selectedOut?.name === c.name)}
                  onClick={() => {
                    setSelectedOut(c);
                    const nextIdx = (idx + 1) % selectedClub.courses.length;
                    setSelectedIn(selectedClub.courses[nextIdx]);
                  }}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, color: '#3d4d65', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>IN (10~18홀)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {selectedClub.courses.map((c) => (
                <button key={c.name} style={chipStyle(selectedIn?.name === c.name)}
                  onClick={() => setSelectedIn(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {selectedOut && selectedIn && (
            <div style={{ marginTop: 10, fontSize: 10, color: '#3db87a', fontWeight: 600 }}>
              ✓ {selectedOut.name}(OUT) + {selectedIn.name}(IN) · PAR {[...selectedOut.pars, ...selectedIn.pars].reduce((a,b)=>a+b,0)}
            </div>
          )}
        </div>
      )}

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

      {/* TEE BOX */}
      <div style={styles.formSection}>
        <label style={styles.formLabel}>TEE BOX</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: '레드티',    color: '#ef5350', bg: 'rgba(239,83,80,0.15)',   border: '#ef5350'  },
            { id: '옐로우티',  color: '#f5c842', bg: 'rgba(245,200,66,0.15)',  border: '#f5c842'  },
            { id: '화이트티',  color: '#e8edf8', bg: 'rgba(232,237,248,0.12)', border: '#8896b0'  },
            { id: '블루티',    color: '#42a5f5', bg: 'rgba(66,165,245,0.15)',  border: '#42a5f5'  },
            { id: '블랙티',    color: '#111418', activeText: '#e8edf8', bg: 'rgba(17,20,24,0.6)',    border: '#e8edf8', dotBorder: '1.5px solid #e8edf8' },
          ].map(({ id, color, activeText, bg, border, dotBorder }) => {
            const active = teeBox === id;
            return (
              <button key={id}
                style={{
                  flex: 1, padding: '10px 4px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                  border: `1.5px solid ${active ? border : '#252f4a'}`,
                  background: active ? bg : '#1a2235',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                }}
                onClick={() => setTeeBox(active ? null : id)}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: active ? `0 0 6px ${border}` : 'none', border: dotBorder || 'none' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? (activeText || color) : '#4d5a78', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {id.replace('티', '')}
                </span>
              </button>
            );
          })}
        </div>
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
              <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>{label}</div>
              <div style={styles.parTableCells}>
                {pars.slice(start, end).map((_, localIdx) => (
                  <div key={localIdx} style={styles.parTableHoleCell}>{start + localIdx + 1}</div>
                ))}
              </div>
              <div style={{ ...styles.parTableTotal, ...styles.parTableTotalHeader }}>TOT</div>
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
                      }}>{p}</div>
                      <button style={{ ...styles.parTapZone, left: 0, opacity: canDecrease ? 1 : 0.3, cursor: canDecrease ? 'pointer' : 'not-allowed' }}
                        onClick={() => canDecrease && updatePar(holeIdx, p - 1)} disabled={!canDecrease} aria-label="파 감소" />
                      <button style={{ ...styles.parTapZone, right: 0, opacity: canIncrease ? 1 : 0.3, cursor: canIncrease ? 'pointer' : 'not-allowed' }}
                        onClick={() => canIncrease && updatePar(holeIdx, p + 1)} disabled={!canIncrease} aria-label="파 증가" />
                    </div>
                  );
                })}
              </div>
              <div style={styles.parTableTotal}>{pars.slice(start, end).reduce((a, b) => a + b, 0)}</div>
            </div>
          </div>
        ))}

        <div style={styles.parLegend}>
          <div style={styles.parLegendItem}><span style={{ ...styles.parLegendDot, background: 'rgba(61,184,122,0.15)', color: '#3db87a', border: '1px solid #3db87a' }}>3</span><span>파 3</span></div>
          <div style={styles.parLegendItem}><span style={{ ...styles.parLegendDot, background: '#0e1c14', color: '#e8edf8', border: '1px solid #1a3028' }}>4</span><span>파 4</span></div>
          <div style={styles.parLegendItem}><span style={{ ...styles.parLegendDot, background: '#c9a228', color: '#0b0e18' }}>5</span><span>파 5</span></div>
          <div style={styles.parLegendItem}><span style={{ ...styles.parLegendDot, background: '#ef5350', color: '#fff' }}>6</span><span>파 6</span></div>
        </div>
      </div>

      <button
        style={{ ...styles.primaryButton, opacity: canStart ? 1 : 0.4, cursor: canStart ? 'pointer' : 'not-allowed' }}
        disabled={!canStart}
        onClick={() => onStart(players.map(p => p.trim()), courseName.trim(), pars, outCourseName.trim(), inCourseName.trim(), teeBox)}
      >
        라운드 시작하기
      </button>
    </div>
  );
}
