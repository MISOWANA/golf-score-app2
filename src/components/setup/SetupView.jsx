import GoalLine from '../goals/GoalLine';
import CourseHistoryCard from './CourseHistoryCard';
import { buildCourseHistory } from '../../engine/courseHistory.js';
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Plus, X, Briefcase } from 'lucide-react';
import styles from '../../styles/styles';
import { searchCourses } from '../../data/courseDatabase';
import { bagCoverage } from '../../engine/clubRecommend.js';
import { setupBlockers } from '../../engine/roundSetup.js';
import { localNoonISO } from '../../engine/roundDate.js';
import { useBagClubs } from '../scoring/useBagClubs';
import GreenSpeedPicker from '../common/GreenSpeedPicker';
import BagSetupWizard from '../mybag/BagSetupWizard';

// 거리별 클럽 추천을 받을지 마지막으로 고른 값 — 매 라운드마다 다시 끄지 않아도 되게 기기에 기억한다.
// 기본은 켜짐. 저장소를 못 쓰는 환경이어도 이번 라운드 선택에는 영향이 없다.
const CLUB_RECOMMEND_KEY = 'bb.clubRecommend';
const readClubRecommendPref = () => {
  try { return localStorage.getItem(CLUB_RECOMMEND_KEY) !== '0'; } catch { return true; }
};
const writeClubRecommendPref = (on) => {
  try { localStorage.setItem(CLUB_RECOMMEND_KEY, on ? '1' : '0'); } catch { /* 기억만 못 할 뿐 */ }
};

// 로컬 타임존 기준 YYYY-MM-DD (input type="date"가 요구하는 형식). toISOString()은
// UTC 기준이라 자정 근처에서 하루 밀리는 문제가 있어 로컬 필드로 직접 조립한다.
function todayLocalDateStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

