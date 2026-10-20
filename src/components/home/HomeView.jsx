import React, { useState, useRef } from 'react';
import { Download, Upload, LogOut } from 'lucide-react';
import styles from '../../styles/styles';
import RoundRow from './RoundRow';
import { NewRoundCard, ActiveRoundCard, StatsPanel } from './HomeCards';
import { myPlayer } from '../../engine/players.js';

export default function HomeView({ rounds, currentUser, activeRound, onNewRound, onResume, onViewHistory, onViewStats, onSwitchUser, onExportData, onImportData, loading }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [hardRefreshing, setHardRefreshing] = useState(false);
  const fileInputRef = useRef(null);
  const logoClickRef = useRef({ count: 0, lastAt: 0 });
  const recentRound = rounds[0];
  const totalRounds = rounds.length;

  // 로고 3연속 클릭(700ms 이내) → 강력 새로고침. 배포 후 폰 브라우저가 이전
  // 번들을 그대로 들고 있을 때(캐시) 사용자가 스스로 최신 버전을 받게 하는 탈출구.
  const handleLogoClick = async () => {
    const now = Date.now();
    const prev = logoClickRef.current;
    logoClickRef.current = { count: now - prev.lastAt < 700 ? prev.count + 1 : 1, lastAt: now };
    if (logoClickRef.current.count < 3) return;
    logoClickRef.current = { count: 0, lastAt: 0 };
    hardRefresh();
  };

  const hardRefresh = async () => {
    const now = Date.now();
    setHardRefreshing(true);
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) { /* 캐시 API 미지원 환경은 무시 */ }
    const url = new URL(window.location.href);
    url.searchParams.set('_r', now.toString());
    window.location.replace(url.toString());
  };

  const avgScore = rounds.length > 0
    ? (rounds.reduce((sum, r) => {
        const me = myPlayer(r, currentUser.userName);
        const total = r.holes.reduce((s, h) => s + (h.scores[me]?.strokes || 0), 0);
        return sum + total;
      }, 0) / rounds.length).toFixed(1)
    : '—';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logo}>
            <div style={{ ...styles.logoMark, cursor: 'pointer' }} onClick={handleLogoClick} title="3번 연속 클릭하면 강력 새로고침">⛳</div>
            <div>
              <div style={styles.brandName}>Birdie</div>
              <div style={styles.brandTagline}>Buddy</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              className="bb-press"
              style={styles.actionButton}
              onClick={() => setShowExportConfirm(true)}
              title="데이터 백업 (내보내기)"
              aria-label="데이터 백업 (내보내기)"
            >
              <Upload size={16} />
            </button>
            <button className="bb-press" style={styles.actionButton} title="데이터 복원 (가져오기)" aria-label="데이터 복원 (가져오기)" onClick={() => setShowImportConfirm(true)}>
              <Download size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files[0]) {
                  onImportData(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <div style={styles.userChip}>
              <span style={styles.userName}>{currentUser.userName}</span>
              <button style={styles.logoutButton} onClick={() => setShowLogoutConfirm(true)} title="다른 사용자로 로그인" aria-label="다른 사용자로 로그인">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
        <div style={styles.dateRow}>
          <div style={styles.dateLine}>
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          {/* 배포된 버전 확인용 — 마지막 커밋 시각(KST). vite.config.js 의 appVersion */}
          <span style={styles.versionTag}>{__APP_VERSION__}</span>
        </div>
      </header>

      {/* 새 라운드는 항상 맨 위에 고정 — 진행 중인 라운드는 그 아래 */}
      <NewRoundCard onNewRound={onNewRound} />

      {activeRound && <ActiveRoundCard round={activeRound} onResume={onResume} />}

      <StatsPanel loading={loading} totalRounds={totalRounds} avgScore={avgScore} />

      {recentRound && (
        <div style={styles.section}>
          <div style={styles.homeSectionHeader}>
            <div style={styles.homeSectionTitle}>최근 라운드</div>
            <button style={styles.textLink} onClick={onViewHistory}>전체보기</button>
          </div>
          <RoundRow round={recentRound} userName={currentUser.userName} onClick={() => { onViewHistory(); }} />
        </div>
      )}

      {showExportConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'24px' }}
          onClick={() => setShowExportConfirm(false)}>
          <div style={{ background:'#0f1825', borderRadius:16, padding:'28px 22px', width:'100%', maxWidth:320, border:'1px solid #1b2744', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:26, textAlign:'center', marginBottom:12 }}>💾</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#e8edf8', textAlign:'center', marginBottom:8 }}>데이터 내보내기</div>
            <div style={{ fontSize:13, color:'#8896b0', textAlign:'center', lineHeight:1.6, marginBottom:20 }}>
              현재까지 저장된 모든 라운드 데이터를<br/>JSON 파일로 내보냅니다.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:14, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowExportConfirm(false)}>취소</button>
              <button style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid transparent', background:'#c9a228', color:'#0b0e18', fontSize:14, fontWeight:700, cursor:'pointer' }}
                onClick={() => { setShowExportConfirm(false); onExportData(); }}>내보내기</button>
            </div>
          </div>
        </div>
      )}

      {showImportConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'24px' }}
          onClick={() => setShowImportConfirm(false)}>
          <div style={{ background:'#0f1825', borderRadius:16, padding:'28px 22px', width:'100%', maxWidth:320, border:'1px solid #1b2744', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:26, textAlign:'center', marginBottom:12 }}>📂</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#e8edf8', textAlign:'center', marginBottom:8 }}>데이터 가져오기</div>
            <div style={{ fontSize:13, color:'#8896b0', textAlign:'center', lineHeight:1.6, marginBottom:8 }}>
              JSON 백업 파일에서 데이터를 복원합니다.
            </div>
            <div style={{ fontSize:12, color:'#ef5350', textAlign:'center', background:'rgba(239,83,80,0.08)', border:'1px solid rgba(239,83,80,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:20, lineHeight:1.6 }}>
              기존 기록은 지우지 않고 합칩니다.<br/>같은 라운드는 파일 내용으로 바뀌어요.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:14, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowImportConfirm(false)}>취소</button>
              <button style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid transparent', background:'#3db87a', color:'#0b0e18', fontSize:14, fontWeight:700, cursor:'pointer' }}
                onClick={() => { setShowImportConfirm(false); fileInputRef.current?.click(); }}>파일 선택</button>
            </div>
          </div>
        </div>
      )}

      {hardRefreshing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,14,24,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, zIndex:10000 }}>
          <div style={{ fontSize:32 }}>⛳</div>
          <div style={{ fontSize:14, color:'#c9a228', fontWeight:700 }}>강력 새로고침 중...</div>
        </div>
      )}

      {showLogoutConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'24px' }}
          onClick={() => setShowLogoutConfirm(false)}>
          <div style={{ background:'#0f1825', borderRadius:16, padding:'28px 22px', width:'100%', maxWidth:320, border:'1px solid #1b2744', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:26, textAlign:'center', marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#e8edf8', textAlign:'center', marginBottom:8 }}>사용자 전환하시겠어요?</div>
            <div style={{ fontSize:13, color:'#8896b0', textAlign:'center', lineHeight:1.6, marginBottom: activeRound ? 6 : 20 }}>
              기록은 이 기기에 그대로 남아요.<br/>같은 이름으로 다시 들어오면 이어집니다.
            </div>
            {activeRound && (
              <div style={{ fontSize:12, color:'#ef5350', textAlign:'center', background:'rgba(239,83,80,0.08)', border:'1px solid rgba(239,83,80,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:20, lineHeight:1.6 }}>
                진행 중인 라운드도 보관돼요.<br/>
                다시 로그인하면 이어서 기록할 수 있어요.
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button
                style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:14, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowLogoutConfirm(false)}>
                취소
              </button>
              <button
                style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid transparent', background:'#ef5350', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}
                onClick={() => { setShowLogoutConfirm(false); onSwitchUser(); }}>
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
