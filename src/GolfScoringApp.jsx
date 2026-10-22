import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  initDB, loadRoundsByUser, saveRound, deleteRound, exportUserData, importUserData,
  saveActiveRound, loadActiveRound, clearActiveRound,
  migrateProfiles, getCurrentProfile, loginByName, clearCurrentUser, listProfiles, userIdsOf, deleteProfile,
  requestPersistentStorage, migrateRoundData, migrateNineHoleRounds,
} from './db.js';
import { isValidRound, normalizeRound } from './engine/roundValidation.js';
import { fixPar3MissedGreenStrokes } from './engine/migrations.js';
import { convertPartialToNine } from './engine/nineConversion.js';
import ErrorBoundary from './components/common/ErrorBoundary';
import globalCSS from './styles/globalCSS';
import styles from './styles/styles';

import BottomTabBar from './components/layout/BottomTabBar';
import LoginView from './components/auth/LoginView';
import HomeView from './components/home/HomeView';
import SetupView from './components/setup/SetupView';
import ScoringView from './components/scoring/ScoringView';
import AnalysisView from './components/analysis/AnalysisView';
import HistoryView from './components/history/HistoryView';
import StatsView from './components/stats/StatsView';
import InsightsView from './components/insights/InsightsView';
import MyBagView from './components/mybag/MyBagView';
import { createRound } from './engine/newRound.js';
import { holeNoOf, isNineHoleRound, isFullRound, roundKindLabel } from './engine/nines.js';

