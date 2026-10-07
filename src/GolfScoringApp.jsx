import React, { useState, useEffect } from 'react';
import {
  initDB, loadRoundsByUser, saveRound, deleteRound, exportUserData, importUserData,
  saveActiveRound, loadActiveRound, clearActiveRound,
  migrateProfiles, getCurrentProfile, loginByName, clearCurrentUser, listProfiles, userIdsOf,
  requestPersistentStorage,
} from './db.js';
import { isValidRound } from './engine/roundValidation.js';
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

export default function GolfScoringApp() {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUserState] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [profiles, setProfiles] = useState([]);   // 이 기기에 기록이 있는 사용자들 (로그인 화면용)

  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        requestPersistentStorage();
        // 예전 로그인 흔적(userId)들을 이름별 프로필로 묶는다. 실패해도 앱은 뜬다.
        try { await migrateProfiles(); } catch (e) { console.error('Profile migration failed', e); }
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
  }, []);

  // 형식이 깨진 라운드는 화면에 넘기지 않는다 (DB에서는 지우지 않음).
  const loadUserRounds = async (user) => {
    try {
      const userRounds = await loadRoundsByUser(userIdsOf(user));
      const valid = userRounds.filter(isValidRound);
      if (valid.length < userRounds.length) {
        console.warn(`형식이 맞지 않는 라운드 ${userRounds.length - valid.length}개를 제외했습니다`);
      }
      setRounds(valid);
    } catch (e) {
      console.error('Load rounds failed', e);
    }
  };

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

  const handleResumeRound = () => {
    setShowResumeModal(false);
    setView('scoring');
  };

  const handleDiscardAndSetup = async () => {
    setShowResumeModal(false);
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

  const startNewRound = (players, courseName, pars, outCourseName, inCourseName, teeBox, roundDate) => {
    const newRound = {
      id: Date.now().toString(),
      date: roundDate || new Date().toISOString(),
      courseName,
      outCourseName: outCourseName || 'OUT',
      inCourseName: inCourseName || 'IN',
      teeBox: teeBox || null,
      players,
      pars,
      holes: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: pars[i],
        scores: players.reduce((acc, p) => {
          acc[p] = {
            strokes: pars[i],
            putts: 2,
            fairway: null,
            fairwayHit: null,
            shotShape: null,
            ob: 0,
            hazard: 0,
            gir: true,
            girAuto: true,
            greenMiss: null,
            memo: '',
            touched: false
          };
          return acc;
        }, {})
      })),
      currentHole: 0,
      completed: false
    };
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
    const finished = { ...source, completed: true, finishedAt: new Date().toISOString() };
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

      const validRounds = importedData.data.rounds.filter(isValidRound);
      const skipped = importedData.data.rounds.length - validRounds.length;

      const sanitized = {
        ...importedData,
        data: { ...importedData.data, rounds: validRounds },
      };

      await importUserData(currentUser.userId, sanitized);
      await loadUserRounds(currentUser);
      alert(`데이터를 가져왔습니다! (${validRounds.length}개 라운드)`
        + (skipped > 0 ? `\n형식이 맞지 않는 ${skipped}개는 건너뛰었습니다.` : ''));
    } catch (e) {
      console.error('Import failed', e);
      alert('데이터 가져오기 실패: ' + e.message);
    }
  };

  return (
    <div style={styles.app}>
      <style>{globalCSS}</style>

      {/* 화면 하나가 오류를 내도 앱 전체가 멈추지 않게. 화면을 바꾸면 초기화된다. */}
      <ErrorBoundary key={view} onHome={currentUser ? () => setView('home') : null}>

      {view === 'login' && (
        <LoginView
          onLogin={handleUserLogin}
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
          currentUser={currentUser}
        />
      )}

      {view === 'scoring' && currentRound && (
        <ScoringView
          round={currentRound}
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
          onNewRound={() => setView('setup')}
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

      {view === 'stats' && (
        <StatsView
          rounds={rounds.filter(r => r.players.length === 1)}
          excludedCount={rounds.filter(r => r.players.length > 1).length}
          onBack={() => setView('home')}
        />
      )}

      {view === 'insights' && (
        <InsightsView
          rounds={rounds.filter(r => r.players.length === 1)}
          excludedCount={rounds.filter(r => r.players.length > 1).length}
          onBack={() => setView('home')}
        />
      )}

      {view === 'mybag' && currentUser && (
        <MyBagView
          currentUser={currentUser}
          onBack={() => setView('home')}
        />
      )}

      </ErrorBoundary>

      {view !== 'scoring' && view !== 'login' && (
        <BottomTabBar
          current={view}
          onChange={(tab) => setView(tab)}
        />
      )}

      {showResumeModal && currentRound && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '24px'
          }}
          onClick={() => setShowResumeModal(false)}
        >
          <div
            style={{
              background: '#0f1825', borderRadius: 16, padding: '28px 22px', textAlign: 'center',
              width: '100%', maxWidth: 320, border: '1px solid #1b2744', boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 26, marginBottom: 12 }}>⛳</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e8edf8', marginBottom: 8 }}>
              진행 중인 라운드가 있어요
            </div>
            <div style={{ fontSize: 14, color: '#c9a228', fontWeight: 700, marginBottom: 4 }}>
              {currentRound.courseName}
            </div>
            <div style={{ fontSize: 13, color: '#8896b0', marginBottom: 20 }}>
              {currentRound.currentHole + 1}홀 진행 중 · {currentRound.players.join(', ')}
            </div>
            <button
              onClick={handleResumeRound}
              style={{
                width: '100%', padding: '13px', marginBottom: 8,
                background: '#c9a228', color: '#0b0e18', border: 'none',
                borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer'
              }}
            >
              이어서 기록하기
            </button>
            <button
              onClick={handleDiscardAndSetup}
              style={{
                width: '100%', padding: '13px',
                background: 'transparent', color: '#ef5350',
                border: '1.5px solid rgba(239,83,80,0.5)', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}
            >
              기존 기록 삭제하고 새 라운드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
