import React, { useState, useRef } from 'react';
import { Plus, Download, Upload, LogOut, PlayCircle } from 'lucide-react';
import styles from '../../styles/styles';
import RoundRow from './RoundRow';

export default function HomeView({ rounds, currentUser, activeRound, onNewRound, onResume, onViewHistory, onViewStats, onSwitchUser, onExportData, onImportData, loading }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef(null);
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
              <div style={styles.brandName}>Birdie</div>
              <div style={styles.brandTagline}>Buddy</div>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              style={styles.actionButton}
              onClick={() => setShowExportConfirm(true)}
              title="데이터 백업 (내보내기)"
            >
              <Upload size={18} />
            </button>
            <button style={styles.actionButton} title="데이터 복원 (가져오기)" onClick={() => setShowImportConfirm(true)}>
              <Download size={18} />
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
            <span style={styles.userName}>{currentUser.userName}</span>
            <button style={styles.logoutButton} onClick={() => setShowLogoutConfirm(true)} title="다른 사용자로 로그인">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <div style={styles.dateLine}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
      </header>

      {activeRound && (
        <div style={{
          background: 'linear-gradient(135deg, #0e1c14 0%, #1a3028 100%)',
          borderRadius: '4px', padding: '16px 18px', marginBottom: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: '1px solid #1a3028',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: '#c9a228', fontWeight: 700, letterSpacing: '0.2em', marginBottom: '4px', textTransform: 'uppercase' }}>
              진행 중인 라운드
            </div>
            <div style={{ fontSize: '15px', color: '#e8edf8', fontWeight: 700, marginBottom: '2px' }}>
              {activeRound.courseName}
            </div>
            <div style={{ fontSize: '12px', color: '#8896b0' }}>
              {activeRound.currentHole + 1}홀 진행 중 · {activeRound.players.join(', ')}
            </div>
          </div>
          <button
            onClick={onResume}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'rgba(201,162,40,0.15)', color: '#c9a228',
              border: '1px solid rgba(201,162,40,0.5)',
              borderRadius: '4px', padding: '8px 14px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}
          >
            <PlayCircle size={15} />
            이어서
          </button>
        </div>
      )}

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
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button style={{ padding:'13px', borderRadius:10, border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:14, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowExportConfirm(false)}>취소</button>
              <button style={{ padding:'13px', borderRadius:10, border:'none', background:'#c9a228', color:'#0b0e18', fontSize:14, fontWeight:700, cursor:'pointer' }}
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
              ⚠️ 기존 데이터와 병합됩니다.<br/>잘못된 파일을 가져오면 데이터가<br/>손상될 수 있습니다.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button style={{ padding:'13px', borderRadius:10, border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:14, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowImportConfirm(false)}>취소</button>
              <button style={{ padding:'13px', borderRadius:10, border:'none', background:'#3db87a', color:'#0b0e18', fontSize:14, fontWeight:700, cursor:'pointer' }}
                onClick={() => { setShowImportConfirm(false); fileInputRef.current?.click(); }}>파일 선택</button>
            </div>
          </div>
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
              다른 사용자로 전환됩니다.
            </div>
            {activeRound && (
              <div style={{ fontSize:12, color:'#ef5350', textAlign:'center', background:'rgba(239,83,80,0.08)', border:'1px solid rgba(239,83,80,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:20, lineHeight:1.6 }}>
                ⚠️ 진행 중인 라운드가 있습니다.<br/>
                현재까지 기록한 데이터가<br/>저장되지 않을 수 있습니다.
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button
                style={{ padding:'13px', borderRadius:10, border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:14, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowLogoutConfirm(false)}>
                취소
              </button>
              <button
                style={{ padding:'13px', borderRadius:10, border:'none', background:'#ef5350', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}
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
