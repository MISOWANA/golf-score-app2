import React, { useState, useEffect } from 'react';
import { initDB, loadRoundsByUser, saveRound, deleteRound, getCurrentUser, setCurrentUser, exportUserData, importUserData, saveActiveRound, loadActiveRound, clearActiveRound } from './db.js';
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

  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        const user = await getCurrentUser();
        if (user) {
          setCurrentUserState(user);
          await loadUserRounds(user.userId);
          const active = await loadActiveRound(user.userId);
          if (active) {
            setCurrentRound(active);
          }
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

  const handleResumeRound = () => {
    setShowResumeModal(false);
    setView('scoring');
  };

  const handleDiscardAndSetup = async () => {
    setShowResumeModal(false);
    await clearActiveRound(currentUser.userId);
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

  const handleSwitchUser = () => {
    setCurrentUserState(null);
    setRounds([]);
    setCurrentRound(null);
    setSelectedRoundId(null);
    setView('login');
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
          acc[p] = {
            strokes: pars[i],
            putts: 2,
            fairway: pars[i] > 3 ? true : null,
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

  const finishRound = async () => {
    const finished = { ...currentRound, completed: true, finishedAt: new Date().toISOString() };
    await saveRound(finished, currentUser.userId);
    await clearActiveRound(currentUser.userId);
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
        />
      )}

      {view === 'scoring' && currentRound && (
        <ScoringView
          round={currentRound}
          onUpdate={updateRound}
          onFinish={finishRound}
          onExit={async () => {
            await clearActiveRound(currentUser.userId);
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

      <BottomTabBar
        current={view}
        onChange={(tab) => setView(tab)}
      />

      {showResumeModal && currentRound && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '28px 24px',
            width: '100%', maxWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a2e1a', marginBottom: '8px' }}>
              진행 중인 라운드가 있어요
            </div>
            <div style={{ fontSize: '14px', color: '#5a6a5a', marginBottom: '6px' }}>
              {currentRound.courseName}
            </div>
            <div style={{ fontSize: '13px', color: '#8a9a8a', marginBottom: '24px' }}>
              {currentRound.currentHole + 1}홀 진행 중 · {currentRound.players.join(', ')}
            </div>
            <button
              onClick={handleResumeRound}
              style={{
                width: '100%', padding: '14px', marginBottom: '10px',
                background: '#1f5e3a', color: '#fff', border: 'none',
                borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              이어서 기록하기
            </button>
            <button
              onClick={handleDiscardAndSetup}
              style={{
                width: '100%', padding: '14px',
                background: 'transparent', color: '#c04a3e',
                border: '1.5px solid #c04a3e', borderRadius: '10px',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              새 라운딩 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
