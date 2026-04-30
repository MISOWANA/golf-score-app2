import React from 'react';
import { Plus, Download, Upload, LogOut } from 'lucide-react';
import styles from '../../styles/styles';
import RoundRow from './RoundRow';

export default function HomeView({ rounds, currentUser, onNewRound, onViewHistory, onViewStats, onSwitchUser, onExportData, onImportData, loading }) {
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