//   rounds  지금까지의 모든 라운드 — 고른 코스의 과거 기록("이 코스 기록")에 쓴다
export default function SetupView({ onStart, onBack, currentUser, goals = [], rounds = [] }) {
  const [courseName, setCourseName] = useState('');
  const [roundDate, setRoundDate] = useState(todayLocalDateStr);
  const [outCourseName, setOutCourseName] = useState('');
  const [inCourseName, setInCourseName] = useState('');
  const [players, setPlayers] = useState([currentUser?.userName || '']);
  const [pars, setPars] = useState(Array(18).fill(4));
  // 라운드 홀 수: null = 18홀 · 'out' = 9홀(OUT 코스의 파) · 'in' = 9홀(IN 코스의 파). 9홀은 홀 번호가 항상 1~9 다
  const [nine, setNine] = useState(null);
  const [teeBox, setTeeBox] = useState(null);
  const [clubRecommend, setClubRecommend] = useState(readClubRecommendPref);
  // 그날의 그린 스피드(스팀프 피트) — 선택 입력. 날마다 다르니 지난 값을 기억하지 않는다.
  const [greenSpeed, setGreenSpeed] = useState(null);
  const savedBagClubs = useBagClubs(currentUser);
  // 이 화면에서 마이백을 방금 등록했으면 그 클럽을 바로 쓴다 (설정 화면은 그대로 두고 등록 화면만 위에 겹쳐 연다)
  const [registeredBag, setRegisteredBag] = useState(null);
  const [showBagWizard, setShowBagWizard] = useState(false);
  const bagClubs = registeredBag ?? savedBagClubs;
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 다중코스 선택 상태
  const [selectedClub, setSelectedClub] = useState(null); // 클럽 전체 데이터
  const [selectedOut, setSelectedOut] = useState(null);   // 선택된 OUT 9홀 코스
  const [selectedIn, setSelectedIn] = useState(null);     // 선택된 IN 9홀 코스
  const [selectedPairIdx, setSelectedPairIdx] = useState(null);
  const [pairReversed, setPairReversed] = useState(false);

  const searchRef = useRef(null);
  // swapOutIn에서 OUT/IN을 바꿀 때는 파를 직접 스왑하므로, 아래 파 자동계산이
  // 원본 DB 파 값으로 다시 덮어써서 그 결과(혹은 사용자가 수동 수정한 파)를 지우지 않도록 스킵 신호로 쓴다.
  const [skipParsSync, setSkipParsSync] = useState(false);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // OUT/IN 코스 선택될 때마다 코스 이름과 파를 자동으로 맞춘다 — 선택이 바뀐 그 렌더에서 바로.
  const [syncedCourses, setSyncedCourses] = useState({ out: null, inn: null });
  if (syncedCourses.out !== selectedOut || syncedCourses.inn !== selectedIn) {
    setSyncedCourses({ out: selectedOut, inn: selectedIn });
    if (selectedOut) setOutCourseName(selectedOut.name);
    if (selectedIn)  setInCourseName(selectedIn.name);
    if (selectedOut && selectedIn) {
      if (skipParsSync) {
        setSkipParsSync(false);
      } else {
        setPars([...selectedOut.pars, ...selectedIn.pars]);
      }
    }
  }

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

  const swapOutIn = () => {
    setOutCourseName(inCourseName);
    setInCourseName(outCourseName);
    if (selectedOut && selectedIn) setSkipParsSync(true);
    setSelectedOut(selectedIn);
    setSelectedIn(selectedOut);
    setPars(prev => [...prev.slice(9), ...prev.slice(0, 9)]);
    if (selectedPairIdx !== null) setPairReversed(r => !r);
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
  // 스코어를 플레이어 이름으로 구분해 저장하므로, 같은 이름이 둘이면 서로 덮어쓴다.
  const normPlayer = (n) => n.trim().toLowerCase();
  const dupPlayer = players.findIndex((p, i) => p.trim() && players.findIndex(q => normPlayer(q) === normPlayer(p)) !== i);
  const hasDupPlayer = dupPlayer >= 0;
  // 시작이 막힌 이유 — 버튼이 흐려지기만 하고 이유를 모르던 문제. OUT·IN 코스 이름은 필수가 아니다
  // (비우면 'OUT'·'IN' 으로 저장된다).
  const blockers = setupBlockers({ courseName, players, teeBox });
  // 이 코스를 전에 쳤다면 그 기록 (같은 코스·같은 9홀의 홀만 비교한다)
  const courseHistory = useMemo(
    () => buildCourseHistory(rounds, { courseName, outName: outCourseName, inName: inCourseName, nine, userName: currentUser?.userName }),
    [rounds, courseName, outCourseName, inCourseName, nine, currentUser?.userName],
  );
  const canStart = blockers.length === 0;

  const toggleClubRecommend = () => {
    const next = !clubRecommend;
    setClubRecommend(next);
    writeClubRecommendPref(next);
  };

  // 켜 둔 상태에서 마이백 상황을 미리 알려 준다 — 라운드 중에 "왜 추천이 안 나오지?" 하지 않도록.
  const coverage = Array.isArray(bagClubs) ? bagCoverage(bagClubs) : null;
  const bagNote = (() => {
    if (bagClubs === undefined) return null;   // 불러오는 중
    if (bagClubs === null) return null;   // 마이백이 비어 있으면 안내 글 대신 아래 '마이백 등록' 카드를 보여 준다
    if (coverage.usable === 0) return { warn: true, text: '마이백에 추천에 쓸 수 있는 클럽이 없어요. 클럽 이름과 캐리·토탈 거리를 확인해 주세요' };
    return {
      warn: false,
      text: `마이백 ${coverage.usable}개 클럽 거리 기준으로 추천해요`
        + (coverage.skipped.length > 0 ? ` · 제외: ${coverage.skipped.join(', ')} (스코어 입력에서 고를 수 없거나 거리가 비어 있어요)` : ''),
    };
  })();

  const chipStyle = (active) => ({
    flex: 1, padding: '10px 6px', borderRadius: 12, textAlign: 'center',
    border: `1.5px solid ${active ? '#c9a228' : '#252f4a'}`,
    background: active ? 'rgba(201,162,40,0.18)' : '#1a2235',
    color: active ? '#c9a228' : '#8896b0',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
  });

  // 지금 치는 9홀 묶음 — 18홀이면 둘 다, 9홀이면 고른 쪽만 (파 표·코스 이름·합계에 쓴다)
  const NINE_DEFS = [
    { key: 'out', label: 'OUT', range: '1~9홀', start: 0, end: 9, nameValue: outCourseName, setName: setOutCourseName, placeholder: '예: 파인' },
    { key: 'in', label: 'IN', range: '10~18홀', start: 9, end: 18, nameValue: inCourseName, setName: setInCourseName, placeholder: '예: 레이크' },
  ];
  const shownNines = nine ? NINE_DEFS.filter((n) => n.key === nine) : NINE_DEFS;
  const playedPars = nine ? pars.slice(shownNines[0].start, shownNines[0].end) : pars;
  const holeModes = [
    { value: null, title: '18홀', sub: '전체' },
    { value: 'out', title: '전반 9홀', sub: 'OUT 코스' },
    { value: 'in', title: '후반 9홀', sub: 'IN 코스' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>New Round</div>
        <div style={{ width: 44 }} />
      </header>

      {/* 라운드 홀 수 — 18홀 · 9홀(OUT 코스) · 9홀(IN 코스). 9홀은 어느 쪽이든 1~9번 홀로 친다 */}
      <div style={styles.formSection} data-role="hole-mode">
        <label style={styles.formLabel}>라운드</label>
        <div role="radiogroup" aria-label="라운드 홀 수" style={{ display: 'flex', gap: 8 }}>
          {holeModes.map((m) => (
            <button
              key={String(m.value)} type="button" role="radio" aria-checked={nine === m.value}
              style={{ ...chipStyle(nine === m.value), padding: '10px 4px' }}
              onClick={() => setNine(m.value)}
            >
              <div style={{ fontSize: 15, fontWeight: 800 }}>{m.title}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 골프장 검색 */}
      <div style={styles.formSection}>
        <div style={styles.formLabelRow}>
          <label style={styles.formLabel}>골프장 이름</label>
          <input
            type="date"
            value={roundDate}
            max={todayLocalDateStr()}
            onChange={(e) => { if (e.target.value) setRoundDate(e.target.value); }}
            style={{
              width: '136px', background: '#1a2235', border: '1px solid #252f4a', borderRadius: '12px',
              color: '#e8edf8', fontSize: '13px', fontWeight: '700', padding: '6px 6px',
              colorScheme: 'dark',
            }}
          />
        </div>
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
              background: '#131d35', border: '1.5px solid #3a4e72', borderRadius: 12,
              boxShadow: '0 14px 36px rgba(0,0,0,0.75)', zIndex: 500, overflowY: 'auto', maxHeight: 320,
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
                      width: '100%', textAlign: 'left', padding: '11px 14px', minHeight: 52,
                      background: 'transparent', border: 'none',
                      borderBottom: i < suggestions.length - 1 ? '1px solid #1b2744' : 'none',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    onMouseDown={(e) => { e.preventDefault(); selectClub(club); }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#e8edf8' }}>{club.name}</div>
                      <div style={{ fontSize: 13, color: '#a9b8d6', marginTop: 2 }}>{subLabel}</div>
                    </div>
                    <span style={{ fontSize: 12, color: '#8896b0', background: '#0d1425', border: '1px solid #1b2744', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
                      {club.location}
                    </span>
                  </button>
                );
              })}
              <div style={{ padding: '9px 14px', fontSize: 13, color: '#a9b8d6', borderTop: '1px solid #1b2744' }}>
                찾는 코스가 없으면 직접 입력 후 파 수정 가능
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 고정 페어 선택 UI (군산CC 등) */}
      {needsPairSelect && (
        <div style={{ margin: '0 0 16px', padding: '14px 16px', background: '#0d1425', borderRadius: 16, border: '1px solid #1b2744' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896b0', letterSpacing: '0.15em', marginBottom: 12 }}>
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
              <span style={{ fontSize: 13, color: '#3db87a', fontWeight: 600 }}>
                OUT: {selectedOut?.name} → IN: {selectedIn?.name}
              </span>
              <button
                style={{ fontSize: 12, color: '#c9a228', background: 'none', border: '1px solid #c9a228', borderRadius: 8, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => selectPair(selectedPairIdx, !pairReversed)}>
                ⇄ 순서 변경
              </button>
            </div>
          )}
        </div>
      )}

      {/* 다중 코스 선택 UI */}
      {needsCourseSelect && (
        <div style={{ margin: '0 0 16px', padding: '14px 16px', background: '#0d1425', borderRadius: 16, border: '1px solid #1b2744' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8896b0', letterSpacing: '0.15em', marginBottom: 12 }}>
            코스 조합 선택
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#8896b0', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{nine ? 'OUT 코스' : 'OUT (1~9홀)'}</div>
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
            <div style={{ fontSize: 12, color: '#8896b0', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}>{nine ? 'IN 코스' : 'IN (10~18홀)'}</div>
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
            <div style={{ marginTop: 10, fontSize: 12, color: '#3db87a', fontWeight: 600 }}>
              ✓ {selectedOut.name}(OUT) + {selectedIn.name}(IN) · PAR {[...selectedOut.pars, ...selectedIn.pars].reduce((a,b)=>a+b,0)}
            </div>
          )}
        </div>
      )}

      {/* 코스 이름 — 9홀이면 치는 9홀의 이름만 */}
      <div style={styles.formSection}>
        <div style={styles.formLabelRow}>
          <label style={styles.formLabel}>코스 이름</label>
          {!nine && (
            <button
              style={{ fontSize: 12, color: '#c9a228', background: 'none', border: '1px solid #c9a228', borderRadius: 8, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={swapOutIn}
              title="OUT/IN 순서 바꾸기"
            >
              ⇄ OUT/IN 순서 변경
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {shownNines.map((n) => (
            <div key={n.key} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#8a9a8a', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '6px' }}>{nine ? `${n.label} 코스` : `${n.label} (${n.range})`}</div>
              <input
                style={{ ...styles.formInput, marginBottom: 0 }}
                placeholder={n.placeholder}
                value={n.nameValue}
                onChange={(e) => n.setName(e.target.value)}
                maxLength={20}
              />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#8aa0c4', marginTop: 8, lineHeight: 1.6 }}>이름을 비워 두면 OUT · IN 으로 저장돼요</div>
      </div>

      {/* 같은 코스를 전에 쳤다면 그 기록 — 코스 이름이 정해진 뒤, 파를 맞추기 전에 */}
      <CourseHistoryCard history={courseHistory} />

      {/* 파 설정 */}
      <div style={styles.formSection}>
        <label style={styles.formLabel}>파 설정</label>

        <div style={styles.parSummary}>
          <div style={styles.parSummaryMain}>
            <div style={styles.parSummaryLabel}>TOTAL PAR</div>
            <div style={styles.parSummaryValue}>{playedPars.reduce((a, b) => a + b, 0)}</div>
          </div>
          {!nine && (<>
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
          </>)}
        </div>

        <div style={styles.parTableHint}>← 왼쪽 탭: -1 · 오른쪽 탭: +1 →</div>
        {shownNines.map(({ label, start, end }) => (
          <div key={label} style={styles.parTable}>
            <div style={styles.parTableRow}>
              <div style={{ ...styles.parTableLabel, ...styles.parTableLabelHeader }}>{label}</div>
              <div style={styles.parTableCells}>
                {pars.slice(start, end).map((_, localIdx) => (
                  <div key={localIdx} style={styles.parTableHoleCell}>{nine ? localIdx + 1 : start + localIdx + 1}</div>
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
                  const canIncrease = p < 7; // 정읍 등 실제 코스 DB에 파7 홀이 존재
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
              style={{
                ...styles.formInput, flex: 1, marginBottom: 0,
                ...(name.trim() && players.findIndex(q => normPlayer(q) === normPlayer(name)) !== i ? { borderColor: '#ef5350' } : {}),
              }}
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
        {hasDupPlayer && (
          <div style={{ fontSize: 14, color: '#ef5350', marginTop: 6, lineHeight: 1.6 }}>
            같은 이름의 플레이어가 있어요. 이름을 다르게 입력해 주세요 (예: 철수A, 철수B).
          </div>
        )}
        {players.length > 1 && (
          <div style={{ fontSize: 14, color: '#8896b0', marginTop: 6, lineHeight: 1.6 }}>
            2명 이상은 스코어 위주의 간편 기록이에요. 샷 상세 입력과 스탯·인사이트 집계는 1인 라운드만 지원해요.
          </div>
        )}
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
                  flex: 1, padding: '10px 4px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                  border: `1.5px solid ${active ? border : '#252f4a'}`,
                  background: active ? bg : '#1a2235',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                }}
                onClick={() => setTeeBox(active ? null : id)}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: active ? `0 0 6px ${border}` : 'none', border: dotBorder || 'none' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? (activeText || color) : '#8896b0', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {id.replace('티', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 그린 스피드 — 퍼팅 분석(인사이트·리포트)에서 그날의 그린 상태로 쓴다. 1인 라운드만 분석한다 */}
      {players.length === 1 && (
        <div style={styles.formSection} data-role="setup-green-speed">
          <div style={styles.formLabelRow}>
            <label style={styles.formLabel}>그린 스피드 (선택)</label>
          </div>
          <GreenSpeedPicker value={greenSpeed} onChange={setGreenSpeed} />
          <div style={{ fontSize: 13, color: '#8aa0c4', marginTop: 8, lineHeight: 1.6, wordBreak: 'keep-all' }}>
            코스 안내나 캐디가 알려 주는 그날의 값을 넣어 두면 퍼팅 분석에서 빠른 날·느린 날을 나눠 봐요. 라운드 중에도 바꿀 수 있어요.
          </div>
        </div>
      )}

      {/* 거리별 클럽 추천 — 샷 상세 입력은 1인 라운드에서만 하므로 그때만 묻는다 */}
      {players.length === 1 && (
        <div style={styles.formSection}>
          <label style={styles.formLabel}>거리별 클럽 추천</label>
          <button
            type="button"
            role="switch"
            aria-checked={clubRecommend}
            onClick={toggleClubRecommend}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '12px 14px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
              border: `1.5px solid ${clubRecommend ? '#3db87a' : '#252f4a'}`,
              background: clubRecommend ? 'rgba(61,184,122,0.08)' : '#1a2235',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: clubRecommend ? '#e8edf8' : '#8896b0' }}>클럽 추천 받기</div>
              <div style={{ fontSize: 13, color: '#8896b0', marginTop: 3, lineHeight: 1.5, wordBreak: 'keep-all' }}>
                남은 거리를 입력하면 마이백 거리로 알맞은 클럽을 추천해요
              </div>
            </div>
            <span aria-hidden="true" style={{ position: 'relative', flexShrink: 0, width: 44, height: 26, borderRadius: 13, background: clubRecommend ? '#3db87a' : '#252f4a', transition: 'background 0.15s' }}>
              <span style={{ position: 'absolute', top: 3, left: clubRecommend ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#e8edf8', transition: 'left 0.15s' }} />
            </span>
          </button>
          {clubRecommend && bagNote && (
            <div data-role="club-recommend-note" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6, wordBreak: 'keep-all', color: bagNote.warn ? '#e6b94a' : '#8896b0' }}>
              {bagNote.text}
            </div>
          )}
          {/* 마이백에 등록한 클럽이 없으면 — 코스에서는 번거로우니 라운드 전에 등록하게 이끈다 */}
          {clubRecommend && bagClubs === null && (
            <div role="region" aria-label="마이백 등록 안내" data-role="bag-register-card"
              style={{ marginTop: 10, padding: '12px 12px 6px', borderRadius: 16, background: 'rgba(201,162,40,0.07)', border: '1px solid rgba(201,162,40,0.4)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(201,162,40,0.16)', color: '#f3d36b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Briefcase size={18} strokeWidth={1.9} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#f3d36b', lineHeight: 1.4 }}>마이백에 등록한 클럽이 없어요</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#c4cfe0', marginTop: 2, wordBreak: 'keep-all' }}>
                    라운드 전에 한 번 등록해 두면 코스에서 남은 거리에 맞는 클럽을 바로 추천받아요.
                  </div>
                </div>
              </div>
              <button type="button" data-role="bag-register-open" onClick={() => setShowBagWizard(true)}
                style={{ width: '100%', height: 46, marginTop: 10, borderRadius: 12, border: 'none', background: 'linear-gradient(180deg, #f3d36b 0%, #c9a228 100%)', color: '#0b0e18', fontSize: 15, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                마이백 등록하기<span style={{ fontSize: 13, fontWeight: 700, opacity: 0.75 }}>· 약 1분</span>
              </button>
              {/* 이번 라운드만 추천을 끈다 — 스위치의 '마지막 선택 기억'은 건드리지 않아서 다음 라운드에 다시 안내한다 */}
              <button type="button" data-role="bag-register-later" onClick={() => setClubRecommend(false)}
                style={{ width: '100%', height: 40, border: 'none', background: 'none', color: '#8896b0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                나중에 할게요 (추천 없이 시작)
              </button>
            </div>
          )}
        </div>
      )}

      <GoalLine goals={goals} margin="4px 2px 12px" />

      {/* 시작 버튼은 아래 탭 바 바로 위에 고정한다 — 긴 설정 화면을 끝까지 내리지 않아도 누를 수 있고, 못 누르는 이유도 같이 보인다 */}
      <div aria-hidden="true" style={{ height: 84 }} />
      <div data-role="start-bar" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 520, boxSizing: 'border-box', bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))', zIndex: 40, padding: '22px 16px 10px', background: 'linear-gradient(180deg, rgba(11,14,24,0) 0, rgba(11,14,24,0.98) 18px)' }}>
      {!canStart && (
        <div data-role="start-blockers" role="status" style={{ fontSize: 14, color: '#e6c35a', lineHeight: 1.55, marginBottom: 8, textAlign: 'center' }}>
          {blockers.map((b) => <div key={b}>{b}</div>)}
        </div>
      )}
      <button
        data-role="start-round"
        style={{ ...styles.primaryButton, marginTop: 0, ...(canStart ? {} : { background: '#5d5128', color: '#d8cfa0', boxShadow: 'none', cursor: 'not-allowed' }), cursor: canStart ? 'pointer' : 'not-allowed' }}
        disabled={!canStart}
        onClick={() => onStart(players.map(p => p.trim()), courseName.trim(), pars, outCourseName.trim(), inCourseName.trim(), teeBox, localNoonISO(roundDate) ?? new Date().toISOString(), clubRecommend, players.length === 1 ? greenSpeed : null, nine)}
      >
        라운드 시작하기
      </button>
      </div>

      {/* 마이백 등록 — 설정 화면(입력 중인 코스·선수)을 그대로 두고 그 위에 겹쳐 연다. 끝나면 바로 추천 안내가 바뀐다 */}
      {showBagWizard && (
        <div data-role="bag-wizard-overlay" role="dialog" aria-modal="true" aria-label="마이백 등록"
          style={{ position: 'fixed', inset: 0, zIndex: 200, overflowY: 'auto', background: '#0b0e18' }}>
          <div style={styles.container}>
            <BagSetupWizard
              currentUser={currentUser}
              onBack={() => setShowBagWizard(false)}
              onDone={(bag) => { setRegisteredBag(bag); setShowBagWizard(false); }}
              bottomOffset={0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
