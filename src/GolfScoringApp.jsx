import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, Target, Flag, Circle, Home, BookOpen, BarChart3, Award, X, Check, Zap, Briefcase, Edit2, Edit3, AlertTriangle, LogOut, Download, Upload } from 'lucide-react';
import { initDB, loadRoundsByUser, saveRound, deleteRound, getCurrentUser, setCurrentUser, loadClubsByUser, saveClubsForUser, exportUserData, importUserData } from './db.js';

export default function GolfScoringApp() {
  const [view, setView] = useState('login'); // login, home, setup, scoring, analysis, history, roundDetail
  const [currentUser, setCurrentUserState] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [loading, setLoading] = useState(true);

  // DB 초기화 및 사용자 정보 로드
  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        const user = await getCurrentUser();
        if (user) {
          setCurrentUserState(user);
          await loadUserRounds(user.userId);
          setView('home');
        } else {
          setView('login');
        }
      } catch (e) {
        console.error('Init failed', e);
        setView('login');
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const loadUserRounds = async (userId) => {
    try {
      const userRounds = await loadRoundsByUser(userId);
      setRounds(userRounds);
    } catch (e) {
      console.error('Load rounds failed', e);
    }
  };

  const handleUserLogin = async (userName) => {
    try {
      const userId = `user_${Date.now()}`;
      const newUser = { userId, userName };
      await setCurrentUser(userId, userName);
      setCurrentUserState(newUser);
      await loadUserRounds(userId);
      setView('home');
    } catch (e) {
      console.error('Login failed', e);
    }
  };

  const handleSwitchUser = () => {
    setCurrentUserState(null);
    setRounds([]);
    setCurrentRound(null);
    setSelectedRoundId(null);
    setView('login');
  };

  const saveRounds = async (updatedRounds) => {
    try {
      for (const round of updatedRounds) {
        await saveRound(round, currentUser.userId);
      }
      setRounds(updatedRounds);
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const startNewRound = (players, courseName, pars) => {
    const newRound = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      courseName,
      players,
      pars,
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: pars[i],
        scores: players.reduce((acc, p) => {
          // 기본값: 파 타수, 퍼팅 2개, GIR 성공 (= 파 온 그린)
          // 파3은 퍼팅 2개면 원온, 파4/5는 퍼팅 2개면 레귤레이션 온
          acc[p] = {
            strokes: pars[i],     // 기본값: 파
            putts: 2,              // 기본값: 2퍼팅 (가장 일반적)
            fairway: pars[i] > 3 ? true : null,  // 파4/5는 페어웨이 적중 가정
            fairwayHit: null,      // L / C / R 또는 null
            shotShape: null,       // hook / draw / straight / fade / slice
            ob: 0,                 // OB 횟수 (기본 0)
            hazard: 0,             // 해저드/페널티 영역 횟수 (기본 0)
            gir: true,             // 파 달성 시 자동으로 GIR 성공
            girAuto: true,
            memo: '',              // 홀별 메모
            touched: false         // 사용자가 실제로 조작했는지 추적
          };
          return acc;
        }, {})
      })),
      currentHole: 0,
      completed: false
    };
    setCurrentRound(newRound);
    setView('scoring');
  };

  const updateRound = (updated) => {
    setCurrentRound(updated);
  };

  const finishRound = async () => {
    const finished = { ...currentRound, completed: true, finishedAt: new Date().toISOString() };
    await saveRound(finished, currentUser.userId);
    const updated = [finished, ...rounds];
    setRounds(updated);
    setCurrentRound(null);
    setSelectedRoundId(finished.id);
    setView('analysis');
  };

  const handleDeleteRound = async (id) => {
    await deleteRound(id);
    const updated = rounds.filter(r => r.id !== id);
    setRounds(updated);
  };

  const handleExportData = async () => {
    try {
      const exportedData = await exportUserData(currentUser.userId);
      const jsonStr = JSON.stringify(exportedData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `golf-data-${currentUser.userName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      alert('데이터 내보내기 실패: ' + e.message);
    }
  };

  const handleImportData = async (file) => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // 유효성 검사
      if (!importedData.data || !Array.isArray(importedData.data.rounds)) {
        throw new Error('유효하지 않은 파일 형식입니다');
      }

      await importUserData(currentUser.userId, importedData, false);
      await loadUserRounds(currentUser.userId);
      alert('데이터를 성공적으로 복원했습니다!');
    } catch (e) {
      console.error('Import failed', e);
      alert('데이터 가져오기 실패: ' + e.message);
    }
  };

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {view === 'login' && (
        <LoginView
          onLogin={handleUserLogin}
          loading={loading}
        />
      )}

      {view === 'home' && currentUser && (
        <HomeView
          rounds={rounds}
          currentUser={currentUser}
          onNewRound={() => setView('setup')}
          onViewHistory={() => setView('history')}
          onViewStats={() => setView('stats')}
          onSwitchUser={handleSwitchUser}
          onExportData={handleExportData}
          onImportData={handleImportData}
          loading={loading}
        />
      )}

      {view === 'setup' && (
        <SetupView
          onStart={startNewRound}
          onBack={() => setView('home')}
        />
      )}

      {view === 'scoring' && currentRound && (
        <ScoringView
          round={currentRound}
          onUpdate={updateRound}
          onFinish={finishRound}
          onExit={() => {
            setCurrentRound(null);
            setView('home');
          }}
        />
      )}

      {view === 'analysis' && (
        <AnalysisView
          round={rounds.find(r => r.id === selectedRoundId)}
          onBack={() => setView('home')}
          onGoHome={() => setView('home')}
          onGoHistory={() => setView('history')}
          onNewRound={() => setView('setup')}
        />
      )}

      {view === 'history' && (
        <HistoryView
          rounds={rounds}
          onBack={() => setView('home')}
          onSelect={(id) => { setSelectedRoundId(id); setView('analysis'); }}
          onDelete={handleDeleteRound}
        />
      )}

      {view === 'stats' && (
        <StatsView
          rounds={rounds}
          onBack={() => setView('home')}
        />
      )}

      {view === 'insights' && (
        <InsightsView
          rounds={rounds}
          onBack={() => setView('home')}
        />
      )}

      {view === 'mybag' && currentUser && (
        <MyBagView
          currentUser={currentUser}
          onBack={() => setView('home')}
        />
      )}

      {/* 하단 탭바 - 항상 표시 */}
      <BottomTabBar
        current={view}
        onChange={(tab) => setView(tab)}
      />
    </div>
  );
}

// ============== BOTTOM TAB BAR ==============
function BottomTabBar({ current, onChange }) {
  const tabs = [
    { id: 'history', label: '히스토리', icon: BookOpen },
    { id: 'stats', label: '스탯', icon: BarChart3 },
    { id: 'home', label: '홈', icon: Home },
    { id: 'insights', label: '인사이트', icon: Zap },
    { id: 'mybag', label: 'MY BAG', icon: Briefcase },
  ];

  return (
    <div style={styles.tabBar}>
      <div style={styles.tabBarInner}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = current === id;
          const isHome = id === 'home';
          return (
            <button
              key={id}
              style={{
                ...styles.tabBarBtn,
                ...(isHome ? styles.tabBarBtnHome : {}),
                color: isActive ? '#1f3d2e' : '#8b8574',
              }}
              onClick={() => onChange(id)}
              title={label}
            >
              <Icon size={isHome ? 24 : 20} strokeWidth={isActive ? 2.5 : 1.8} />
              {!isHome && (
                <span style={{
                  ...styles.tabBarLabel,
                  fontWeight: isActive ? '700' : '500',
                }}>
                  {label}
                </span>
              )}
              {isActive && <div style={styles.tabBarActiveIndicator} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============== LOGIN VIEW ==============
function LoginView({ onLogin, loading }) {
  const [userName, setUserName] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      onLogin(userName.trim());
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>⛳</div>
        <h1 style={styles.loginTitle}>Every Score</h1>
        <p style={styles.loginSubtitle}>골프 스코어 기록 앱</p>

        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <div style={styles.formSection}>
            <label style={styles.formLabel}>이름</label>
            <input
              style={{
                ...styles.formInput,
                borderColor: inputFocused ? '#1f3d2e' : '#e0dbd3',
              }}
              placeholder="플레이어 이름을 입력하세요"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={loading}
            />
          </div>

          <button
            style={{
              ...styles.primaryButton,
              opacity: userName.trim() && !loading ? 1 : 0.4,
              cursor: userName.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
            disabled={!userName.trim() || loading}
            type="submit"
          >
            {loading ? '로딩 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============== HOME VIEW ==============
function HomeView({ rounds, currentUser, onNewRound, onViewHistory, onViewStats, onSwitchUser, onExportData, onImportData, loading }) {
  const recentRound = rounds[0];
  const totalRounds = rounds.length;

  const avgScore = rounds.length > 0
    ? (rounds.reduce((sum, r) => {
        const total = r.holes.reduce((s, h) => {
          const firstPlayer = Object.keys(h.scores)[0];
          return s + (h.scores[firstPlayer]?.strokes || 0);
        }, 0);
        return sum + total;
      }, 0) / rounds.length).toFixed(1)
    : '—';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logo}>
            <div style={styles.logoMark}>⛳</div>
            <div>
              <div style={styles.brandName}>Every</div>
              <div style={styles.brandTagline}>Score</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button 
              style={styles.actionButton} 
              onClick={onExportData} 
              title="데이터 백업 (내보내기)"
            >
              <Download size={18} />
            </button>
            <label style={styles.actionButton} title="데이터 복원 (가져오기)">
              <Upload size={18} />
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    onImportData(e.target.files[0]);
                  }
                }}
              />
            </label>
            <span style={styles.userName}>{currentUser.userName}</span>
            <button style={styles.logoutButton} onClick={onSwitchUser} title="다른 사용자로 로그인">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div style={styles.dateLine}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
      </header>

      <div style={styles.heroCard}>
        <div style={styles.heroLabel}>TODAY</div>
        <h1 style={styles.heroTitle}>새 라운드<br/>시작하기</h1>
        <button style={styles.heroButton} onClick={onNewRound}>
          <Plus size={18} strokeWidth={2.5} />
          <span>Start Round</span>
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>누적 라운드</div>
          <div style={styles.statValue}>{loading ? '—' : totalRounds}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>평균 스코어</div>
          <div style={styles.statValue}>{loading ? '—' : avgScore}</div>
        </div>
      </div>

      {recentRound && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>최근 라운드</div>
            <button style={styles.textLink} onClick={onViewHistory}>전체보기</button>
          </div>
          <RoundRow round={recentRound} onClick={() => { onViewHistory(); }} />
        </div>
      )}
    </div>
  );
}

function RoundRow({ round, onClick }) {
  const firstPlayer = round.players[0];
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = round.pars.reduce((a, b) => a + b, 0);
  const diff = total - totalPar;

  return (
    <button style={styles.roundRow} onClick={onClick}>
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
        <div style={{ ...styles.roundDiff, color: diff > 0 ? '#c04a3e' : diff < 0 ? '#1f5e3a' : '#6b6558' }}>
          {diff > 0 ? `+${diff}` : diff === 0 ? 'E' : diff}
        </div>
      </div>
    </button>
  );
}

// ============== SETUP VIEW ==============
function SetupView({ onStart, onBack }) {
  const [courseName, setCourseName] = useState('');
  const [players, setPlayers] = useState(['']);
  // 모든 홀 기준 타수 4로 시작 (사용자가 코스에 맞게 조정)
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

        {/* 스코어카드 테이블 형식 파 선택기 */}
        <div style={styles.parTableHint}>← 왼쪽 탭: -1 · 오른쪽 탭: +1 →</div>
        {[
          { label: 'OUT', start: 0, end: 9 },
          { label: 'IN', start: 9, end: 18 }
        ].map(({ label, start, end }) => (
          <div key={label} style={styles.parTable}>
            {/* Hole 행 */}
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
            {/* PAR 행 (좌측 -1 / 우측 +1) */}
            <div style={{ ...styles.parTableRow, borderBottom: 'none' }}>
              <div style={styles.parTableLabel}>PAR</div>
              <div style={styles.parTableCells}>
                {pars.slice(start, end).map((p, localIdx) => {
                  const holeIdx = start + localIdx;
                  const canDecrease = p > 3;
                  const canIncrease = p < 6;
                  return (
                    <div key={holeIdx} style={styles.parTableParCell}>
                      {/* 시각적 원형 표시 */}
                      <div style={{
                        ...styles.parTableParValue,
                        background: p === 3 ? '#e8f0e3' : p === 4 ? '#1f3d2e' : p === 5 ? '#d9a441' : '#c04a3e',
                        color: p === 3 ? '#1f3d2e' : '#fff',
                      }}>
                        {p}
                      </div>
                      {/* 좌측 터치 영역 (-1) */}
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
                      {/* 우측 터치 영역 (+1) */}
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

        {/* 범례 */}
        <div style={styles.parLegend}>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#e8f0e3', color: '#1f3d2e', border: '1px solid #1f3d2e' }}>3</span>
            <span>파 3</span>
          </div>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#1f3d2e', color: '#fff' }}>4</span>
            <span>파 4</span>
          </div>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#d9a441', color: '#fff' }}>5</span>
            <span>파 5</span>
          </div>
          <div style={styles.parLegendItem}>
            <span style={{ ...styles.parLegendDot, background: '#c04a3e', color: '#fff' }}>6</span>
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

// ============== SHOT SHAPE ICON ==============
// 5구질의 비행 궤적을 SVG로 표현 (사용자 제공 이미지 참고)
function ShotShapeIcon({ shapeId, active, color }) {
  const stroke = active ? '#fff' : color;

  // 각 구질별 path 정의
  // viewBox: 32 x 40
  const paths = {
    // 훅: 직진 올라가다 위쪽에서 좌로 꺾임 (└ 모양 회전)
    hook: 'M 18 36 L 18 14 Q 18 10 14 10 L 8 10',
    // 드로우: 우측 하단에서 좌상단으로 비스듬히 올라가는 부드러운 곡선
    draw: 'M 22 34 Q 16 24 10 16 L 6 12',
    // 스트레이트: 직진
    straight: 'M 16 36 L 16 6',
    // 페이드: 드로우의 좌우 반전 - 좌측 하단에서 우상단으로 비스듬히
    fade: 'M 10 34 Q 16 24 22 16 L 26 12',
    // 슬라이스: 직진 올라가다 위쪽에서 우로 꺾임 (┘ 모양 회전)
    slice: 'M 14 36 L 14 14 Q 14 10 18 10 L 24 10',
  };

  // 화살표 머리 좌표 (path 끝 방향에 맞춰 수동 정의)
  const arrowHeads = {
    hook:     { x: 8,  y: 10, dir: 'left' },   // ←
    draw:     { x: 6,  y: 12, dir: 'upLeft' }, // ↖
    straight: { x: 16, y: 6,  dir: 'up' },     // ↑
    fade:     { x: 26, y: 12, dir: 'upRight' },// ↗
    slice:    { x: 24, y: 10, dir: 'right' },  // →
  };

  const path = paths[shapeId] || paths.straight;
  const head = arrowHeads[shapeId] || arrowHeads.straight;

  // 방향별 화살표 머리 polygon
  const getArrowPolygon = (h) => {
    const s = 4; // 화살표 크기
    switch (h.dir) {
      case 'up':
        return `${h.x},${h.y - s} ${h.x - s + 1},${h.y + 1} ${h.x + s - 1},${h.y + 1}`;
      case 'left':
        return `${h.x - s},${h.y} ${h.x + 1},${h.y - s + 1} ${h.x + 1},${h.y + s - 1}`;
      case 'right':
        return `${h.x + s},${h.y} ${h.x - 1},${h.y - s + 1} ${h.x - 1},${h.y + s - 1}`;
      case 'upLeft':
        // 좌상단 방향 (45도)
        return `${h.x - 3},${h.y - 3} ${h.x + 2},${h.y - 1} ${h.x - 1},${h.y + 2}`;
      case 'upRight':
        // 우상단 방향 (45도)
        return `${h.x + 3},${h.y - 3} ${h.x - 2},${h.y - 1} ${h.x + 1},${h.y + 2}`;
      default:
        return `${h.x},${h.y - s} ${h.x - s + 1},${h.y + 1} ${h.x + s - 1},${h.y + 1}`;
    }
  };

  return (
    <svg width="32" height="44" viewBox="0 0 32 44" style={{ marginBottom: '2px' }}>
      {/* 비행 궤적 */}
      <path
        d={path}
        stroke={stroke}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 화살표 머리 */}
      <polygon
        points={getArrowPolygon(head)}
        fill={stroke}
      />
    </svg>
  );
}

// ============== SCORING PAGE (스코어링 페이지) ==============
// 라운드 진행 중 홀별 스코어, 스탯, 메모를 입력하는 화면
function ScoringView({ round, onUpdate, onFinish, onExit }) {
  const [holeIdx, setHoleIdx] = useState(round.currentHole || 0);
  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');

  const hole = round.holes[holeIdx];
  const playerScore = hole.scores[activePlayer];

  // 진행 중인지 체크 (어떤 홀이라도 touched면 진행 중)
  const hasProgress = round.holes.some(h =>
    round.players.some(p => h.scores[p]?.touched === true)
  );

  const handleExitClick = () => {
    if (hasProgress) {
      setShowExitConfirm(true);
    } else {
      // 아무것도 입력 안 한 상태면 바로 나가기
      onExit();
    }
  };

  // GIR 자동 계산: par - 2 타 안에 그린 도달 = strokes - putts <= par - 2
  const calculateGir = (strokes, putts, par) => {
    if (strokes === null || strokes === undefined) return null;
    if (putts === null || putts === undefined) return null;
    const shotsToGreen = strokes - putts;
    return shotsToGreen <= par - 2;
  };

  // 스트로크가 변경됐을 때 퍼팅/페어웨이/GIR을 합리적으로 자동 추정
  const inferStatsFromStrokes = (strokes, par) => {
    const diff = strokes - par;
    let putts, fairway, gir;

    // 특수 케이스 1: 홀인원 (스트로크 1)
    // 티샷이 바로 홀로 → 퍼팅 0
    if (strokes === 1) {
      putts = 0;
      fairway = par > 3 ? true : null;
      gir = true;
      return { putts, fairway, gir };
    }

    // 특수 케이스 2: 알바트로스 (파5에서 2타, 또는 par-2 타로 홀아웃)
    // 스트로크가 par-2와 같다는 건 그린 도달 타수 = 홀인 타수 → 퍼팅 0
    // 예: 파5에서 2타(알바트로스), 파4에서 2타(이글)
    // 파3에서 1타는 위 홀인원 케이스에서 처리됨
    if (strokes === par - 2) {
      putts = 0;
      fairway = par > 3 ? true : null;
      gir = true;
      return { putts, fairway, gir };
    }

    // 일반 케이스
    if (diff <= -2) {
      // 파5에서 이글(3타) 같은 케이스: 투온 후 원퍼팅이 자연스러움
      // 더블 이글 이하 (diff <= -3) 도 일반적으로 1퍼팅으로 마무리
      putts = 1;
      fairway = par > 3 ? true : null;
      gir = true;
    } else if (diff === -1) {
      // 버디: 레귤레이션 온 + 1퍼팅
      putts = 1;
      fairway = par > 3 ? true : null;
      gir = true;
    } else if (diff === 0) {
      // 파: 레귤레이션 온 + 2퍼팅
      putts = 2;
      fairway = par > 3 ? true : null;
      gir = true;
    } else if (diff === 1) {
      // 보기: 그린 1타 놓침 + 2퍼팅
      putts = 2;
      fairway = par > 3 ? true : null;
      gir = false;
    } else if (diff === 2) {
      // 더블 보기: 2타 실수 + 2퍼팅
      putts = 2;
      fairway = par > 3 ? false : null;
      gir = false;
    } else {
      // 트리플 이상: 2퍼팅 + 페어웨이/GIR 모두 미스
      putts = 2;
      fairway = par > 3 ? false : null;
      gir = false;
    }

    // 안전장치: 퍼팅은 스트로크 수를 초과할 수 없음 (최소 1타는 그린 외 시작)
    if (putts >= strokes) {
      putts = Math.max(0, strokes - 1);
    }

    return { putts, fairway, gir };
  };

  const updateScore = (field, value) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    let newPlayerScore = { ...playerScore, [field]: value, touched: true };

    // strokes가 바뀌면 다른 스탯들도 합리적으로 자동 추정
    // 단, 사용자가 아직 해당 필드를 직접 수정하지 않은 경우에만
    if (field === 'strokes') {
      const inferred = inferStatsFromStrokes(value, hole.par);
      // 퍼팅, 페어웨이, GIR이 아직 자동 상태거나 touched가 아니면 재추정
      newPlayerScore.putts = inferred.putts;
      if (hole.par > 3) newPlayerScore.fairway = inferred.fairway;
      newPlayerScore.gir = inferred.gir;
      newPlayerScore.girAuto = true;
    }

    // 퍼팅이 바뀌면 GIR 재계산
    if (field === 'putts') {
      const autoGir = calculateGir(newPlayerScore.strokes, value, hole.par);
      if (autoGir !== null) {
        newPlayerScore.gir = autoGir;
        newPlayerScore.girAuto = true;
      }
    }

    // GIR 직접 수정 시 자동 플래그 해제
    if (field === 'gir') {
      newPlayerScore.girAuto = false;
    }

    updated.holes[holeIdx] = {
      ...hole,
      scores: {
        ...hole.scores,
        [activePlayer]: newPlayerScore
      }
    };
    onUpdate(updated);
  };

  // 여러 필드를 한 번에 업데이트 (stale closure 방지)
  const updateScoreFields = (fields) => {
    const updated = { ...round };
    updated.holes = [...round.holes];
    let newPlayerScore = { ...playerScore, ...fields, touched: true };

    updated.holes[holeIdx] = {
      ...hole,
      scores: {
        ...hole.scores,
        [activePlayer]: newPlayerScore
      }
    };
    onUpdate(updated);
  };

  const goToHole = (idx) => {
    if (idx >= 0 && idx < 18) {
      // 현재 홀을 touched로 마크 (기본값 그대로 사용한 경우에도 "확인됨"으로 처리)
      const updated = { ...round };
      updated.holes = [...round.holes];
      const currentHoleData = updated.holes[holeIdx];
      const updatedScores = {};
      round.players.forEach(p => {
        updatedScores[p] = { ...currentHoleData.scores[p], touched: true };
      });
      updated.holes[holeIdx] = { ...currentHoleData, scores: updatedScores };
      updated.currentHole = idx;

      setHoleIdx(idx);
      onUpdate(updated);
    }
  };

  const getScoreName = (strokes, par) => {
    if (!strokes) return null;
    // 홀인원은 파와 무관하게 최우선
    if (strokes === 1) return { name: '🏆 HOLE IN ONE', color: '#c88a2e', isHoleInOne: true };
    const diff = strokes - par;
    if (diff <= -3) return { name: 'Albatross', color: '#7c3aed' };
    if (diff === -2) return { name: 'Eagle', color: '#d97706' };
    if (diff === -1) return { name: 'Birdie', color: '#1f5e3a' };
    if (diff === 0) return { name: 'Par', color: '#4a4a4a' };
    if (diff === 1) return { name: 'Bogey', color: '#8b6f47' };
    if (diff === 2) return { name: 'Double', color: '#c04a3e' };
    return { name: `+${diff}`, color: '#8b2e22' };
  };

  const scoreName = getScoreName(playerScore.strokes, hole.par);
  const isLastHole = holeIdx === 17;
  const allComplete = round.holes.every(h =>
    round.players.every(p => h.scores[p].touched === true)
  );

  return (
    <div style={styles.container}>
      <header style={styles.scoringHeader}>
        <button style={styles.iconBack} onClick={handleExitClick}>
          <X size={22} />
        </button>
        <div style={styles.scoringCourse}>{round.courseName}</div>
        <div style={{ width: 40 }} />
      </header>

      {/* Progress indicator */}
      {(() => {
        const completedCount = round.holes.filter(h =>
          round.players.every(p => h.scores[p].touched === true)
        ).length;
        return (
          <div style={styles.progressBar}>
            <div style={styles.progressText}>
              <span style={styles.progressNumber}>{completedCount}</span>
              <span style={styles.progressTotal}> / 18 holes</span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${(completedCount / 18) * 100}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Running Score Summary */}
      {(() => {
        // 현재까지 touched된 홀만 합산 (실제 진행한 홀)
        const touchedHoles = round.holes.filter(h => h.scores[activePlayer]?.touched === true);
        const playedStrokes = touchedHoles.reduce((s, h) => s + (h.scores[activePlayer]?.strokes || 0), 0);
        const playedPar = touchedHoles.reduce((s, h) => s + h.par, 0);
        const playedPutts = touchedHoles.reduce((s, h) => s + (h.scores[activePlayer]?.putts || 0), 0);
        const playedDiff = playedStrokes - playedPar;
        const diffLabel = playedDiff === 0 ? 'E' : playedDiff > 0 ? `+${playedDiff}` : `${playedDiff}`;
        const diffColor = playedDiff > 0 ? '#f5b09c' : playedDiff < 0 ? '#a8d8b0' : '#d4ccbb';

        // front/back 파 대비 차이 계산
        const frontTouched = round.holes.slice(0, 9).filter(h => h.scores[activePlayer]?.touched === true);
        const backTouched = round.holes.slice(9).filter(h => h.scores[activePlayer]?.touched === true);
        const frontStrokes = frontTouched.reduce((s, h) => s + (h.scores[activePlayer]?.strokes || 0), 0);
        const frontPar = frontTouched.reduce((s, h) => s + h.par, 0);
        const backStrokes = backTouched.reduce((s, h) => s + (h.scores[activePlayer]?.strokes || 0), 0);
        const backPar = backTouched.reduce((s, h) => s + h.par, 0);
        const frontDiff = frontStrokes - frontPar;
        const backDiff = backStrokes - backPar;

        // 파 대비 차이를 라벨로 변환 (E / +1 / -2 등)
        const formatDiff = (diff, hasData) => {
          if (!hasData) return '—';
          if (diff === 0) return 'E';
          return diff > 0 ? `+${diff}` : `${diff}`;
        };
        const formatDiffColor = (diff, hasData) => {
          if (!hasData) return '#a8c2a5';
          if (diff > 0) return '#f5b09c';
          if (diff < 0) return '#a8d8b0';
          return '#f5f0e6';
        };

        return (
          <div style={styles.runningScore}>
            <div style={styles.runningScoreMain}>
              <div style={styles.runningScoreLabel}>
                {round.players.length > 1 ? activePlayer : 'SCORE'}
              </div>
              <div style={styles.runningScoreValues}>
                <span style={styles.runningScoreNumber}>{playedStrokes}</span>
                <span style={{ ...styles.runningScoreDiff, color: diffColor }}>
                  {diffLabel}
                </span>
              </div>
            </div>
            <div style={styles.runningScoreDivider} />
            <div style={styles.runningScoreStats}>
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>OUT</span>
                <span style={{
                  ...styles.runningScoreStatValue,
                  color: formatDiffColor(frontDiff, frontTouched.length > 0),
                }}>
                  {formatDiff(frontDiff, frontTouched.length > 0)}
                </span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>IN</span>
                <span style={{
                  ...styles.runningScoreStatValue,
                  color: formatDiffColor(backDiff, backTouched.length > 0),
                }}>
                  {formatDiff(backDiff, backTouched.length > 0)}
                </span>
              </div>
              <div style={styles.runningScoreStat}>
                <span style={styles.runningScoreStatLabel}>PUTTS</span>
                <span style={styles.runningScoreStatValue}>{playedPutts || '—'}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hole navigator - table style with OUT/IN */}
      <div style={styles.holeNavigator}>
        {[
          { label: 'OUT', holes: round.holes.slice(0, 9), offset: 0 },
          { label: 'IN', holes: round.holes.slice(9, 18), offset: 9 }
        ].map(({ label, holes, offset }) => (
          <div key={label} style={styles.holeNavTable}>
            {/* Row 1: Hole numbers */}
            <div style={styles.holeNavTableRow}>
              <div style={{ ...styles.holeNavRowLabel, ...styles.holeNavRowLabelHeader }}>
                {label}
              </div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h, localIdx) => {
                  const i = offset + localIdx;
                  const isCurrent = i === holeIdx;
                  return (
                    <button
                      key={i}
                      style={{
                        ...styles.holeNavHoleCell,
                        background: isCurrent ? '#1f3d2e' : 'transparent',
                        color: isCurrent ? '#f5f0e6' : '#3a3a3a',
                      }}
                      onClick={() => goToHole(i)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Par */}
            <div style={styles.holeNavTableRow}>
              <div style={styles.holeNavRowLabel}>PAR</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h, localIdx) => {
                  const i = offset + localIdx;
                  const isCurrent = i === holeIdx;
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.holeNavParCell,
                        background: isCurrent ? '#2d5643' : 'transparent',
                        color: isCurrent ? '#a8c2a5' : '#6b6558',
                      }}
                    >
                      {h.par}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Score */}
            <div style={{ ...styles.holeNavTableRow, borderBottom: 'none' }}>
              <div style={styles.holeNavRowLabel}>SCORE</div>
              <div style={styles.holeNavTableCells}>
                {holes.map((h, localIdx) => {
                  const i = offset + localIdx;
                  const done = round.players.every(p => h.scores[p].touched === true);
                  const isCurrent = i === holeIdx;

                  const pScore = h.scores[activePlayer];
                  const strokes = pScore.strokes;
                  const diff = strokes - h.par;

                  // 스코어 마커 스타일 결정
                  const isHoleInOne = done && strokes === 1;
                  let markerStyle = {};
                  if (done) {
                    if (isHoleInOne) {
                      // 홀인원: 최고 특별 UI
                      markerStyle = { ...styles.markerHoleInOne };
                    } else if (diff <= -2) {
                      // Eagle+: 두 겹 원
                      markerStyle = { ...styles.markerEagle };
                    } else if (diff === -1) {
                      // Birdie: 원
                      markerStyle = { ...styles.markerBirdie };
                    } else if (diff === 0) {
                      // Par: 기본
                      markerStyle = { ...styles.markerPar };
                    } else if (diff === 1) {
                      // Bogey: 사각형
                      markerStyle = { ...styles.markerBogey };
                    } else {
                      // Double+: 두 겹 사각형
                      markerStyle = { ...styles.markerDouble };
                    }
                  }

                  return (
                    <button
                      key={i}
                      style={{
                        ...styles.holeNavScoreCell,
                        background: isCurrent ? '#2d5643' : 'transparent',
                      }}
                      onClick={() => goToHole(i)}
                    >
                      <span style={{
                        ...styles.scoreMarker,
                        ...markerStyle,
                        color: isHoleInOne
                          ? '#fff'
                          : done
                          ? (diff <= -1 ? '#b8410a' : diff >= 1 ? '#1f3d2e' : '#3a3a3a')
                          : (isCurrent ? '#a8c2a5' : '#b8b0a0'),
                        fontWeight: done ? '700' : '500',
                      }}>
                        {isHoleInOne && <span style={styles.holeInOneStar}>★</span>}
                        {strokes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hole header */}
      <div style={styles.holeHeader}>
        <div>
          <div style={styles.holeLabel}>HOLE {holeIdx + 1}</div>
          <div style={styles.holePar}>PAR {hole.par}</div>
        </div>
        {scoreName && (
          <div style={{
            ...styles.scoreName,
            color: scoreName.isHoleInOne ? '#fff' : scoreName.color,
            borderColor: scoreName.color,
            background: scoreName.isHoleInOne ? 'linear-gradient(135deg, #d9a441 0%, #b8821f 100%)' : 'transparent',
            boxShadow: scoreName.isHoleInOne ? '0 2px 12px rgba(217, 164, 65, 0.4)' : 'none',
            fontWeight: scoreName.isHoleInOne ? '800' : '600',
            opacity: playerScore.touched ? 1 : 0.35,
            animation: scoreName.isHoleInOne && playerScore.touched ? 'holeInOnePulse 2s ease-in-out infinite' : 'none',
          }}>
            {scoreName.name}
          </div>
        )}
      </div>

      {/* Player tabs */}
      {round.players.length > 1 && (
        <div style={styles.playerTabs}>
          {round.players.map(p => {
            const pScore = hole.scores[p];
            const isTouched = pScore.touched;
            return (
              <button
                key={p}
                style={{
                  ...styles.playerTab,
                  background: activePlayer === p ? '#f5f0e6' : 'transparent',
                  color: activePlayer === p ? '#1f3d2e' : '#6b6558',
                  borderColor: activePlayer === p ? '#1f3d2e' : 'transparent'
                }}
                onClick={() => setActivePlayer(p)}
              >
                {p}
                <span style={{
                  ...styles.playerTabScore,
                  background: isTouched ? '#1f3d2e' : '#b8b0a0',
                  opacity: isTouched ? 1 : 0.7
                }}>
                  {pScore.strokes}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Score input - 좌/우 분할 탭 */}
      <div style={styles.scoringSection}>
        <div style={styles.fieldLabel}>스코어 (타수)</div>
        <div style={styles.bigScoreContainer}>
          {/* 좌/우 시각 영역 (배경 색상 구분) */}
          <div style={styles.bigScoreHalves}>
            <div style={styles.bigScoreLeftHalf} />
            <div style={styles.bigScoreRightHalf} />
          </div>
          {/* 좌측 화살표 - 절대 위치 */}
          <div style={{ ...styles.bigScoreSideAbs, left: '14px' }}>
            <ChevronLeft size={28} strokeWidth={2.5} />
            <span style={styles.bigScoreSideLabel}>−1</span>
          </div>
          {/* 가운데 큰 숫자 */}
          <div style={styles.bigScoreCenter}>
            <div style={styles.bigScoreValue}>
              {playerScore.strokes || hole.par}
            </div>
            <div style={styles.bigScoreHint}>
              {playerScore.strokes === hole.par && !playerScore.touched
                ? 'PAR · 좌우 탭으로 조정'
                : `vs Par ${hole.par}`}
            </div>
          </div>
          {/* 우측 화살표 - 절대 위치 */}
          <div style={{ ...styles.bigScoreSideAbs, right: '14px' }}>
            <span style={styles.bigScoreSideLabel}>+1</span>
            <ChevronRight size={28} strokeWidth={2.5} />
          </div>
          {/* 좌측 터치 영역 (-1) */}
          <button
            style={{ ...styles.bigScoreTapZone, left: 0 }}
            onClick={() => updateScore('strokes', Math.max(1, (playerScore.strokes || hole.par) - 1))}
            aria-label="스코어 감소"
          />
          {/* 우측 터치 영역 (+1) */}
          <button
            style={{ ...styles.bigScoreTapZone, right: 0 }}
            onClick={() => updateScore('strokes', (playerScore.strokes || hole.par) + 1)}
            aria-label="스코어 증가"
          />
        </div>
      </div>

      {/* Detailed stats */}
      <div style={styles.statsSection}>
        {/* 티샷 구질 - 파4/5에서만 표시 (5구질) */}
        {hole.par > 3 && (
          <div style={styles.statRow}>
            <div style={styles.statRowLabel}>
              <TrendingUp size={14} strokeWidth={2} />
              <span>티샷 구질</span>
            </div>
            <div style={styles.shotShapeRow}>
              {[
                { id: 'hook', label: '훅', desc: '강한 좌' },
                { id: 'fade', label: '페이드', desc: '약한 우' },
                { id: 'straight', label: '스트레이트', desc: '직진' },
                { id: 'draw', label: '드로우', desc: '약한 좌' },
                { id: 'slice', label: '슬라이스', desc: '강한 우' },
              ].map(s => {
                const active = playerScore.shotShape === s.id;
                // 색상: hook/draw=좌계열(보라/녹), straight=녹, fade/slice=우계열(주황/빨강)
                let color;
                if (s.id === 'straight') color = '#1f3d2e';
                else if (s.id === 'hook') color = '#7c3aed';
                else if (s.id === 'draw') color = '#1f5e3a';
                else if (s.id === 'fade') color = '#d9a441';
                else color = '#c04a3e';

                return (
                  <button
                    key={s.id}
                    style={{
                      ...styles.shotShapeBtn,
                      background: active ? color : 'transparent',
                      color: active ? '#fff' : color,
                      borderColor: active ? color : '#d4ccbb',
                      fontWeight: active ? '800' : '700',
                    }}
                    onClick={() => updateScore('shotShape', active ? null : s.id)}
                    title={s.desc}
                  >
                    <span style={styles.shotShapeLabel}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* FAIRWAY HIT (O / X) - 파4/5에서만 */}
        {hole.par > 3 && (
          <div style={styles.statRow}>
            <div style={styles.statRowLabel}>
              <Target size={14} strokeWidth={2} />
              <span>FAIRWAY HIT</span>
            </div>
            <div style={styles.fairwayHitRow}>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairway === true ? '#1f5e3a' : 'transparent',
                  color: playerScore.fairway === true ? '#fff' : '#1f5e3a',
                  borderColor: playerScore.fairway === true ? '#1f5e3a' : '#d4ccbb',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairway === true;
                  // 적중(O) 선택 시 LANDING POINT를 'C'로 자동, 해제 시 모두 클리어
                  updateScoreFields({
                    fairway: isToggleOff ? null : true,
                    fairwayHit: isToggleOff ? null : 'C',
                  });
                }}
              >
                O
              </button>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairway === false ? '#c04a3e' : 'transparent',
                  color: playerScore.fairway === false ? '#fff' : '#c04a3e',
                  borderColor: playerScore.fairway === false ? '#c04a3e' : '#d4ccbb',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairway === false;
                  // 미스(X) 선택 시 LANDING POINT는 유지하되 C였다면 클리어
                  updateScoreFields({
                    fairway: isToggleOff ? null : false,
                    fairwayHit: isToggleOff ? null : (playerScore.fairwayHit === 'C' ? null : playerScore.fairwayHit),
                  });
                }}
              >
                X
              </button>
            </div>
          </div>
        )}

        {/* LANDING POINT (L / C / R) - 파4/5에서만 */}
        {hole.par > 3 && (
          <div style={styles.statRow}>
            <div style={styles.statRowLabel}>
              <Flag size={14} strokeWidth={2} />
              <span>LANDING POINT</span>
            </div>
            <div style={styles.fairwayHitRow}>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairwayHit === 'L' ? '#8b6f47' : 'transparent',
                  color: playerScore.fairwayHit === 'L' ? '#fff' : '#8b6f47',
                  borderColor: playerScore.fairwayHit === 'L' ? '#8b6f47' : '#d4ccbb',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairwayHit === 'L';
                  updateScoreFields({
                    fairwayHit: isToggleOff ? null : 'L',
                  });
                }}
              >
                L
              </button>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairwayHit === 'C' ? '#1f5e3a' : 'transparent',
                  color: playerScore.fairwayHit === 'C' ? '#fff' : '#1f5e3a',
                  borderColor: playerScore.fairwayHit === 'C' ? '#1f5e3a' : '#d4ccbb',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairwayHit === 'C';
                  updateScoreFields({
                    fairwayHit: isToggleOff ? null : 'C',
                  });
                }}
              >
                C
              </button>
              <button
                style={{
                  ...styles.fairwayHitBtn,
                  background: playerScore.fairwayHit === 'R' ? '#8b6f47' : 'transparent',
                  color: playerScore.fairwayHit === 'R' ? '#fff' : '#8b6f47',
                  borderColor: playerScore.fairwayHit === 'R' ? '#8b6f47' : '#d4ccbb',
                }}
                onClick={() => {
                  const isToggleOff = playerScore.fairwayHit === 'R';
                  updateScoreFields({
                    fairwayHit: isToggleOff ? null : 'R',
                  });
                }}
              >
                R
              </button>
            </div>
          </div>
        )}

        <div style={styles.statRow}>
          <div style={styles.statRowLabel}>
            <Flag size={14} strokeWidth={2} />
            <span>GIR</span>
            {playerScore.girAuto && playerScore.gir !== null && (
              <span style={styles.autoBadge}>AUTO</span>
            )}
          </div>
          <div style={styles.toggleRow}>
            <button
              style={{ ...styles.toggleBtn, background: playerScore.gir === true ? '#1f5e3a' : 'transparent', color: playerScore.gir === true ? '#f5f0e6' : '#3a3a3a' }}
              onClick={() => updateScore('gir', true)}
            >
              <Check size={14} /> 온
            </button>
            <button
              style={{ ...styles.toggleBtn, background: playerScore.gir === false ? '#8b2e22' : 'transparent', color: playerScore.gir === false ? '#f5f0e6' : '#3a3a3a' }}
              onClick={() => updateScore('gir', false)}
            >
              <X size={14} /> 오프
            </button>
          </div>
        </div>

        {/* 페널티 (OB / 해저드) - 발생 시에만 카운트 증가 */}
        <div style={styles.statRow}>
          <div style={styles.statRowLabel}>
            <AlertTriangle size={14} strokeWidth={2} />
            <span>페널티</span>
          </div>
          <div style={styles.penaltyGroup}>
            {/* OB 카운터 */}
            <div style={styles.penaltyItem}>
              <div style={styles.penaltyLabel}>OB</div>
              <div style={{ ...styles.splitStepper, width: '100%' }}>
                <div style={styles.splitStepperHalves}>
                  <div style={styles.splitStepperLeftHalf} />
                  <div style={styles.splitStepperRightHalf} />
                </div>
                <div style={styles.splitStepperContent}>
                  <span style={{
                    ...styles.splitStepperValue,
                    color: (playerScore.ob || 0) > 0 ? '#c04a3e' : '#1f3d2e',
                  }}>
                    {playerScore.ob || 0}
                  </span>
                </div>
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    left: 0,
                    opacity: (playerScore.ob || 0) > 0 ? 1 : 0.4,
                    cursor: (playerScore.ob || 0) > 0 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.ob || 0;
                    if (curr > 0) updateScore('ob', curr - 1);
                  }}
                  disabled={(playerScore.ob || 0) <= 0}
                  aria-label="OB 감소"
                />
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    right: 0,
                    opacity: (playerScore.ob || 0) < 5 ? 1 : 0.4,
                    cursor: (playerScore.ob || 0) < 5 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.ob || 0;
                    if (curr < 5) updateScore('ob', curr + 1);
                  }}
                  disabled={(playerScore.ob || 0) >= 5}
                  aria-label="OB 증가"
                />
              </div>
            </div>

            {/* 페널티 합계 배지 */}
            {(playerScore.ob > 0 || playerScore.hazard > 0) && (
              <div style={styles.penaltyTotalBadge}>
                +{(playerScore.ob || 0) + (playerScore.hazard || 0)}
              </div>
            )}

            {/* 해저드 카운터 */}
            <div style={styles.penaltyItem}>
              <div style={styles.penaltyLabel}>해저드</div>
              <div style={{ ...styles.splitStepper, width: '100%' }}>
                <div style={styles.splitStepperHalves}>
                  <div style={styles.splitStepperLeftHalf} />
                  <div style={styles.splitStepperRightHalf} />
                </div>
                <div style={styles.splitStepperContent}>
                  <span style={{
                    ...styles.splitStepperValue,
                    color: (playerScore.hazard || 0) > 0 ? '#d9a441' : '#1f3d2e',
                  }}>
                    {playerScore.hazard || 0}
                  </span>
                </div>
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    left: 0,
                    opacity: (playerScore.hazard || 0) > 0 ? 1 : 0.4,
                    cursor: (playerScore.hazard || 0) > 0 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.hazard || 0;
                    if (curr > 0) updateScore('hazard', curr - 1);
                  }}
                  disabled={(playerScore.hazard || 0) <= 0}
                  aria-label="해저드 감소"
                />
                <button
                  style={{
                    ...styles.splitStepperTapZone,
                    right: 0,
                    opacity: (playerScore.hazard || 0) < 5 ? 1 : 0.4,
                    cursor: (playerScore.hazard || 0) < 5 ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => {
                    const curr = playerScore.hazard || 0;
                    if (curr < 5) updateScore('hazard', curr + 1);
                  }}
                  disabled={(playerScore.hazard || 0) >= 5}
                  aria-label="해저드 증가"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 퍼팅 (3/4) + 메모 (1/4) - 가장 마지막 행 */}
        <div style={styles.statRow}>
          <div style={styles.statRowLabel}>
            <Circle size={14} strokeWidth={2} />
            <span>퍼팅</span>
          </div>
          <div style={styles.puttMemoRow}>
            {/* 좌측 3/4 - 퍼팅 split stepper */}
            {(() => {
              // 퍼팅 상한: 홀인원(1타)은 0, 그 외는 strokes - 1 (최소 1타는 그린 외)
              const strokes = playerScore.strokes || hole.par;
              const maxPutts = strokes === 1 ? 0 : Math.max(0, strokes - 1);
              const currPutts = playerScore.putts ?? 2;
              const canDec = currPutts > 0;
              const canInc = currPutts < maxPutts;
              return (
                <div style={{ ...styles.splitStepper, flex: 3 }}>
                  <div style={styles.splitStepperHalves}>
                    <div style={styles.splitStepperLeftHalf} />
                    <div style={styles.splitStepperRightHalf} />
                  </div>
                  <div style={styles.splitStepperContent}>
                    <span style={styles.splitStepperValue}>{currPutts}</span>
                  </div>
                  <button
                    style={{
                      ...styles.splitStepperTapZone,
                      left: 0,
                      opacity: canDec ? 1 : 0.4,
                      cursor: canDec ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => { if (canDec) updateScore('putts', currPutts - 1); }}
                    disabled={!canDec}
                    aria-label="퍼팅 감소"
                  />
                  <button
                    style={{
                      ...styles.splitStepperTapZone,
                      right: 0,
                      opacity: canInc ? 1 : 0.4,
                      cursor: canInc ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => { if (canInc) updateScore('putts', currPutts + 1); }}
                    disabled={!canInc}
                    aria-label="퍼팅 증가"
                  />
                </div>
              );
            })()}

            {/* 우측 1/4 - 메모 버튼 */}
            <button
              style={{
                ...styles.memoButton,
                ...(playerScore.memo ? styles.memoButtonFilled : {}),
              }}
              onClick={() => {
                setMemoDraft(playerScore.memo || '');
                setShowMemoModal(true);
              }}
            >
              <Edit3 size={13} strokeWidth={2.2} />
              <span>메모</span>
              {playerScore.memo && <span style={styles.memoDot} />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.scoringNav}>
        <button
          style={{ ...styles.navBtn, opacity: holeIdx === 0 ? 0.3 : 1 }}
          onClick={() => goToHole(holeIdx - 1)}
          disabled={holeIdx === 0}
        >
          <ChevronLeft size={18} /> 이전
        </button>
        {isLastHole ? (
          <button
            style={styles.finishBtn}
            onClick={() => {
              // 마지막 홀도 touched 처리 후 종료
              const updated = { ...round };
              updated.holes = [...round.holes];
              const lastHole = updated.holes[holeIdx];
              const updatedScores = {};
              round.players.forEach(p => {
                updatedScores[p] = { ...lastHole.scores[p], touched: true };
              });
              updated.holes[holeIdx] = { ...lastHole, scores: updatedScores };
              onUpdate(updated);
              // 약간의 지연 후 finish (state 반영)
              setTimeout(() => onFinish(), 50);
            }}
          >
            라운드 종료
          </button>
        ) : (
          <button style={styles.navBtn} onClick={() => goToHole(holeIdx + 1)}>
            다음 <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Exit 확인 모달 */}
      {showExitConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowExitConfirm(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚠️</div>
            <div style={styles.modalTitle}>라운드를 종료할까요?</div>
            <div style={styles.modalText}>
              현재까지 입력한 스코어는<br/>저장되지 않습니다
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.modalBtnCancel}
                onClick={() => setShowExitConfirm(false)}
              >
                계속 하기
              </button>
              <button
                style={styles.modalBtnConfirm}
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 작성 모달 */}
      {showMemoModal && (
        <div style={styles.modalOverlay} onClick={() => setShowMemoModal(false)}>
          <div style={styles.memoModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.memoModalHeader}>
              <div style={styles.memoModalTitle}>
                HOLE {holeIdx + 1} 메모
              </div>
              <div style={styles.memoModalSub}>
                PAR {hole.par} · 이 홀에서 기억하고 싶은 내용을 적어보세요
              </div>
            </div>
            <textarea
              style={styles.memoTextarea}
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
              placeholder="예: 티샷이 좌측 러프로 빠짐. 7번 아이언 어프로치 그린 우측 벙커.&#10;퍼팅 라인 잘 봐서 1퍼팅 성공!"
              maxLength={500}
              autoFocus
              rows={8}
            />
            <div style={styles.memoCharCount}>
              {memoDraft.length} / 500
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.modalBtnCancel}
                onClick={() => {
                  setShowMemoModal(false);
                  setMemoDraft('');
                }}
              >
                취소
              </button>
              <button
                style={styles.memoSaveBtn}
                onClick={() => {
                  updateScore('memo', memoDraft.trim());
                  setShowMemoModal(false);
                  setMemoDraft('');
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== ANALYSIS VIEW ==============
function AnalysisView({ round, onBack, onGoHome, onGoHistory, onNewRound, justFinished }) {
  if (!round) return null;

  const calculateStats = (player) => {
    const holes = round.holes;
    const total = holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const totalPar = round.pars.reduce((a, b) => a + b, 0);
    const totalPutts = holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
    const girHoles = holes.filter(h => h.scores[player]?.gir === true).length;
    const par4or5 = holes.filter(h => h.par > 3);
    const fairwaysHit = par4or5.filter(h => h.scores[player]?.fairway === true).length;
    const fairwayTotal = par4or5.length;

    const birdies = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par === -1).length;
    const eagles = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par <= -2).length;
    const pars = holes.filter(h => h.scores[player]?.strokes === h.par).length;
    const bogeys = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par === 1).length;
    const doubles = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par >= 2).length;

    const front9 = holes.slice(0, 9).reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const back9 = holes.slice(9).reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);

    return {
      total, totalPar, diff: total - totalPar, totalPutts,
      girHoles, girPct: ((girHoles / 18) * 100).toFixed(0),
      fairwaysHit, fairwayTotal, fairwayPct: fairwayTotal > 0 ? ((fairwaysHit / fairwayTotal) * 100).toFixed(0) : 0,
      birdies, eagles, pars, bogeys, doubles,
      avgPutts: (totalPutts / 18).toFixed(1),
      front9, back9
    };
  };

  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const stats = calculateStats(activePlayer);

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Round Report</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.reportHero}>
        <div style={styles.reportDate}>
          {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h2 style={styles.reportCourse}>{round.courseName}</h2>

        {round.players.length > 1 && (
          <div style={styles.playerTabs}>
            {round.players.map(p => (
              <button
                key={p}
                style={{
                  ...styles.playerTab,
                  background: activePlayer === p ? '#f5f0e6' : 'transparent',
                  color: activePlayer === p ? '#1f3d2e' : '#6b6558',
                  borderColor: activePlayer === p ? '#1f3d2e' : 'transparent'
                }}
                onClick={() => setActivePlayer(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div style={styles.bigScoreDisplay}>
          <div style={styles.bigScoreNum}>{stats.total}</div>
          <div style={{ ...styles.bigScoreDiff, color: stats.diff > 0 ? '#c04a3e' : stats.diff < 0 ? '#1f5e3a' : '#4a4a4a' }}>
            {stats.diff > 0 ? `+${stats.diff}` : stats.diff === 0 ? 'Even' : stats.diff}
          </div>
          <div style={styles.bigScoreLabel}>vs par {stats.totalPar}</div>
        </div>

        <div style={styles.nineGrid}>
          <div style={styles.nineItem}>
            <div style={styles.nineLabel}>FRONT 9</div>
            <div style={styles.nineValue}>{stats.front9}</div>
          </div>
          <div style={styles.nineDivider} />
          <div style={styles.nineItem}>
            <div style={styles.nineLabel}>BACK 9</div>
            <div style={styles.nineValue}>{stats.back9}</div>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>KEY STATS</div>
        <div style={styles.keyStatsGrid}>
          <StatTile label="GIR" value={`${stats.girPct}%`} sub={`${stats.girHoles}/18 holes`} />
          <StatTile label="Fairways" value={`${stats.fairwayPct}%`} sub={`${stats.fairwaysHit}/${stats.fairwayTotal}`} />
          <StatTile label="Avg Putts" value={stats.avgPutts} sub={`${stats.totalPutts} total`} />
          <StatTile label="Birdies+" value={stats.birdies + stats.eagles} sub={`${stats.eagles} eagle`} />
        </div>
      </div>

      {/* Score Breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE BREAKDOWN</div>
        <div style={styles.breakdownList}>
          <BreakdownBar label="Eagle+" count={stats.eagles} total={18} color="#d97706" />
          <BreakdownBar label="Birdie" count={stats.birdies} total={18} color="#1f5e3a" />
          <BreakdownBar label="Par" count={stats.pars} total={18} color="#4a4a4a" />
          <BreakdownBar label="Bogey" count={stats.bogeys} total={18} color="#8b6f47" />
          <BreakdownBar label="Double+" count={stats.doubles} total={18} color="#c04a3e" />
        </div>
      </div>

      {/* Hole-by-hole */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>HOLE BY HOLE</div>
        <ScorecardTable round={round} player={activePlayer} />
      </div>

      {/* Insights */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>INSIGHTS</div>
        <Insights stats={stats} round={round} player={activePlayer} />
      </div>

      {/* Notes - 메모가 있는 홀들 모아서 표시 */}
      {(() => {
        const memoedHoles = round.holes.filter(h => h.scores[activePlayer]?.memo);
        if (memoedHoles.length === 0) return null;
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>NOTES · 홀별 메모 ({memoedHoles.length})</div>
            <div style={styles.notesList}>
              {memoedHoles.map(h => {
                const ps = h.scores[activePlayer];
                const diff = ps.strokes - h.par;
                const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
                const diffColor = diff <= -1 ? '#1f5e3a' : diff === 0 ? '#3a3a3a' : diff === 1 ? '#8b6f47' : '#c04a3e';
                return (
                  <div key={h.holeNumber} style={styles.noteCard}>
                    <div style={styles.noteCardHeader}>
                      <div style={styles.noteCardHole}>
                        HOLE {h.holeNumber}
                        <span style={styles.noteCardPar}>PAR {h.par}</span>
                      </div>
                      <div style={{ ...styles.noteCardScore, color: diffColor }}>
                        {ps.strokes}타 ({diffLabel})
                      </div>
                    </div>
                    <div style={styles.noteCardBody}>{ps.memo}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Navigation actions */}
      <div style={styles.reportActions}>
        <button style={styles.primaryButton} onClick={onNewRound}>
          새 라운드 시작
        </button>
        <div style={styles.reportActionRow}>
          <button style={styles.secondaryButton} onClick={onGoHome}>
            <Home size={16} /> 홈으로
          </button>
          <button style={styles.secondaryButton} onClick={onGoHistory}>
            <BookOpen size={16} /> 히스토리
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div style={styles.statTile}>
      <div style={styles.tileLabel}>{label}</div>
      <div style={styles.tileValue}>{value}</div>
      <div style={styles.tileSub}>{sub}</div>
    </div>
  );
}

function BreakdownBar({ label, count, total, color }) {
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

function ScorecardTable({ round, player }) {
  const renderTable = (holes, label, offset) => {
    // 9홀 합계
    const parSum = holes.reduce((s, h) => s + h.par, 0);
    const strokesSum = holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const puttsSum = holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
    const diffSum = strokesSum - parSum;
    const diffLabel = diffSum === 0 ? 'E' : diffSum > 0 ? `+${diffSum}` : `${diffSum}`;

    return (
      <div style={styles.scorecardTable}>
        {/* Hole row */}
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

        {/* Par row */}
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

        {/* Score row */}
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
            color: diffSum > 0 ? '#c04a3e' : diffSum < 0 ? '#1f5e3a' : '#3a3a3a',
            fontWeight: '700',
          }}>
            {strokesSum}
            <span style={styles.scorecardTotalDiff}> {diffLabel}</span>
          </div>
        </div>

        {/* Putts row */}
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

  // 18홀 전체 합계
  const totalStrokes = round.holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
  const totalPar = round.pars.reduce((a, b) => a + b, 0);
  const totalPutts = round.holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
  const totalDiff = totalStrokes - totalPar;

  return (
    <div style={styles.scorecardWrap}>
      {renderTable(round.holes.slice(0, 9), 'OUT', 0)}
      {renderTable(round.holes.slice(9), 'IN', 9)}

      {/* 18홀 그랜드 합계 */}
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
                color: totalDiff > 0 ? '#c04a3e' : totalDiff < 0 ? '#1f5e3a' : '#f5f0e6',
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

function Insights({ stats, round, player }) {
  const insights = [];

  if (stats.girPct >= 50) {
    insights.push({ icon: '🎯', text: `GIR ${stats.girPct}% — 아이언 샷이 견고했습니다.` });
  } else if (stats.girPct < 30) {
    insights.push({ icon: '⚠️', text: `GIR ${stats.girPct}% — 아이언/어프로치 정확도 개선 여지.` });
  }

  if (stats.avgPutts <= 1.8) {
    insights.push({ icon: '⛳', text: `홀당 평균 ${stats.avgPutts}퍼팅 — 훌륭한 그린 감각.` });
  } else if (stats.avgPutts >= 2.2) {
    insights.push({ icon: '📉', text: `퍼팅당 평균 ${stats.avgPutts} — 퍼팅 연습이 스코어에 큰 영향.` });
  }

  if (stats.fairwayPct >= 60) {
    insights.push({ icon: '🏹', text: `페어웨이 안착 ${stats.fairwayPct}% — 티샷이 안정적.` });
  } else if (stats.fairwayPct < 40) {
    insights.push({ icon: '🌲', text: `페어웨이 ${stats.fairwayPct}% — 티샷 정확도가 스코어 관리의 열쇠.` });
  }

  const front = stats.front9;
  const back = stats.back9;
  if (Math.abs(front - back) >= 4) {
    insights.push({
      icon: front > back ? '📈' : '📉',
      text: front > back
        ? `후반 9홀(${back})이 전반(${front})보다 ${front - back}타 좋았습니다 — 페이스 잘 유지.`
        : `전반 9홀(${front})이 후반(${back})보다 ${back - front}타 좋았습니다 — 후반 집중력 관리 필요.`
    });
  }

  if (stats.doubles >= 4) {
    insights.push({ icon: '🚨', text: `더블보기 이상 ${stats.doubles}회 — 큰 실수 줄이면 스코어 크게 개선.` });
  }

  if (stats.birdies + stats.eagles >= 3) {
    insights.push({ icon: '🔥', text: `버디 이상 ${stats.birdies + stats.eagles}회 — 찬스에서 잘 마무리했습니다.` });
  }

  if (insights.length === 0) {
    insights.push({ icon: '✨', text: '균형 잡힌 라운드였습니다.' });
  }

  return (
    <div style={styles.insightsList}>
      {insights.map((ins, i) => (
        <div key={i} style={styles.insightRow}>
          <div style={styles.insightIcon}>{ins.icon}</div>
          <div style={styles.insightText}>{ins.text}</div>
        </div>
      ))}
    </div>
  );
}

// ============== HISTORY VIEW ==============
function HistoryView({ rounds, onBack, onSelect, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>History</div>
        <div style={{ width: 40 }} />
      </header>

      {rounds.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📖</div>
          <div style={styles.emptyTitle}>기록된 라운드가 없습니다</div>
          <div style={styles.emptySub}>첫 라운드를 시작해보세요</div>
        </div>
      ) : (
        <div style={styles.historyList}>
          {rounds.map(r => (
            <HistoryCard
              key={r.id}
              round={r}
              onSelect={() => onSelect(r.id)}
              onDelete={() => setPendingDelete(r)}
            />
          ))}
        </div>
      )}

      {/* 라운드 삭제 확인 모달 */}
      {pendingDelete && (
        <div style={styles.modalOverlay} onClick={() => setPendingDelete(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>🗑️</div>
            <div style={styles.modalTitle}>라운드 삭제</div>
            <div style={styles.modalText}>
              {pendingDelete.courseName} 라운드를<br/>삭제하시겠습니까?
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.modalBtnCancel}
                onClick={() => setPendingDelete(null)}
              >
                취소
              </button>
              <button
                style={styles.modalBtnConfirm}
                onClick={() => {
                  onDelete(pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ round, onSelect, onDelete }) {
  const firstPlayer = round.players[0];
  const total = round.holes.reduce((s, h) => s + (h.scores[firstPlayer]?.strokes || 0), 0);
  const totalPar = round.pars.reduce((a, b) => a + b, 0);
  const diff = total - totalPar;

  return (
    <div style={styles.historyCard}>
      <button style={styles.historyCardMain} onClick={onSelect}>
        <div style={styles.historyCardLeft}>
          <div style={styles.historyCourse}>{round.courseName}</div>
          <div style={styles.historyMeta}>
            {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
            <span style={styles.dot}> · </span>
            {round.players.join(', ')}
          </div>
        </div>
        <div style={styles.historyCardRight}>
          <div style={styles.historyScore}>{total}</div>
          <div style={{ ...styles.historyDiff, color: diff > 0 ? '#c04a3e' : diff < 0 ? '#1f5e3a' : '#6b6558' }}>
            {diff > 0 ? `+${diff}` : diff === 0 ? 'E' : diff}
          </div>
        </div>
      </button>
      <button style={styles.deleteBtn} onClick={onDelete}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ============== STATS VIEW ==============
function StatsView({ rounds, onBack }) {
  if (rounds.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.pageHeader}>
          <button style={styles.iconBack} onClick={onBack}>
            <ChevronLeft size={22} />
          </button>
          <div style={styles.pageTitle}>Stats</div>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyTitle}>통계 데이터 부족</div>
          <div style={styles.emptySub}>라운드를 기록하면 통계가 쌓입니다</div>
        </div>
      </div>
    );
  }

  // Aggregate stats across all rounds (first player of each round)
  const allScores = rounds.map(r => {
    const p = r.players[0];
    const total = r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
    const par = r.pars.reduce((a, b) => a + b, 0);
    const girHoles = r.holes.filter(h => h.scores[p]?.gir === true).length;
    const putts = r.holes.reduce((s, h) => s + (h.scores[p]?.putts || 0), 0);
    const par4or5 = r.holes.filter(h => h.par > 3);
    const fairwaysHit = par4or5.filter(h => h.scores[p]?.fairway === true).length;
    return {
      date: r.date,
      course: r.courseName,
      total,
      diff: total - par,
      girPct: (girHoles / 18) * 100,
      avgPutts: putts / 18,
      fairwayPct: par4or5.length > 0 ? (fairwaysHit / par4or5.length) * 100 : 0
    };
  });

  const avgScore = (allScores.reduce((s, x) => s + x.total, 0) / allScores.length).toFixed(1);
  const bestScore = Math.min(...allScores.map(s => s.total));
  const avgGir = (allScores.reduce((s, x) => s + x.girPct, 0) / allScores.length).toFixed(0);
  const avgPutts = (allScores.reduce((s, x) => s + x.avgPutts, 0) / allScores.length).toFixed(1);
  const avgFairway = (allScores.reduce((s, x) => s + x.fairwayPct, 0) / allScores.length).toFixed(0);

  const maxTotal = Math.max(...allScores.map(s => s.total));
  const minTotal = Math.min(...allScores.map(s => s.total));

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Career</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>OVERVIEW</div>
        <div style={styles.keyStatsGrid}>
          <StatTile label="Rounds" value={rounds.length} sub="played" />
          <StatTile label="Best" value={bestScore} sub="lowest score" />
          <StatTile label="Average" value={avgScore} sub="per round" />
          <StatTile label="GIR" value={`${avgGir}%`} sub="average" />
          <StatTile label="Putts" value={avgPutts} sub="per hole" />
          <StatTile label="FW" value={`${avgFairway}%`} sub="hit rate" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE TREND</div>
        <div style={styles.trendChart}>
          {allScores.slice().reverse().map((s, i) => {
            const range = maxTotal - minTotal || 1;
            const height = ((s.total - minTotal) / range) * 60 + 20;
            return (
              <div key={i} style={styles.trendCol}>
                <div style={styles.trendValue}>{s.total}</div>
                <div style={{ ...styles.trendBar, height: `${height}%` }} />
                <div style={styles.trendDate}>
                  {new Date(s.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============== INSIGHTS VIEW ==============
function InsightsView({ rounds, onBack }) {
  if (rounds.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.pageHeader}>
          <button style={styles.iconBack} onClick={onBack}>
            <ChevronLeft size={22} />
          </button>
          <div style={styles.pageTitle}>Insights</div>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⚡</div>
          <div style={styles.emptyTitle}>분석할 데이터가 부족합니다</div>
          <div style={styles.emptySub}>라운드를 3회 이상 기록하면<br/>스타일 분석이 가능해요</div>
        </div>
      </div>
    );
  }

  // 전체 라운드 집계 (첫 번째 플레이어 기준)
  const allHoles = rounds.flatMap(r => {
    const p = r.players[0];
    return r.holes.map(h => ({
      par: h.par,
      strokes: h.scores[p]?.strokes || 0,
      putts: h.scores[p]?.putts || 0,
      gir: h.scores[p]?.gir,
      fairway: h.scores[p]?.fairway,
      diff: (h.scores[p]?.strokes || 0) - h.par,
    }));
  });

  // 파별 평균 스코어
  const parBreakdown = [3, 4, 5].map(parNum => {
    const holes = allHoles.filter(h => h.par === parNum);
    if (holes.length === 0) return null;
    const avgStrokes = (holes.reduce((s, h) => s + h.strokes, 0) / holes.length).toFixed(2);
    const avgDiff = (holes.reduce((s, h) => s + h.diff, 0) / holes.length).toFixed(2);
    const birdieRate = ((holes.filter(h => h.diff <= -1).length / holes.length) * 100).toFixed(0);
    const bogeyPlusRate = ((holes.filter(h => h.diff >= 1).length / holes.length) * 100).toFixed(0);
    return { par: parNum, count: holes.length, avgStrokes, avgDiff, birdieRate, bogeyPlusRate };
  }).filter(Boolean);

  // 스트렝스/위크니스 자동 판정
  const totalGir = allHoles.filter(h => h.gir === true).length;
  const girRate = (totalGir / allHoles.length) * 100;
  const par4or5 = allHoles.filter(h => h.par > 3);
  const fairwayHit = par4or5.filter(h => h.fairway === true).length;
  const fairwayRate = par4or5.length > 0 ? (fairwayHit / par4or5.length) * 100 : 0;
  const avgPutts = allHoles.reduce((s, h) => s + h.putts, 0) / allHoles.length;

  // 플레이 스타일 판정
  const birdieCount = allHoles.filter(h => h.diff <= -1).length;
  const doublePlusCount = allHoles.filter(h => h.diff >= 2).length;
  const parCount = allHoles.filter(h => h.diff === 0).length;
  const birdieRatePct = (birdieCount / allHoles.length) * 100;
  const doubleRatePct = (doublePlusCount / allHoles.length) * 100;
  const parRatePct = (parCount / allHoles.length) * 100;

  // 스코어 표준편차로 일관성 판정
  const scores = rounds.map(r => {
    const p = r.players[0];
    return r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
  });
  const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + Math.pow(v - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // 스타일 결정 로직
  let styleType, styleSubtitle, styleDescription, styleIcon, styleColor;

  if (birdieRatePct >= 10 && doubleRatePct >= 15) {
    styleType = '공격형 · AGGRESSIVE';
    styleSubtitle = '리스크를 감수하는 스코어 메이커';
    styleDescription = '버디 찬스를 적극적으로 노리지만 때때로 큰 실수가 발생합니다. 빅 스코어가 나올 수 있는 스타일이에요.';
    styleIcon = '🔥';
    styleColor = '#c04a3e';
  } else if (doubleRatePct < 10 && birdieRatePct < 8) {
    styleType = '안정형 · CONSERVATIVE';
    styleSubtitle = '실수 없는 꾸준한 스코어 관리';
    styleDescription = '큰 실수가 적고 안정적으로 파와 보기 사이에서 스코어를 관리합니다. 꾸준함이 무기예요.';
    styleIcon = '🛡️';
    styleColor = '#1f5e3a';
  } else if (parRatePct >= 35) {
    styleType = '정교형 · PRECISION';
    styleSubtitle = '파 세이브 능력이 뛰어난 플레이어';
    styleDescription = '파 세이브율이 높아 안정적인 스코어를 만들어냅니다. 정확한 샷메이킹이 강점입니다.';
    styleIcon = '🎯';
    styleColor = '#1f3d2e';
  } else if (stdDev >= 6) {
    styleType = '기복형 · INCONSISTENT';
    styleSubtitle = '라운드마다 스코어 편차가 큰 스타일';
    styleDescription = `라운드별 편차 ±${stdDev.toFixed(1)}타 — 좋을 땐 환상적이지만 컨디션에 좌우됩니다. 꾸준함이 과제예요.`;
    styleIcon = '⚡';
    styleColor = '#d9a441';
  } else {
    styleType = '밸런스형 · BALANCED';
    styleSubtitle = '공격과 수비의 균형이 잡힌 플레이어';
    styleDescription = '공격적인 플레이와 안정적인 관리를 적절히 섞는 스타일입니다. 전천후 골퍼예요.';
    styleIcon = '⚖️';
    styleColor = '#1f3d2e';
  }

  const strengths = [];
  const weaknesses = [];

  if (girRate >= 50) strengths.push({ title: '견고한 아이언', detail: `GIR ${girRate.toFixed(0)}% — 그린 적중률이 우수합니다` });
  else if (girRate < 30) weaknesses.push({ title: '아이언 정확도', detail: `GIR ${girRate.toFixed(0)}% — 어프로치 연습 권장` });

  if (fairwayRate >= 55) strengths.push({ title: '안정적인 티샷', detail: `페어웨이 ${fairwayRate.toFixed(0)}% — 스윙 일관성이 좋습니다` });
  else if (fairwayRate < 35) weaknesses.push({ title: '티샷 방향성', detail: `페어웨이 ${fairwayRate.toFixed(0)}% — 드라이버 정확도 개선 필요` });

  if (avgPutts <= 1.8) strengths.push({ title: '우수한 퍼팅', detail: `홀당 ${avgPutts.toFixed(2)} 퍼팅 — 그린 감각 탁월` });
  else if (avgPutts >= 2.2) weaknesses.push({ title: '퍼팅 효율', detail: `홀당 ${avgPutts.toFixed(2)} 퍼팅 — 퍼팅 연습이 가장 큰 스코어 개선 포인트` });

  // 파별 가장 약한 영역
  const weakestPar = parBreakdown.reduce((w, p) =>
    (!w || parseFloat(p.avgDiff) > parseFloat(w.avgDiff)) ? p : w, null);
  if (weakestPar && parseFloat(weakestPar.avgDiff) > 0.5) {
    weaknesses.push({
      title: `파${weakestPar.par} 홀 공략`,
      detail: `평균 +${weakestPar.avgDiff}타 — 파${weakestPar.par} 홀에서 스코어 손실이 큼`
    });
  }

  const bestPar = parBreakdown.reduce((b, p) =>
    (!b || parseFloat(p.avgDiff) < parseFloat(b.avgDiff)) ? p : b, null);
  if (bestPar && parseFloat(bestPar.avgDiff) < 0.3) {
    strengths.push({
      title: `파${bestPar.par}에 강함`,
      detail: `평균 +${bestPar.avgDiff}타 — 파${bestPar.par} 홀에서 안정적`
    });
  }

  // 전후반 비교
  const frontHoles = allHoles.filter((_, idx) => idx % 18 < 9);
  const backHoles = allHoles.filter((_, idx) => idx % 18 >= 9);
  const frontAvgDiff = frontHoles.reduce((s, h) => s + h.diff, 0) / frontHoles.length;
  const backAvgDiff = backHoles.reduce((s, h) => s + h.diff, 0) / backHoles.length;
  const fadeDiff = backAvgDiff - frontAvgDiff;

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Insights</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.insightsBanner}>
        <div style={styles.insightsBannerLabel}>전체 분석 데이터</div>
        <div style={styles.insightsBannerValue}>
          <span>{rounds.length}</span>
          <span style={styles.insightsBannerSub}>라운드</span>
          <span style={styles.insightsBannerDot}>·</span>
          <span>{allHoles.length}</span>
          <span style={styles.insightsBannerSub}>홀</span>
        </div>
      </div>

      {/* 플레이 스타일 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>MY STYLE · 나의 플레이 스타일</div>
        <div style={{ ...styles.styleCard, borderColor: styleColor }}>
          <div style={styles.styleIconWrap}>
            <div style={styles.styleIconEmoji}>{styleIcon}</div>
          </div>
          <div style={styles.styleContent}>
            <div style={{ ...styles.styleType, color: styleColor }}>{styleType}</div>
            <div style={styles.styleSubtitle}>{styleSubtitle}</div>
            <div style={styles.styleDescription}>{styleDescription}</div>
          </div>
        </div>

        {/* 스타일 지표 */}
        <div style={styles.styleMetrics}>
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>버디율</div>
            <div style={styles.styleMetricValue}>{birdieRatePct.toFixed(1)}%</div>
          </div>
          <div style={styles.styleMetricDivider} />
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>파 세이브</div>
            <div style={styles.styleMetricValue}>{parRatePct.toFixed(0)}%</div>
          </div>
          <div style={styles.styleMetricDivider} />
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>더블+ 비율</div>
            <div style={styles.styleMetricValue}>{doubleRatePct.toFixed(1)}%</div>
          </div>
          <div style={styles.styleMetricDivider} />
          <div style={styles.styleMetric}>
            <div style={styles.styleMetricLabel}>일관성</div>
            <div style={styles.styleMetricValue}>±{stdDev.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* 강점 */}
      {strengths.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>STRENGTHS · 강점</div>
          <div style={styles.insightCards}>
            {strengths.map((s, i) => (
              <div key={i} style={{ ...styles.insightCard, borderLeftColor: '#1f5e3a' }}>
                <div style={styles.insightCardBadge}>✓</div>
                <div style={styles.insightCardContent}>
                  <div style={styles.insightCardTitle}>{s.title}</div>
                  <div style={styles.insightCardDetail}>{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 약점 */}
      {weaknesses.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>FOCUS AREAS · 개선 포인트</div>
          <div style={styles.insightCards}>
            {weaknesses.map((w, i) => (
              <div key={i} style={{ ...styles.insightCard, borderLeftColor: '#c04a3e' }}>
                <div style={{ ...styles.insightCardBadge, background: '#fde8e3', color: '#c04a3e' }}>△</div>
                <div style={styles.insightCardContent}>
                  <div style={styles.insightCardTitle}>{w.title}</div>
                  <div style={styles.insightCardDetail}>{w.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파별 분석 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>BY PAR · 파별 성적</div>
        <div style={styles.parAnalysis}>
          {parBreakdown.map(p => (
            <div key={p.par} style={styles.parAnalysisRow}>
              <div style={styles.parAnalysisBadge}>PAR {p.par}</div>
              <div style={styles.parAnalysisData}>
                <div style={styles.parAnalysisMain}>
                  <span style={styles.parAnalysisStrokes}>{p.avgStrokes}</span>
                  <span style={{
                    ...styles.parAnalysisDiff,
                    color: parseFloat(p.avgDiff) > 0 ? '#c04a3e' : parseFloat(p.avgDiff) < 0 ? '#1f5e3a' : '#6b6558',
                  }}>
                    {parseFloat(p.avgDiff) > 0 ? '+' : ''}{p.avgDiff}
                  </span>
                  <span style={styles.parAnalysisCount}>({p.count}홀)</span>
                </div>
                <div style={styles.parAnalysisRates}>
                  <span>버디+ {p.birdieRate}%</span>
                  <span style={styles.parAnalysisDot}>·</span>
                  <span>보기+ {p.bogeyPlusRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 전후반 페이스 */}
      {!isNaN(fadeDiff) && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>PACE · 전후반 페이스</div>
          <div style={styles.paceCard}>
            <div style={styles.paceRow}>
              <div style={styles.paceLabel}>FRONT 9</div>
              <div style={styles.paceValue}>
                {frontAvgDiff > 0 ? '+' : ''}{frontAvgDiff.toFixed(2)}
                <span style={styles.paceSub}>/홀</span>
              </div>
            </div>
            <div style={styles.paceArrow}>
              {Math.abs(fadeDiff) < 0.1 ? '→' : fadeDiff > 0 ? '↗' : '↘'}
            </div>
            <div style={styles.paceRow}>
              <div style={styles.paceLabel}>BACK 9</div>
              <div style={styles.paceValue}>
                {backAvgDiff > 0 ? '+' : ''}{backAvgDiff.toFixed(2)}
                <span style={styles.paceSub}>/홀</span>
              </div>
            </div>
          </div>
          <div style={styles.paceInsight}>
            {Math.abs(fadeDiff) < 0.1
              ? '전후반 페이스가 균일합니다 — 집중력 유지가 좋아요'
              : fadeDiff > 0.3
                ? `후반에 평균 ${fadeDiff.toFixed(2)}타 더 많이 쳐요 — 체력/집중력 관리 필요`
                : fadeDiff < -0.3
                  ? `후반에 ${Math.abs(fadeDiff).toFixed(2)}타 적게 쳐요 — 후반 집중력이 강점`
                  : '전후반이 안정적으로 유지됩니다'
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ============== MY BAG VIEW ==============
// 아마추어 남성 골퍼 평균 비거리(미터) 기준 - 사용자가 조정 가능
// carry: 공이 떨어진 지점까지 거리, total: 런 포함 최종 거리
const DEFAULT_CLUBS = [
  { id: 'driver', name: 'Driver', type: 'Wood', carry: 200, total: 215 },
  { id: 'wood3', name: '3W', type: 'Wood', carry: 180, total: 195 },
  { id: 'wood5', name: '5W', type: 'Wood', carry: 170, total: 180 },
  { id: 'hybrid4', name: '4H', type: 'Hybrid', carry: 160, total: 170 },
  { id: 'iron5', name: '5i', type: 'Iron', carry: 155, total: 160 },
  { id: 'iron6', name: '6i', type: 'Iron', carry: 145, total: 150 },
  { id: 'iron7', name: '7i', type: 'Iron', carry: 135, total: 140 },
  { id: 'iron8', name: '8i', type: 'Iron', carry: 125, total: 130 },
  { id: 'iron9', name: '9i', type: 'Iron', carry: 115, total: 120 },
  { id: 'wedge46', name: '46°', type: 'Wedge', carry: 100, total: 105 },
  { id: 'wedge52', name: '52°', type: 'Wedge', carry: 85, total: 90 },
  { id: 'wedge56', name: '56°', type: 'Wedge', carry: 70, total: 75 },
  { id: 'wedge60', name: '60°', type: 'Wedge', carry: 55, total: 60 },
  { id: 'putter', name: 'Putter', type: 'Putter' },
];

// 타입별 클럽 추가 시 기본값
const CLUB_TYPE_DEFAULTS = {
  Wood: { name: '새 우드', carry: 180, total: 195 },
  Hybrid: { name: '새 하이브리드', carry: 160, total: 170 },
  Iron: { name: '새 아이언', carry: 140, total: 145 },
  Wedge: { name: '50°', carry: 90, total: 92 },
};

// 타입별 이름 추천값 (순환 선택)
const CLUB_NAME_SUGGESTIONS = {
  Wood: ['Driver', '2W', '3W', '4W', '5W', '7W', '9W', '11W'],
  Hybrid: ['1H', '2H', '3H', '4H', '5H', '6H', '7H'],
  Iron: ['1i', '2i', '3i', '4i', '5i', '6i', '7i', '8i', '9i'],
  Wedge: ['46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'],
};

function MyBagView({ currentUser, onBack }) {
  const [clubs, setClubs] = useState(DEFAULT_CLUBS);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null); // 삭제 대기 중인 클럽

  useEffect(() => {
    const load = async () => {
      try {
        const savedClubs = await loadClubsByUser(currentUser.userId);
        if (savedClubs && Array.isArray(savedClubs)) {
          // 기존 데이터 마이그레이션
          const migrated = savedClubs.map(c => {
            if (c.type === 'Putter') {
              // 퍼터: avgPutts/avg 등 거리 관련 필드 모두 제거 (이름과 type만 유지)
              return { id: c.id, name: c.name, type: 'Putter' };
            }
            if (c.carry !== undefined && c.total !== undefined) return c;
            const defaultClub = DEFAULT_CLUBS.find(d => d.id === c.id);
            return {
              ...c,
              carry: defaultClub?.carry ?? (c.avg ? c.avg - 10 : 140),
              total: c.avg ?? defaultClub?.total ?? 150,
            };
          });
          setClubs(migrated);
        } else {
          setClubs(DEFAULT_CLUBS);
        }
      } catch (e) {
        console.error('Load clubs failed', e);
        setClubs(DEFAULT_CLUBS);
      }
    };
    load();
  }, [currentUser.userId]);

  const saveClubs = async (updated) => {
    setClubs(updated);
    try {
      await saveClubsForUser(currentUser.userId, updated);
    } catch (e) {
      console.error('Save clubs failed', e);
    }
  };

  const updateField = (id, field, delta) => {
    const updated = clubs.map(c => {
      if (c.id !== id) return c;
      const curr = c[field] ?? 0;
      let next = Math.max(0, Math.min(350, curr + delta));

      const newClub = { ...c, [field]: next };

      if (field === 'carry' && newClub.total !== undefined && next > newClub.total) {
        newClub.total = next;
      }
      if (field === 'total' && newClub.carry !== undefined && next < newClub.carry) {
        newClub.carry = next;
      }

      return newClub;
    });
    saveClubs(updated);
  };

  // 클럽 추가
  const addClub = (type) => {
    const defaults = CLUB_TYPE_DEFAULTS[type];
    // 이미 사용된 이름 제외한 추천명 찾기
    const usedNames = clubs.filter(c => c.type === type).map(c => c.name);
    const suggestions = CLUB_NAME_SUGGESTIONS[type] || [];
    const nextName = suggestions.find(s => !usedNames.includes(s)) || defaults.name;

    const newClub = {
      id: `${type.toLowerCase()}_${Date.now()}`,
      name: nextName,
      type,
      carry: defaults.carry,
      total: defaults.total,
    };

    // 타입 그룹 내 적절한 위치에 삽입 (같은 타입 마지막 뒤)
    const lastOfTypeIdx = clubs.map(c => c.type).lastIndexOf(type);
    const insertIdx = lastOfTypeIdx === -1 ? clubs.length : lastOfTypeIdx + 1;
    const updated = [
      ...clubs.slice(0, insertIdx),
      newClub,
      ...clubs.slice(insertIdx),
    ];
    saveClubs(updated);
  };

  // 클럽 삭제 요청 - 모달 띄우기
  const requestDeleteClub = (id) => {
    const club = clubs.find(c => c.id === id);
    if (!club) return;
    setPendingDelete(club);
  };

  // 실제 삭제 실행
  const confirmDelete = () => {
    if (!pendingDelete) return;
    saveClubs(clubs.filter(c => c.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
  };

  // 이름 수정 시작
  const startEditName = (club) => {
    setEditingId(club.id);
    setEditingName(club.name);
  };

  // 이름 수정 저장
  const saveEditName = () => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    const updated = clubs.map(c =>
      c.id === editingId ? { ...c, name: trimmed } : c
    );
    saveClubs(updated);
    setEditingId(null);
    setEditingName('');
  };

  const cancelEditName = () => {
    setEditingId(null);
    setEditingName('');
  };

  // 클럽 타입별 그룹화
  const grouped = {
    Wood: clubs.filter(c => c.type === 'Wood'),
    Hybrid: clubs.filter(c => c.type === 'Hybrid'),
    Iron: clubs.filter(c => c.type === 'Iron'),
    Wedge: clubs.filter(c => c.type === 'Wedge'),
    Putter: clubs.filter(c => c.type === 'Putter'),
  };

  const totalCount = clubs.length;
  const overLimit = totalCount > 14;

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>My Bag</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.bagBanner}>
        <div style={styles.bagBannerIcon}>🏌️</div>
        <div>
          <div style={styles.bagBannerLabel}>내 클럽 구성</div>
          <div style={styles.bagBannerValue}>
            {totalCount}
            <span style={styles.bagBannerSub}>
              {' / 14 clubs'}
              {overLimit && ' · 규정 초과'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.bagHint}>
        캐리 · 토탈 거리 설정 · 클럽명 탭하여 수정 · 하단 + 버튼으로 추가
      </div>

      {Object.entries(grouped).map(([type, typeClubs]) => {
        const labelMap = {
          Wood: 'WOODS · 우드',
          Hybrid: 'HYBRIDS · 하이브리드',
          Iron: 'IRONS · 아이언',
          Wedge: 'WEDGES · 웨지',
          Putter: 'PUTTER · 퍼터'
        };
        const canAdd = type !== 'Putter';
        const showSection = typeClubs.length > 0 || canAdd;
        if (!showSection) return null;

        return (
          <div key={type} style={styles.section}>
            <div style={styles.sectionHeaderRow}>
              <div style={styles.sectionTitle}>{labelMap[type]}</div>
              {canAdd && (
                <button
                  style={styles.sectionAddBtn}
                  onClick={() => addClub(type)}
                  aria-label={`${type} 추가`}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>추가</span>
                </button>
              )}
            </div>
            {typeClubs.length === 0 ? (
              <div style={styles.emptyClubList}>
                아직 등록된 클럽이 없습니다
              </div>
            ) : (
              <div style={styles.clubList}>
                {typeClubs.map(club => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    isEditing={editingId === club.id}
                    editingName={editingName}
                    onEditingNameChange={setEditingName}
                    onStartEdit={() => startEditName(club)}
                    onSaveEdit={saveEditName}
                    onCancelEdit={cancelEditName}
                    onUpdate={(field, delta) => updateField(club.id, field, delta)}
                    onDelete={() => requestDeleteClub(club.id)}
                    canDelete={true}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* 거리 차트 - 캐리 vs 토탈 비교 */}
      {clubs.filter(c => c.type !== 'Putter' && c.carry && c.total).length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>DISTANCE CHART · 거리 분포</div>
          <div style={styles.distanceChartLegend}>
            <div style={styles.distanceLegendItem}>
              <span style={{ ...styles.distanceLegendDot, background: '#a8c2a5' }} />
              <span>캐리</span>
            </div>
            <div style={styles.distanceLegendItem}>
              <span style={{ ...styles.distanceLegendDot, background: '#1f3d2e' }} />
              <span>토탈</span>
            </div>
          </div>
          <div style={styles.distanceChart}>
            {clubs
              .filter(c => c.type !== 'Putter' && c.carry && c.total)
              .sort((a, b) => b.total - a.total)
              .map(club => {
                const maxDist = Math.max(...clubs.filter(c => c.type !== 'Putter' && c.total).map(c => c.total));
                const totalPct = (club.total / maxDist) * 100;
                const carryPct = (club.carry / maxDist) * 100;
                return (
                  <div key={club.id} style={styles.distanceRow}>
                    <div style={styles.distanceLabel}>{club.name}</div>
                    <div style={styles.distanceBarTrack}>
                      <div style={{
                        ...styles.distanceBarFillTotal,
                        width: `${totalPct}%`,
                      }} />
                      <div style={{
                        ...styles.distanceBarFillCarry,
                        width: `${carryPct}%`,
                      }} />
                    </div>
                    <div style={styles.distanceValues}>
                      <div style={styles.distanceValueCarry}>{club.carry}</div>
                      <div style={styles.distanceValueTotal}>{club.total}m</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 클럽 삭제 확인 모달 */}
      {pendingDelete && (
        <div style={styles.modalOverlay} onClick={cancelDelete}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIcon}>🗑️</div>
            <div style={styles.modalTitle}>{pendingDelete.name} 삭제</div>
            <div style={styles.modalText}>
              이 클럽을 백에서 제거하시겠습니까?
            </div>
            <div style={styles.modalActions}>
              <button style={styles.modalBtnCancel} onClick={cancelDelete}>
                취소
              </button>
              <button style={styles.modalBtnConfirm} onClick={confirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 클럽 카드 컴포넌트
function ClubCard({
  club, isEditing, editingName, onEditingNameChange,
  onStartEdit, onSaveEdit, onCancelEdit,
  onUpdate, onDelete, canDelete
}) {
  // 이름 편집 헤더 렌더러
  const renderName = () => {
    if (isEditing) {
      return (
        <div style={styles.clubNameEditWrap}>
          <input
            style={styles.clubNameInput}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            maxLength={12}
            autoFocus
          />
          <button style={styles.clubNameActionBtn} onClick={onSaveEdit} aria-label="저장">
            <Check size={16} strokeWidth={2.5} />
          </button>
          <button
            style={{ ...styles.clubNameActionBtn, color: '#8b8574' }}
            onClick={onCancelEdit}
            aria-label="취소"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      );
    }
    return (
      <button style={styles.clubNameTappable} onClick={onStartEdit}>
        <span style={styles.clubName}>{club.name}</span>
        <Edit3 size={12} strokeWidth={2} style={{ color: '#b8b0a0' }} />
      </button>
    );
  };

  if (club.type === 'Putter') {
    return (
      <div style={styles.clubCard}>
        <div style={styles.clubCardHeader}>
          {renderName()}
          {canDelete && !isEditing && (
            <div style={styles.clubCardHeaderRight}>
              <button
                style={styles.clubDeleteBtn}
                onClick={onDelete}
                aria-label="클럽 삭제"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const run = (club.total ?? 0) - (club.carry ?? 0);

  return (
    <div style={styles.clubCard}>
      <div style={styles.clubCardHeader}>
        {renderName()}
        <div style={styles.clubCardHeaderRight}>
          {run > 0 && !isEditing && (
            <div style={styles.clubRunBadge}>런 +{run}m</div>
          )}
          {canDelete && !isEditing && (
            <button
              style={styles.clubDeleteBtn}
              onClick={onDelete}
              aria-label="클럽 삭제"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div style={styles.clubFieldRow}>
        <div style={styles.clubFieldLabel}>
          <span style={styles.clubFieldLabelMain}>캐리</span>
          <span style={styles.clubFieldLabelSub}>Carry</span>
        </div>
        <Stepper
          value={club.carry ?? 0}
          suffix="m"
          onDecrement={() => onUpdate('carry', -5)}
          onIncrement={() => onUpdate('carry', 5)}
          canDecrement={(club.carry ?? 0) > 0}
          canIncrement={(club.carry ?? 0) < 350}
        />
      </div>

      <div style={styles.clubFieldRow}>
        <div style={styles.clubFieldLabel}>
          <span style={styles.clubFieldLabelMain}>토탈</span>
          <span style={styles.clubFieldLabelSub}>Total</span>
        </div>
        <Stepper
          value={club.total ?? 0}
          suffix="m"
          onDecrement={() => onUpdate('total', -5)}
          onIncrement={() => onUpdate('total', 5)}
          canDecrement={(club.total ?? 0) > (club.carry ?? 0)}
          canIncrement={(club.total ?? 0) < 350}
          highlight
        />
      </div>
    </div>
  );
}

// 재사용 가능한 좌/우 분할 스테퍼 컴포넌트
function Stepper({ value, suffix, onDecrement, onIncrement, canDecrement, canIncrement, highlight }) {
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

// ============== STYLES ==============
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap');

  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  button { font-family: inherit; border: none; cursor: pointer; }
  input { font-family: inherit; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes holeInOnePulse {
    0%, 100% {
      box-shadow: 0 2px 12px rgba(217, 164, 65, 0.4), 0 0 0 0 rgba(217, 164, 65, 0.6);
    }
    50% {
      box-shadow: 0 2px 16px rgba(217, 164, 65, 0.7), 0 0 0 6px rgba(217, 164, 65, 0);
    }
  }

  @keyframes holeInOneShine {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  @keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes modalSlideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

const styles = {
  app: {
    minHeight: '100vh',
    background: '#faf6ee',
    fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
    color: '#3a3a3a',
    paddingBottom: '0',
  },
  container: {
    maxWidth: '520px',
    margin: '0 auto',
    padding: '20px 18px 100px',
    animation: 'fadeIn 0.3s ease-out',
  },
  header: {
    padding: '12px 0 24px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionButton: {
    background: 'none',
    border: 'none',
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b8574',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f3d2e',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    color: '#8b8574',
    cursor: 'pointer',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoMark: {
    fontSize: '26px',
  },
  brandName: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '0.05em',
    color: '#1f3d2e',
    lineHeight: 1,
  },
  brandTagline: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: '#8b8574',
    textTransform: 'uppercase',
    marginTop: '3px',
  },
  dateLine: {
    fontSize: '12px',
    color: '#6b6558',
    marginTop: '18px',
    letterSpacing: '0.05em',
  },
  // ===== LOGIN SCREEN =====
  loginCard: {
    background: '#fff',
    padding: '40px 28px',
    borderRadius: '4px',
    textAlign: 'center',
    marginTop: '60px',
  },
  loginLogo: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  loginTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1f3d2e',
    margin: '0 0 8px',
  },
  loginSubtitle: {
    fontSize: '14px',
    color: '#8b8574',
    margin: '0 0 40px',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  heroCard: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    padding: '28px 24px',
    borderRadius: '4px',
    marginBottom: '18px',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'center',
  },
  heroLabel: {
    fontSize: '10px',
    letterSpacing: '0.3em',
    color: '#a8c2a5',
    marginBottom: '14px',
    fontWeight: '700',
  },
  heroTitle: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '28px',
    fontWeight: '800',
    margin: '0 0 24px',
    lineHeight: 1.3,
    letterSpacing: '-0.02em',
  },
  heroButton: {
    background: '#f5f0e6',
    color: '#1f3d2e',
    padding: '14px 20px',
    borderRadius: '2px',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#fff',
    padding: '18px 16px',
    borderRadius: '3px',
    border: '1px solid #ebe4d3',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: '#8b8574',
    textTransform: 'uppercase',
    marginBottom: '8px',
    fontWeight: '600',
  },
  statValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '30px',
    fontWeight: '700',
    color: '#1f3d2e',
    lineHeight: 1,
  },
  section: {
    marginBottom: '28px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '11px',
    letterSpacing: '0.2em',
    color: '#6b6558',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: '12px',
  },
  textLink: {
    background: 'none',
    fontSize: '12px',
    color: '#1f3d2e',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  roundRow: {
    background: '#fff',
    width: '100%',
    padding: '16px 18px',
    borderRadius: '3px',
    border: '1px solid #ebe4d3',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
  },
  roundRowLeft: {
    flex: 1,
  },
  roundCourse: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f3d2e',
    marginBottom: '4px',
  },
  roundDate: {
    fontSize: '12px',
    color: '#8b8574',
  },
  dot: { color: '#c8c0b0' },
  roundRowRight: {
    textAlign: 'right',
  },
  roundScore: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '26px',
    fontWeight: '800',
    color: '#1f3d2e',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  roundDiff: {
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '2px',
  },
  navGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '8px',
  },
  navCard: {
    background: 'transparent',
    padding: '20px 16px',
    borderRadius: '3px',
    border: '1px solid #d4ccbb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    color: '#1f3d2e',
    fontSize: '12px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0 24px',
  },
  pageTitle: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.01em',
  },
  iconBack: {
    width: '40px',
    height: '40px',
    background: 'transparent',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1f3d2e',
  },
  formSection: {
    marginBottom: '24px',
  },
  formLabel: {
    display: 'block',
    fontSize: '11px',
    letterSpacing: '0.2em',
    color: '#6b6558',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: '10px',
  },
  formLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  formInput: {
    width: '100%',
    padding: '13px 14px',
    fontSize: '15px',
    border: '1px solid #d4ccbb',
    borderRadius: '2px',
    background: '#fff',
    color: '#1f3d2e',
    outline: 'none',
    marginBottom: '10px',
  },
  addButton: {
    background: 'transparent',
    color: '#1f3d2e',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  playerBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#1f3d2e',
    color: '#f5f0e6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
    flexShrink: 0,
  },
  removeButton: {
    width: '32px',
    height: '32px',
    background: 'transparent',
    color: '#8b8574',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ===== Par Setup (Table Style) =====
  parTableHint: {
    fontSize: '11px',
    color: '#8b8574',
    textAlign: 'center',
    marginBottom: '10px',
    fontStyle: 'italic',
  },
  parTable: {
    background: '#fff',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  parTableRow: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: '1px solid #ebe4d3',
    minHeight: '36px',
  },
  parTableLabel: {
    width: '46px',
    flexShrink: 0,
    background: '#f5f0e6',
    borderRight: '1px solid #d4ccbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    letterSpacing: '0.1em',
    fontWeight: '700',
    color: '#6b6558',
  },
  parTableLabelHeader: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '11px',
    letterSpacing: '0.15em',
  },
  parTableCells: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    flex: 1,
    minWidth: 0,
  },
  parTableHoleCell: {
    padding: '6px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#3a3a3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid #ebe4d3',
    minWidth: 0,
  },
  parTableParCell: {
    padding: '4px 2px',
    borderRight: '1px solid #ebe4d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    position: 'relative',
  },
  parTableParValue: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    lineHeight: 1,
    transition: 'all 0.15s ease',
    pointerEvents: 'none',
    zIndex: 1,
  },
  parTapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    zIndex: 2,
  },
  parTableTotal: {
    width: '54px',
    flexShrink: 0,
    background: '#f5f0e6',
    borderLeft: '1.5px solid #d4ccbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '800',
    color: '#1f3d2e',
  },
  parTableTotalHeader: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '10px',
    letterSpacing: '0.15em',
  },
  parLegend: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '8px',
    padding: '12px 8px',
    background: '#faf6ee',
    borderRadius: '3px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  parLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#6b6558',
    fontWeight: '600',
  },
  parLegendDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
  },
  parSummary: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    borderRadius: '3px',
    padding: '18px 20px',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  parSummaryMain: {
    flex: 1,
    textAlign: 'center',
  },
  parSummaryLabel: {
    fontSize: '10px',
    letterSpacing: '0.25em',
    color: '#a8c2a5',
    fontWeight: '700',
    marginBottom: '4px',
  },
  parSummaryValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '38px',
    fontWeight: '800',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  parSummaryDivider: {
    width: '1px',
    height: '50px',
    background: '#4a5e51',
  },
  parSummaryNines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '90px',
  },
  parSummaryNineRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '12px',
  },
  parSummaryNineLabel: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: '#a8c2a5',
    fontWeight: '600',
  },
  parSummaryNineValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#f5f0e6',
  },
  primaryButton: {
    width: '100%',
    padding: '16px',
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    borderRadius: '2px',
    marginTop: '12px',
  },
  secondaryButton: {
    flex: 1,
    padding: '14px',
    background: 'transparent',
    border: '1px solid #1f3d2e',
    color: '#1f3d2e',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  reportActions: {
    marginTop: '12px',
    marginBottom: '20px',
  },
  reportActionRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  scoringHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0 16px',
  },
  scoringCourse: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#1f3d2e',
    letterSpacing: '-0.01em',
    textAlign: 'center',
  },
  progressBar: {
    marginBottom: '12px',
  },
  progressText: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '6px',
  },
  progressNumber: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '18px',
    fontWeight: '800',
    color: '#1f3d2e',
    lineHeight: 1,
  },
  progressTotal: {
    fontSize: '11px',
    color: '#8b8574',
    letterSpacing: '0.1em',
    marginLeft: '4px',
  },
  progressTrack: {
    height: '3px',
    background: '#ebe4d3',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#1f5e3a',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  runningScore: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    borderRadius: '4px',
    padding: '14px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'stretch',
    gap: '16px',
  },
  runningScoreMain: {
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
  },
  runningScoreLabel: {
    fontSize: '9px',
    letterSpacing: '0.22em',
    color: '#a8c2a5',
    fontWeight: '700',
    marginBottom: '6px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100px',
    textAlign: 'center',
  },
  runningScoreValues: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '8px',
  },
  runningScoreNumber: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '30px',
    fontWeight: '800',
    lineHeight: 1,
    color: '#f5f0e6',
    letterSpacing: '-0.02em',
  },
  runningScoreDiff: {
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.02em',
  },
  runningScoreDivider: {
    width: '1px',
    background: '#4a5e51',
    flexShrink: 0,
  },
  runningScoreStats: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: '8px',
  },
  runningScoreStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: 0,
  },
  runningScoreStatLabel: {
    fontSize: '9px',
    letterSpacing: '0.2em',
    color: '#a8c2a5',
    fontWeight: '700',
  },
  runningScoreStatValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#f5f0e6',
    lineHeight: 1,
  },
  holeNavigator: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '4px',
    padding: '6px 0 16px',
  },
  holeNavTable: {
    background: '#fff',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  holeNavTableRow: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: '1px solid #ebe4d3',
    minHeight: '30px',
  },  holeNavRowLabel: {
    width: '48px',
    flexShrink: 0,
    background: '#f5f0e6',
    borderRight: '1px solid #d4ccbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    letterSpacing: '0.12em',
    fontWeight: '700',
    color: '#6b6558',
  },
  holeNavRowLabelHeader: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '11px',
    letterSpacing: '0.15em',
  },
  holeNavTableCells: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    flex: 1,
    minWidth: 0,
  },
  holeNavHoleCell: {
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid #ebe4d3',
    padding: '6px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#3a3a3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  holeNavParCell: {
    borderRight: '1px solid #ebe4d3',
    padding: '5px 0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b6558',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  holeNavScoreCell: {
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid #ebe4d3',
    padding: '4px 2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    cursor: 'pointer',
  },
  scoreMarker: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    lineHeight: 1,
    position: 'relative',
  },
  markerBirdie: {
    borderRadius: '50%',
    border: '2px solid #d97706',
  },
  markerEagle: {
    borderRadius: '50%',
    border: '2px solid #d97706',
    boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #d97706',
  },
  markerHoleInOne: {
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e8b54f 0%, #c88a2e 50%, #a66d1a 100%)',
    backgroundSize: '200% 200%',
    animation: 'holeInOneShine 3s ease-in-out infinite',
    boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #c88a2e, 0 2px 8px rgba(200, 138, 46, 0.4)',
    fontWeight: '800',
  },
  holeInOneStar: {
    position: 'absolute',
    top: '-8px',
    right: '-6px',
    fontSize: '10px',
    color: '#c88a2e',
    textShadow: '0 0 3px #fff, 0 1px 2px rgba(0,0,0,0.2)',
    lineHeight: 1,
  },
  markerPar: {},
  markerBogey: {
    border: '2px solid #1f3d2e',
    borderRadius: '2px',
  },
  markerDouble: {
    border: '2px solid #1f3d2e',
    borderRadius: '2px',
    boxShadow: '0 0 0 2px #fff, 0 0 0 3.5px #1f3d2e',
  },
  holeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 0 20px',
    borderTop: '1px solid #ebe4d3',
    borderBottom: '1px solid #ebe4d3',
    marginBottom: '24px',
  },
  holeLabel: {
    fontSize: '11px',
    letterSpacing: '0.25em',
    color: '#8b8574',
    fontWeight: '600',
    marginBottom: '4px',
  },
  holePar: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '30px',
    fontWeight: '800',
    color: '#1f3d2e',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  scoreName: {
    padding: '8px 14px',
    borderRadius: '2px',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    border: '1px solid',
  },
  playerTabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  playerTab: {
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '2px',
    border: '1px solid',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  playerTabScore: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    padding: '2px 6px',
    borderRadius: '2px',
    fontSize: '11px',
  },
  scoringSection: {
    marginBottom: '24px',
  },
  fieldLabel: {
    fontSize: '10px',
    letterSpacing: '0.25em',
    color: '#8b8574',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: '14px',
    textAlign: 'center',
  },
  bigScoreContainer: {
    position: 'relative',
    marginBottom: '4px',
    background: '#faf6ee',
    borderRadius: '6px',
    border: '1px solid #ebe4d3',
    userSelect: 'none',
    overflow: 'hidden',
    minHeight: '140px',
  },
  bigScoreHalves: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    pointerEvents: 'none',
  },
  bigScoreLeftHalf: {
    flex: 1,
    background: 'rgba(31, 61, 46, 0.04)',
  },
  bigScoreRightHalf: {
    flex: 1,
    background: 'rgba(31, 61, 46, 0.08)',
  },
  bigScoreSideAbs: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#5e7d6a',
    pointerEvents: 'none',
    zIndex: 1,
  },
  bigScoreSideLabel: {
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '0.02em',
  },
  bigScoreCenter: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 80px',
    pointerEvents: 'none',
    zIndex: 1,
    minHeight: '140px',
  },
  bigScoreValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '64px',
    fontWeight: '800',
    color: '#1f3d2e',
    textAlign: 'center',
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  bigScoreHint: {
    fontSize: '10px',
    letterSpacing: '0.12em',
    color: '#8b8574',
    marginTop: '8px',
    fontWeight: '600',
    textAlign: 'center',
    minHeight: '14px',
  },
  bigScoreTapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    zIndex: 2,
  },
  statsSection: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  statRow: {
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #f0ead9',
    gap: '12px',
  },
  statRowLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#3a3a3a',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    minWidth: '60px',
  },
  autoBadge: {
    fontSize: '9px',
    letterSpacing: '0.15em',
    color: '#1f5e3a',
    background: '#e8f0e3',
    padding: '2px 6px',
    borderRadius: '2px',
    fontWeight: '700',
  },
  miniStepper: {
    display: 'flex',
    alignItems: 'center',
    background: '#faf6ee',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '34px',
  },
  miniStepperTapZone: {
    width: '36px',
    height: '100%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1f3d2e',
    padding: 0,
  },
  miniStepperValue: {
    minWidth: '32px',
    fontSize: '15px',
    fontWeight: '800',
    color: '#1f3d2e',
    textAlign: 'center',
    lineHeight: 1,
    borderLeft: '1px solid #d4ccbb',
    borderRight: '1px solid #d4ccbb',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
  },
  penaltyGroup: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  penaltyItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  penaltyStepper: {
    display: 'flex',
    alignItems: 'center',
    background: '#faf6ee',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '34px',
    width: '100%',
  },
  penaltyStepperTapZone: {
    flex: 1,
    height: '100%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1f3d2e',
    padding: 0,
    cursor: 'pointer',
  },
  penaltyStepperValue: {
    minWidth: '40px',
    fontSize: '15px',
    fontWeight: '800',
    color: '#1f3d2e',
    textAlign: 'center',
    lineHeight: 1,
    borderLeft: '1px solid #d4ccbb',
    borderRight: '1px solid #d4ccbb',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    padding: '0 12px',
  },
  penaltyLabel: {
    fontSize: '9px',
    letterSpacing: '0.1em',
    color: '#8b8574',
    fontWeight: '700',
  },
  penaltyBadge: {
    fontSize: '10px',
    letterSpacing: '0.05em',
    color: '#fff',
    background: '#c04a3e',
    padding: '2px 7px',
    borderRadius: '8px',
    fontWeight: '800',
  },
  penaltyTotalBadge: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#c04a3e',
    background: '#ffe8e3',
    padding: '6px 10px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    textAlign: 'center',
  },
  toggleRow: {
    display: 'flex',
    gap: '6px',
  },
  toggleBtn: {
    padding: '7px 12px',
    borderRadius: '2px',
    border: '1px solid #d4ccbb',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  // ===== 퍼팅 + 메모 분할 행 (3:1) =====
  puttMemoRow: {
    display: 'flex',
    width: '260px',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  },
  // ===== Split Stepper (PAR 설정 스타일과 동일한 좌/우 분할 탭) =====
  splitStepper: {
    position: 'relative',
    background: '#faf6ee',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '34px',
    userSelect: 'none',
  },
  splitStepperHalves: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    pointerEvents: 'none',
  },
  splitStepperLeftHalf: {
    flex: 1,
    background: 'rgba(31, 61, 46, 0.02)',
  },
  splitStepperRightHalf: {
    flex: 1,
    background: 'rgba(31, 61, 46, 0.18)',
  },
  splitStepperContent: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  splitStepperValue: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#1f3d2e',
    lineHeight: 1,
    minWidth: '24px',
    textAlign: 'center',
  },
  splitStepperSideIcon: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#5e7d6a',
    pointerEvents: 'none',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  splitStepperTapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    zIndex: 2,
  },
  puttStepper: {
    flex: 3,
    display: 'flex',
    alignItems: 'center',
    background: '#faf6ee',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '34px',
  },
  puttStepperTapZone: {
    flex: 1,
    height: '100%',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#1f3d2e',
    padding: 0,
    cursor: 'pointer',
  },
  puttStepperValue: {
    minWidth: '40px',
    fontSize: '15px',
    fontWeight: '800',
    color: '#1f3d2e',
    textAlign: 'center',
    lineHeight: 1,
    borderLeft: '1px solid #d4ccbb',
    borderRight: '1px solid #d4ccbb',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
    padding: '0 12px',
  },
  memoButton: {
    flex: 1,
    height: '34px',
    padding: '0 6px',
    background: 'transparent',
    border: '1.5px solid #d4ccbb',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#3a3a3a',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.15s ease',
  },
  memoButtonFilled: {
    background: '#1f3d2e',
    borderColor: '#1f3d2e',
    color: '#f5f0e6',
  },
  memoDot: {
    position: 'absolute',
    top: '4px',
    right: '6px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#d9a441',
  },

  // ===== 메모 모달 =====
  memoModalCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px 22px 20px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    animation: 'modalSlideUp 0.25s ease-out',
  },
  memoModalHeader: {
    marginBottom: '14px',
    textAlign: 'center',
  },
  memoModalTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.01em',
    marginBottom: '4px',
  },
  memoModalSub: {
    fontSize: '11px',
    color: '#8b8574',
    fontWeight: '600',
  },
  memoTextarea: {
    width: '100%',
    minHeight: '160px',
    padding: '12px 14px',
    fontSize: '14px',
    fontFamily: "'Noto Sans KR', sans-serif",
    color: '#1f3d2e',
    border: '1.5px solid #d4ccbb',
    borderRadius: '4px',
    background: '#faf6ee',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
  },
  memoCharCount: {
    fontSize: '11px',
    color: '#8b8574',
    textAlign: 'right',
    marginTop: '6px',
    marginBottom: '14px',
    fontWeight: '600',
  },
  memoSaveBtn: {
    flex: 1,
    padding: '14px',
    background: '#1f3d2e',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700',
    borderRadius: '4px',
    letterSpacing: '0.02em',
  },

  // ===== 분석 뷰 - 노트 카드 =====
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  noteCard: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderLeft: '3px solid #d9a441',
    borderRadius: '3px',
    padding: '14px 16px',
  },
  noteCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '8px',
  },
  noteCardHole: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '0.02em',
  },
  noteCardPar: {
    fontSize: '10px',
    color: '#8b8574',
    fontWeight: '600',
  },
  noteCardScore: {
    fontSize: '13px',
    fontWeight: '800',
  },
  noteCardBody: {
    fontSize: '13px',
    color: '#3a3a3a',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  shotShapeSection: {
    padding: '14px 16px',
    borderBottom: '1px solid #f0ead9',
  },
  shotShapeSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#3a3a3a',
    fontWeight: '500',
    marginBottom: '10px',
  },
  shotShapeMatrixHeader: {
    display: 'flex',
    fontSize: '9px',
    color: '#8b8574',
    fontWeight: '700',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    padding: '0 4px',
  },
  shotShapeMatrixCenter: {
    flex: 1,
    textAlign: 'center',
  },
  shotShapeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '5px',
  },
  shotShapeCell: {
    minHeight: '78px',
    padding: '6px 2px',
    borderRadius: '4px',
    border: '1.5px solid',
    fontWeight: '700',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    background: 'transparent',
  },
  shotShapeCellLabel: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.01em',
    lineHeight: 1.1,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  // 기존 shotShapeRow/Btn (호환성 유지를 위해 남겨둠)
  shotShapeRow: {
    display: 'flex',
    gap: '5px',
    width: '260px',
    flexShrink: 0,
  },
  shotShapeBtn: {
    flex: 1,
    height: '38px',
    padding: '4px 2px',
    borderRadius: '4px',
    border: '1.5px solid',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    background: 'transparent',
    minWidth: 0,
  },
  shotShapeLabel: {
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  fairwayHitRow: {
    display: 'flex',
    gap: '5px',
    flex: 1,
    justifyContent: 'flex-end',
  },
  fairwayHitBtn: {
    flex: 1,
    height: '38px',
    minWidth: '36px',
    borderRadius: '4px',
    border: '1.5px solid',
    fontSize: '15px',
    fontWeight: '800',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  scoringNav: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
  },
  navBtn: {
    flex: 1,
    padding: '14px',
    background: 'transparent',
    border: '1px solid #1f3d2e',
    color: '#1f3d2e',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  finishBtn: {
    flex: 1,
    padding: '14px',
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderRadius: '2px',
  },
  reportHero: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '28px 24px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  reportDate: {
    fontSize: '11px',
    letterSpacing: '0.2em',
    color: '#8b8574',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  reportCourse: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f3d2e',
    margin: '0 0 20px',
  },
  bigScoreDisplay: {
    padding: '16px 0',
  },
  bigScoreNum: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '64px',
    fontWeight: '800',
    color: '#1f3d2e',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  bigScoreDiff: {
    fontSize: '18px',
    fontWeight: '600',
    marginTop: '4px',
  },
  bigScoreLabel: {
    fontSize: '11px',
    color: '#8b8574',
    letterSpacing: '0.15em',
    marginTop: '6px',
  },
  nineGrid: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '40px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #ebe4d3',
  },
  nineItem: {
    textAlign: 'center',
  },
  nineDivider: {
    width: '1px',
    height: '40px',
    background: '#ebe4d3',
  },
  nineLabel: {
    fontSize: '10px',
    letterSpacing: '0.25em',
    color: '#8b8574',
    fontWeight: '600',
    marginBottom: '4px',
  },
  nineValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '22px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.02em',
  },
  keyStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  statTile: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '16px 14px',
    textAlign: 'center',
  },
  tileLabel: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: '#8b8574',
    textTransform: 'uppercase',
    marginBottom: '6px',
    fontWeight: '600',
  },
  tileValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f3d2e',
    lineHeight: 1,
  },
  tileSub: {
    fontSize: '11px',
    color: '#8b8574',
    marginTop: '6px',
  },
  breakdownList: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '16px',
  },
  breakdownRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
  },
  breakdownLabel: {
    width: '70px',
    fontSize: '12px',
    color: '#3a3a3a',
    fontWeight: '500',
  },
  breakdownBarTrack: {
    flex: 1,
    height: '6px',
    background: '#f0ead9',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease-out',
  },
  breakdownCount: {
    width: '24px',
    textAlign: 'right',
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f3d2e',
  },
  scorecardWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scorecardTable: {
    background: '#fff',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  scorecardTableRow: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: '1px solid #ebe4d3',
    minHeight: '30px',
  },
  scorecardRowLabel: {
    width: '46px',
    flexShrink: 0,
    background: '#f5f0e6',
    borderRight: '1px solid #d4ccbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    letterSpacing: '0.1em',
    fontWeight: '700',
    color: '#6b6558',
  },
  scorecardRowLabelHeader: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '11px',
    letterSpacing: '0.15em',
  },
  scorecardTableCells: {
    display: 'grid',
    gridTemplateColumns: 'repeat(9, 1fr)',
    flex: 1,
    minWidth: 0,
  },
  scorecardHeaderCell: {
    padding: '6px 0',
    fontSize: '12px',
    fontWeight: '700',
    color: '#3a3a3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid #ebe4d3',
    minWidth: 0,
  },
  scorecardParCell: {
    padding: '5px 0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b6558',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid #ebe4d3',
    minWidth: 0,
  },
  scorecardScoreCell: {
    padding: '3px 2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid #ebe4d3',
    minWidth: 0,
  },
  scorecardPuttCell: {
    padding: '5px 0',
    fontSize: '11px',
    fontWeight: '600',
    color: '#8b8574',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '1px solid #ebe4d3',
    minWidth: 0,
  },
  scorecardTotalCell: {
    width: '58px',
    flexShrink: 0,
    background: '#f5f0e6',
    borderLeft: '1.5px solid #d4ccbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: '#1f3d2e',
    gap: '3px',
  },
  scorecardTotalHeader: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    fontSize: '10px',
    letterSpacing: '0.15em',
  },
  scorecardTotalDiff: {
    fontSize: '10px',
    fontWeight: '600',
    opacity: 0.75,
  },
  scorecardGrandTotal: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    borderRadius: '4px',
    padding: '14px 16px',
    textAlign: 'center',
  },
  scorecardGrandRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  scorecardGrandLabel: {
    fontSize: '10px',
    letterSpacing: '0.25em',
    color: '#a8c2a5',
    fontWeight: '700',
  },
  scorecardGrandValues: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: '8px',
  },
  scorecardGrandItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  scorecardGrandItemLabel: {
    fontSize: '9px',
    letterSpacing: '0.15em',
    color: '#a8c2a5',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scorecardGrandItemValue: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '20px',
    fontWeight: '700',
    color: '#f5f0e6',
    lineHeight: 1,
  },
  insightsList: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '6px 0',
  },
  insightRow: {
    display: 'flex',
    gap: '12px',
    padding: '14px 16px',
    borderBottom: '1px solid #f0ead9',
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: '18px',
  },
  insightText: {
    flex: 1,
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#3a3a3a',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyCard: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'stretch',
  },
  historyCardMain: {
    flex: 1,
    padding: '16px 18px',
    background: 'transparent',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
  },
  historyCardLeft: {
    flex: 1,
  },
  historyCourse: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f3d2e',
    marginBottom: '4px',
  },
  historyMeta: {
    fontSize: '12px',
    color: '#8b8574',
  },
  historyCardRight: {
    textAlign: 'right',
    marginLeft: '16px',
  },
  historyScore: {
    fontFamily: "'Noto Sans KR', sans-serif",
    fontSize: '24px',
    fontWeight: '800',
    color: '#1f3d2e',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  historyDiff: {
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '2px',
  },
  deleteBtn: {
    padding: '0 16px',
    background: 'transparent',
    borderLeft: '1px solid #ebe4d3',
    color: '#c04a3e',
    display: 'flex',
    alignItems: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f3d2e',
    marginBottom: '6px',
  },
  emptySub: {
    fontSize: '13px',
    color: '#8b8574',
  },
  trendChart: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '16px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '180px',
    overflowX: 'auto',
  },
  trendCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: '40px',
    height: '100%',
    position: 'relative',
  },
  trendValue: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#1f3d2e',
    marginBottom: '4px',
  },
  trendBar: {
    width: '18px',
    background: '#1f3d2e',
    borderRadius: '2px 2px 0 0',
    minHeight: '8px',
  },
  trendDate: {
    fontSize: '9px',
    color: '#8b8574',
    marginTop: '6px',
    textAlign: 'center',
  },

  // ===== BOTTOM TAB BAR =====
  tabBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#ffffff',
    borderTop: '1px solid #e4ddcc',
    boxShadow: '0 -2px 12px rgba(31, 61, 46, 0.06)',
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom, 0)',
  },
  tabBarInner: {
    maxWidth: '520px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
  },
  tabBarBtn: {
    background: 'transparent',
    border: 'none',
    padding: '10px 2px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    position: 'relative',
    cursor: 'pointer',
    transition: 'color 0.15s ease',
    minHeight: '56px',
  },
  tabBarBtnHome: {
    padding: '6px 2px 12px',
  },
  tabBarLabel: {
    fontSize: '9px',
    letterSpacing: '0.03em',
    lineHeight: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  tabBarActiveIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '28px',
    height: '3px',
    background: '#1f3d2e',
    borderRadius: '0 0 3px 3px',
  },

  // ===== INSIGHTS =====
  insightsBanner: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    borderRadius: '4px',
    padding: '18px 20px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  insightsBannerLabel: {
    fontSize: '10px',
    letterSpacing: '0.25em',
    color: '#a8c2a5',
    fontWeight: '700',
    marginBottom: '8px',
  },
  insightsBannerValue: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
    fontSize: '28px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  insightsBannerSub: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#a8c2a5',
    letterSpacing: '0.1em',
  },
  insightsBannerDot: {
    color: '#4a5e51',
    margin: '0 8px',
    fontSize: '20px',
  },

  // Style Card
  styleCard: {
    background: '#fff',
    border: '2px solid',
    borderRadius: '6px',
    padding: '20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  styleIconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#f5f0e6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  styleIconEmoji: {
    fontSize: '30px',
    lineHeight: 1,
  },
  styleContent: {
    flex: 1,
    minWidth: 0,
  },
  styleType: {
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '-0.01em',
    marginBottom: '4px',
    lineHeight: 1.2,
  },
  styleSubtitle: {
    fontSize: '12px',
    color: '#6b6558',
    fontWeight: '600',
    marginBottom: '10px',
    lineHeight: 1.4,
  },
  styleDescription: {
    fontSize: '12px',
    color: '#3a3a3a',
    lineHeight: 1.6,
  },
  styleMetrics: {
    display: 'flex',
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '12px 4px',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  styleMetric: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '0 4px',
    minWidth: 0,
  },
  styleMetricLabel: {
    fontSize: '9px',
    letterSpacing: '0.1em',
    color: '#8b8574',
    fontWeight: '700',
    textAlign: 'center',
  },
  styleMetricValue: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  styleMetricDivider: {
    width: '1px',
    height: '28px',
    background: '#ebe4d3',
    flexShrink: 0,
  },
  insightCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  insightCard: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderLeft: '3px solid',
    borderRadius: '3px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  insightCardBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#e8f0e3',
    color: '#1f5e3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '14px',
    flexShrink: 0,
  },
  insightCardContent: {
    flex: 1,
  },
  insightCardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1f3d2e',
    marginBottom: '4px',
  },
  insightCardDetail: {
    fontSize: '12px',
    color: '#6b6558',
    lineHeight: 1.5,
  },
  parAnalysis: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  parAnalysisRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #f0ead9',
    gap: '14px',
  },
  parAnalysisBadge: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    padding: '6px 10px',
    borderRadius: '2px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    minWidth: '52px',
    textAlign: 'center',
  },
  parAnalysisData: {
    flex: 1,
  },
  parAnalysisMain: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  parAnalysisStrokes: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.02em',
  },
  parAnalysisDiff: {
    fontSize: '13px',
    fontWeight: '700',
  },
  parAnalysisCount: {
    fontSize: '11px',
    color: '#8b8574',
    marginLeft: 'auto',
  },
  parAnalysisRates: {
    fontSize: '11px',
    color: '#6b6558',
    marginTop: '4px',
  },
  parAnalysisDot: {
    color: '#c8c0b0',
    margin: '0 6px',
  },
  paceCard: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '18px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  paceRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    flex: 1,
  },
  paceLabel: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: '#8b8574',
    fontWeight: '700',
  },
  paceValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.02em',
  },
  paceSub: {
    fontSize: '10px',
    color: '#8b8574',
    fontWeight: '500',
    marginLeft: '3px',
  },
  paceArrow: {
    fontSize: '28px',
    color: '#1f5e3a',
    fontWeight: '300',
    padding: '0 14px',
  },
  paceInsight: {
    padding: '12px 14px',
    background: '#f5f0e6',
    borderRadius: '3px',
    fontSize: '12px',
    color: '#3a3a3a',
    lineHeight: 1.5,
    textAlign: 'center',
  },

  // ===== MY BAG =====
  bagBanner: {
    background: '#1f3d2e',
    color: '#f5f0e6',
    borderRadius: '4px',
    padding: '18px 20px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  bagBannerIcon: {
    fontSize: '32px',
  },
  bagBannerLabel: {
    fontSize: '10px',
    letterSpacing: '0.25em',
    color: '#a8c2a5',
    fontWeight: '700',
    marginBottom: '4px',
  },
  bagBannerValue: {
    fontSize: '26px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  bagBannerSub: {
    fontSize: '11px',
    color: '#a8c2a5',
    fontWeight: '600',
    letterSpacing: '0.08em',
  },
  bagHint: {
    fontSize: '11px',
    color: '#8b8574',
    textAlign: 'center',
    marginBottom: '20px',
    fontStyle: 'italic',
  },
  // ===== CLUB CARD =====
  clubList: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  clubCard: {
    padding: '14px 16px',
    borderBottom: '1px solid #f0ead9',
  },
  clubCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  clubName: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.01em',
  },
  clubRunBadge: {
    background: '#f5f0e6',
    color: '#8b6f47',
    border: '1px solid #e0d6bc',
    padding: '3px 8px',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.03em',
  },
  clubFieldRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    gap: '12px',
  },
  clubFieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  clubFieldLabelMain: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#3a3a3a',
  },
  clubFieldLabelSub: {
    fontSize: '9px',
    letterSpacing: '0.12em',
    color: '#8b8574',
    fontWeight: '600',
  },
  clubStepper: {
    display: 'flex',
    alignItems: 'center',
    background: '#faf6ee',
    border: '1px solid #d4ccbb',
    borderRadius: '4px',
    overflow: 'hidden',
    height: '34px',
    flexShrink: 0,
  },
  clubStepperHighlight: {
    borderColor: '#1f3d2e',
    background: '#e8f0e3',
  },
  clubStepperValue: {
    minWidth: '80px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#1f3d2e',
    textAlign: 'center',
    lineHeight: 1,
    borderLeft: '1px solid #d4ccbb',
    borderRight: '1px solid #d4ccbb',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    background: '#fff',
    padding: '0 8px',
  },
  clubAvgNum: {
    fontSize: '15px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  clubAvgUnit: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#8b8574',
    letterSpacing: '0.05em',
  },

  // ===== DISTANCE CHART (DUAL BAR) =====
  distanceChartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '10px',
    fontSize: '11px',
    color: '#6b6558',
    fontWeight: '600',
  },
  distanceLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  distanceLegendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '2px',
  },
  distanceChart: {
    background: '#fff',
    border: '1px solid #ebe4d3',
    borderRadius: '3px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  distanceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  distanceLabel: {
    width: '62px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#3a3a3a',
    flexShrink: 0,
  },
  distanceBarTrack: {
    flex: 1,
    height: '18px',
    background: '#f0ead9',
    borderRadius: '3px',
    overflow: 'hidden',
    position: 'relative',
  },
  distanceBarFillTotal: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: '#1f3d2e',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  distanceBarFillCarry: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: '#a8c2a5',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
    zIndex: 1,
  },
  distanceValues: {
    width: '68px',
    textAlign: 'right',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0',
    lineHeight: 1.1,
  },
  distanceValueCarry: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#5e8a5f',
  },
  distanceValueTotal: {
    fontSize: '13px',
    fontWeight: '800',
    color: '#1f3d2e',
    letterSpacing: '-0.02em',
  },

  // ===== MODAL =====
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(31, 61, 46, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
    animation: 'modalFadeIn 0.2s ease-out',
  },
  modalCard: {
    background: '#fff',
    borderRadius: '8px',
    padding: '28px 24px 20px',
    width: '100%',
    maxWidth: '340px',
    textAlign: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    animation: 'modalSlideUp 0.25s ease-out',
  },
  modalIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: '800',
    color: '#1f3d2e',
    marginBottom: '8px',
    letterSpacing: '-0.01em',
  },
  modalText: {
    fontSize: '13px',
    color: '#6b6558',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
  },
  modalBtnCancel: {
    flex: 1,
    padding: '14px',
    background: '#f5f0e6',
    color: '#1f3d2e',
    fontSize: '13px',
    fontWeight: '700',
    borderRadius: '4px',
    letterSpacing: '0.02em',
  },
  modalBtnConfirm: {
    flex: 1,
    padding: '14px',
    background: '#c04a3e',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700',
    borderRadius: '4px',
    letterSpacing: '0.02em',
  },
};