export default function GolfScoringApp() {
  const [view, setView] = useState('login');
  // 화면을 떠나기 전에 확인이 필요하면(마이백의 저장 안 한 거리 변경) 그 화면이 여기에 등록한다.
  // 함수(proceed) → true 면 바로 떠나도 되고, false 면 그 화면이 확인 창을 띄운 뒤 proceed 를 직접 부른다.
  const leaveGuardRef = useRef(null);
  const registerLeaveGuard = useCallback((fn) => { leaveGuardRef.current = fn; }, []);
  const [currentUser, setCurrentUserState] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [profiles, setProfiles] = useState([]);   // 이 기기에 기록이 있는 사용자들 (로그인 화면용)
  // 이어하기 창에서 '기존 기록 삭제'를 한 번 눌러 확인을 기다리는 중
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // 형식이 깨진 라운드는 화면에 넘기지 않는다 (DB에서는 지우지 않음).
  // pars 가 없는 예전 백업은 홀의 파로 채워서 넘긴다 — 화면들이 round.pars 를 읽는다.
  const loadUserRounds = useCallback(async (user) => {
    try {
      const userRounds = await loadRoundsByUser(userIdsOf(user));
      const valid = userRounds.filter(isValidRound).map(normalizeRound);
      if (valid.length < userRounds.length) {
        console.warn(`형식이 맞지 않는 라운드 ${userRounds.length - valid.length}개를 제외했습니다`);
      }
      setRounds(valid);
    } catch (e) {
      console.error('Load rounds failed', e);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        requestPersistentStorage();
        // 예전 로그인 흔적(userId)들을 이름별 프로필로 묶는다. 실패해도 앱은 뜬다.
        try { await migrateProfiles(); } catch (e) { console.error('Profile migration failed', e); }
        // 파3 그린 놓친 홀 타수 누락 보정 (한 번만). 실패해도 앱은 뜨고 다음 실행 때 다시 한다.
        try {
          const fixed = await migrateRoundData(fixPar3MissedGreenStrokes);
          if (fixed > 0) console.info(`파3 타수 보정: ${fixed}개 홀`);
        } catch (e) { console.error('Round data migration failed', e); }
        // 예전에 '18홀 중 9홀만 입력'하고 끝낸 라운드를 9홀 라운드로 바꾼다 (한 번만 · 원본은 백업에 남는다)
        try {
          const converted = await migrateNineHoleRounds(convertPartialToNine);
          if (converted > 0) console.info(`9홀 라운드로 변환: ${converted}개`);
        } catch (e) { console.error('Nine-hole migration failed', e); }
        const user = await getCurrentProfile();
        if (user) {
          setCurrentUserState(user);
          const [, active] = await Promise.all([loadUserRounds(user), loadActiveRound(userIdsOf(user))]);
          if (active) {
            setCurrentRound(active);
          }
          setView('home');
        } else {
          setProfiles(await listProfiles());
          setView('login');
        }
      } catch (e) {
        console.error('Init failed', e);
        setView('login');
      }
      setLoading(false);
    };
    initApp();
  }, [loadUserRounds]);

  // 같은 이름이면 기존 프로필로 들어간다 — 로그아웃했다 다시 들어와도 기록이 그대로다.
  const handleUserLogin = async (userName) => {
    try {
      const user = await loginByName(userName);
      setCurrentUserState(user);
      const [, active] = await Promise.all([loadUserRounds(user), loadActiveRound(userIdsOf(user))]);
      setCurrentRound(active || null);
      setView('home');
    } catch (e) {
      console.error('Login failed', e);
    }
  };

  // 로그인 화면에서 사용자 삭제 — 그 사용자의 기록을 이 기기에서 모두 지운다.
  const handleDeleteProfile = async (profile) => {
    await deleteProfile(profile);
    setProfiles(await listProfiles());
  };

  const closeResumeModal = () => {
    setShowResumeModal(false);
    setConfirmDiscard(false);
  };

  const handleResumeRound = () => {
    closeResumeModal();
    setView('scoring');
  };

  const handleDiscardAndSetup = async () => {
    closeResumeModal();
    await clearActiveRound(userIdsOf(currentUser));
    setCurrentRound(null);
    setView('setup');
  };

  const handleNewRound = () => {
    if (currentRound) {
      setShowResumeModal(true);
    } else {
      setView('setup');
    }
  };

  // 로그아웃 — 기록과 진행 중인 라운드는 지우지 않는다. 같은 이름으로 다시
  // 들어오면 그대로 이어진다.
  const handleSwitchUser = async () => {
    try { await clearCurrentUser(); } catch (e) { console.error('Logout failed', e); }
    try { setProfiles(await listProfiles()); } catch { setProfiles([]); }
    setCurrentUserState(null);
    setRounds([]);
    setCurrentRound(null);
    setSelectedRoundId(null);
    setView('login');
  };

  // nine: null = 18홀 · 'out' = 전반 9홀 · 'in' = 후반 9홀 (engine/newRound.js)
  const startNewRound = (players, courseName, pars, outCourseName, inCourseName, teeBox, roundDate, clubRecommend, greenSpeed, nine = null) => {
    const newRound = createRound({
      id: Date.now().toString(), players, courseName, pars, outCourseName, inCourseName, teeBox,
      date: roundDate, clubRecommend, greenSpeed, nine,
    });
    setCurrentRound(newRound);
    saveActiveRound(currentUser.userId, newRound).catch(console.error);
    setView('scoring');
  };

  const updateRound = (updated) => {
    setCurrentRound(updated);
    if (currentUser) {
      saveActiveRound(currentUser.userId, updated).catch(console.error);
    }
  };

  // finalRound: ScoringView가 마지막 홀 스코어를 반영한 라운드 객체를 직접 넘겨준다.
  // currentRound state에만 의존하면 onUpdate(setCurrentRound) 직후 예약된 setTimeout
  // 콜백이 리렌더 이전 시점의 stale currentRound를 참조해 마지막 홀 데이터가 유실될 수 있다.
  const finishRound = async (finalRound) => {
    const source = finalRound || currentRound;
    // 한쪽 9홀만 입력하고 끝내면 9홀 라운드로 저장한다 (치지 않은 9홀을 파로 채운 18홀이 아니라)
    const finished = convertPartialToNine({ ...source, completed: true, finishedAt: new Date().toISOString() }).round;
    try {
      await saveRound(finished, currentUser.userId);
    } catch (e) {
      // 진행 중 라운드는 그대로 남아 있으므로 다시 완료를 누르면 된다.
      alert(`라운드를 저장하지 못했어요. 다시 시도해 주세요.\n${e?.message || ''}`);
      throw e;
    }
    await clearActiveRound(userIdsOf(currentUser));
    const updated = [finished, ...rounds.filter(r => r.id !== finished.id)];
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

  const updateCompletedRound = async (updatedRound) => {
    await saveRound(updatedRound, currentUser.userId);
    setRounds(prev => prev.map(r => r.id === updatedRound.id ? updatedRound : r));
  };

  const handleExportData = async () => {
    try {
      const exportedData = await exportUserData(currentUser);
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
      if (!file.name.endsWith('.json')) {
        throw new Error('JSON 파일만 가져올 수 있습니다');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('파일 크기가 너무 큽니다 (최대 10MB)');
      }

      const text = await file.text();
      const importedData = JSON.parse(text);

      if (!importedData.data || !Array.isArray(importedData.data.rounds)) {
        throw new Error('유효하지 않은 파일 형식입니다');
      }

      // 보정 전에 내보낸 예전 백업도 가져올 때 같은 보정을 거친다 (이미 고친 홀은 건너뛴다).
      // pars 가 없는 백업은 홀의 파로 채워 저장하고, '18홀 중 9홀만 입력'한 예전 라운드는 9홀 라운드로 바꿔 저장한다.
      let nineConverted = 0;
      const validRounds = importedData.data.rounds.filter(isValidRound)
        .map(normalizeRound)
        .map((r) => fixPar3MissedGreenStrokes(r).round)
        .map((r) => { const c = convertPartialToNine(r); nineConverted += c.changed; return c.round; });
      const skipped = importedData.data.rounds.length - validRounds.length;

      const sanitized = {
        ...importedData,
        data: { ...importedData.data, rounds: validRounds },
      };

      const { remapped } = await importUserData(currentUser.userId, sanitized, userIdsOf(currentUser));
      await loadUserRounds(currentUser);
      alert(`데이터를 가져왔습니다! (${validRounds.length}개 라운드)`
        + (skipped > 0 ? `\n형식이 맞지 않는 ${skipped}개는 건너뛰었습니다.` : '')
        + (nineConverted > 0 ? `\n9홀만 입력된 ${nineConverted}개는 9홀 라운드로 저장했습니다 (통계에서는 제외돼요).` : '')
        + (remapped > 0 ? `\n다른 사용자의 기록과 번호가 겹친 ${remapped}개는 그 기록을 건드리지 않고 사본으로 추가했습니다.` : ''));
    } catch (e) {
      console.error('Import failed', e);
      alert('데이터 가져오기 실패: ' + e.message);
    }
  };

  // 통계에 들어가는 라운드: 1인 · 18홀. 빠지는 라운드 수는 각 화면이 안내한다 (동반자 라운드와 9홀 라운드는 따로 센다)
  const statRounds = useMemo(() => rounds.filter(r => r.players.length === 1 && isFullRound(r)), [rounds]);
  const multiPlayerCount = rounds.filter(r => r.players.length > 1).length;
  const nineHoleCount = rounds.filter(r => r.players.length === 1 && isNineHoleRound(r)).length;

  // 이어하기 창에 보여 줄 '지금까지 입력한 홀 수'
  const enteredHoles = currentRound
    ? currentRound.holes.filter(h => currentRound.players.some(p => h.scores[p]?.touched)).length
    : 0;

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {/* 화면 하나가 오류를 내도 앱 전체가 멈추지 않게. 화면을 바꾸면 초기화된다. */}
      <ErrorBoundary key={view} onHome={currentUser ? () => setView('home') : null}>

      {view === 'login' && (
        <LoginView
          onLogin={handleUserLogin}
          onDeleteProfile={handleDeleteProfile}
          loading={loading}
          profiles={profiles}
        />
      )}

      {view === 'home' && currentUser && (
        <HomeView
          rounds={rounds}
          currentUser={currentUser}
          activeRound={currentRound}
          onNewRound={handleNewRound}
          onResume={handleResumeRound}
          onViewHistory={() => setView('history')}
          onSelectRound={(id) => { setSelectedRoundId(id); setView('analysis'); }}
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
          currentUser={currentUser}
        />
      )}

      {view === 'scoring' && currentRound && (
        <ScoringView
          round={currentRound}
          currentUser={currentUser}
          onUpdate={updateRound}
          onFinish={finishRound}
          onGoHome={() => setView('home')}
          onExit={async () => {
            await clearActiveRound(userIdsOf(currentUser));
            setCurrentRound(null);
            setView('home');
          }}
          onGoToSetup={async () => {
            await clearActiveRound(userIdsOf(currentUser));
            setCurrentRound(null);
            setView('setup');
          }}
        />
      )}

      {view === 'analysis' && (
        <AnalysisView
          round={rounds.find(r => r.id === selectedRoundId)}
          onBack={() => setView('home')}
          onGoHome={() => setView('home')}
          onGoHistory={() => setView('history')}
          onNewRound={handleNewRound}
          onUpdateRound={updateCompletedRound}
        />
      )}

      {view === 'history' && (
        <HistoryView
          rounds={rounds}
          userName={currentUser?.userName}
          onBack={() => setView('home')}
          onSelect={(id) => { setSelectedRoundId(id); setView('analysis'); }}
          onDelete={handleDeleteRound}
        />
      )}

      {/* 스탯·인사이트·마이백 실측은 1인으로 18홀을 끝낸 라운드만 집계한다. 동반자 라운드와 9홀 라운드는 뺀다 */}
      {view === 'stats' && (
        <StatsView
          rounds={statRounds}
          excludedCount={multiPlayerCount}
          nineExcludedCount={nineHoleCount}
          onBack={() => setView('home')}
        />
      )}

      {view === 'insights' && (
        <InsightsView
          rounds={statRounds}
          excludedCount={multiPlayerCount}
          nineExcludedCount={nineHoleCount}
          onBack={() => setView('home')}
        />
      )}

      {view === 'mybag' && currentUser && (
        <MyBagView
          currentUser={currentUser}
          rounds={statRounds}
          registerLeaveGuard={registerLeaveGuard}
          onBack={() => setView('home')}
        />
      )}

      </ErrorBoundary>

      {view !== 'scoring' && view !== 'login' && (
        <BottomTabBar
          current={view}
          onChange={(tab) => {
            if (tab !== view && leaveGuardRef.current?.(() => setView(tab)) === false) return;
            setView(tab);
          }}
        />
      )}

      {showResumeModal && currentRound && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '24px'
          }}
          onClick={closeResumeModal}
        >
          <div
            style={{
              background: '#0f1825', borderRadius: 16, padding: '28px 22px', textAlign: 'center',
              width: '100%', maxWidth: 340, border: '1px solid #1b2744', boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 26, marginBottom: 12 }}>⛳</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#e8edf8', marginBottom: 8 }}>
              진행 중인 라운드가 있어요
            </div>
            <div style={{ fontSize: 15, color: '#c9a228', fontWeight: 700, marginBottom: 4 }}>
              {currentRound.courseName}
            </div>
            <div style={{ fontSize: 14, color: '#8896b0', marginBottom: confirmDiscard ? 14 : 20 }}>
              {isNineHoleRound(currentRound) ? `${roundKindLabel(currentRound)} · ` : ''}{holeNoOf(currentRound, currentRound.currentHole)}번 홀 진행 중 · {currentRound.players.join(', ')}
            </div>
            {confirmDiscard ? (
              <>
                {/* 삭제는 되돌릴 수 없다 — 한 번 더 확인한다 */}
                <div role="alert" style={{ fontSize: 14, color: '#ef5350', background: 'rgba(239,83,80,0.08)', border: '1px solid rgba(239,83,80,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, lineHeight: 1.6 }}>
                  입력한 {enteredHoles}개 홀의 기록이 삭제돼요.<br />되돌릴 수 없어요.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  <button
                    onClick={() => setConfirmDiscard(false)}
                    style={{
                      flex: 1, padding: '13px 6px', wordBreak: 'keep-all', textWrap: 'balance', lineHeight: 1.35,
                      background: '#c9a228', color: '#0b0e18', border: '1.5px solid transparent',
                      borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer'
                    }}
                  >
                    돌아가기
                  </button>
                  <button
                    onClick={handleDiscardAndSetup}
                    style={{
                      flex: 1, padding: '13px 6px', wordBreak: 'keep-all', textWrap: 'balance', lineHeight: 1.35,
                      background: '#ef5350', color: '#fff', border: '1.5px solid transparent',
                      borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer'
                    }}
                  >
                    삭제하고 새 라운드
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <button
                  onClick={handleResumeRound}
                  style={{
                    flex: 1, padding: '13px 6px', wordBreak: 'keep-all', textWrap: 'balance', lineHeight: 1.35,
                    background: '#c9a228', color: '#0b0e18', border: '1.5px solid transparent',
                    borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: 'pointer'
                  }}
                >
                  이어서 기록하기
                </button>
                <button
                  onClick={() => setConfirmDiscard(true)}
                  style={{
                    flex: 1, padding: '13px 6px', wordBreak: 'keep-all', textWrap: 'balance', lineHeight: 1.35,
                    background: 'transparent', color: '#ef5350',
                    border: '1.5px solid rgba(239,83,80,0.5)', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  기존 기록 삭제하고 새 라운드
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
