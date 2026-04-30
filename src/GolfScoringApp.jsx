import React, { useState, useEffect } from 'react';
import { initDB, loadRoundsByUser, saveRound, deleteRound, getCurrentUser, setCurrentUser, exportUserData, importUserData } from './db.js';
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

      <BottomTabBar
        current={view}
        onChange={(tab) => setView(tab)}
      />
    </div>
  );
}
