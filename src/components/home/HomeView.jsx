import { useState, useRef } from 'react';
import { Settings, LogOut } from 'lucide-react';
import styles from '../../styles/styles';
import RoundRow from './RoundRow';
import { NewRoundCard, ActiveRoundCard, StatsPanel, BackupNudge, FormCard, FirstRunGuide } from './HomeCards';
import { myPlayer } from '../../engine/players.js';
import { isFullRound } from '../../engine/nines.js';
import { nowMs } from '../../engine/clock.js';
import { backupStatus } from '../../engine/backupStatus.js';
import GoalsCard from '../goals/GoalsCard';
import { hardRefresh } from '../../platform/hardRefresh.js';
import { readNudgeSnooze, snoozeNudge, isNudgeSnoozed } from '../../platform/nudgeSnooze.js';

// 홈 — 새 라운드(진행 중인 라운드가 없을 때 맨 위) · 진행 중인 라운드(있으면 맨 위 주인공) · 백업 안내(필요할 때만) · 누적/평균/핸디캡 · 내 폼 · 최근 라운드.
//   onOpenSettings  설정(백업·기기 옮기기) 화면
//   onBackup        백업 파일을 바로 만든다 (백업 안내의 "지금 백업")
//   summary         engine/homeSummary.js 의 buildHomeSummary 결과
//   goals · goalRounds · onOpenGoal  다음 라운드 목표 카드 (판정에 쓰는 라운드, 목표 시트 열기)
export default function HomeView({ rounds, currentUser, activeRound, onNewRound, onResume, onViewHistory, onSelectRound, onSwitchUser, onOpenSettings, onBackup, onGoStats, onGoBag, backupMeta, summary, goals = [], goalRounds = [], onOpenGoal, loading }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hardRefreshing, setHardRefreshing] = useState(false);
  const [nudgeUntil, setNudgeUntil] = useState(() => readNudgeSnooze(currentUser.userId));   // 백업 안내를 숨기는 중이면 끝나는 시각
  const logoClickRef = useRef({ count: 0, lastAt: 0 });
  const recentRound = rounds[0];
  const totalRounds = rounds.length;
  const bStatus = backupStatus(backupMeta, totalRounds);

  // 로고 3연속 클릭(700ms 이내) → 강력 새로고침. 배포 후 폰 브라우저가 이전
  // 번들을 그대로 들고 있을 때(캐시) 사용자가 스스로 최신 버전을 받게 하는 탈출구.
  const handleLogoClick = () => {
    const now = nowMs();
    const prev = logoClickRef.current;
    logoClickRef.current = { count: now - prev.lastAt < 700 ? prev.count + 1 : 1, lastAt: now };
    if (logoClickRef.current.count < 3) return;
    logoClickRef.current = { count: 0, lastAt: 0 };
    setHardRefreshing(true);
    hardRefresh(now);
  };

  // 평균 스코어는 18홀 라운드만 — 9홀 점수가 섞이면 평균이 반토막이 된다
  const fullRounds = rounds.filter(isFullRound);
  const avgScore = fullRounds.length > 0
    ? (fullRounds.reduce((sum, r) => {
        const me = myPlayer(r, currentUser.userName);
        const total = r.holes.reduce((s, h) => s + (h.scores[me]?.strokes || 0), 0);
        return sum + total;
      }, 0) / fullRounds.length).toFixed(1)
    : '—';

  return (
    <div style={{ ...styles.container, paddingTop: 14 }}>
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
            <button className="bb-press" style={styles.actionButton} data-role="open-settings" onClick={onOpenSettings}
              title="설정 · 백업" aria-label="설정 · 백업">
              <Settings size={16} />
            </button>
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

      {/* 진행 중인 라운드가 있으면 "이어서"가 주인공(맨 위 큰 카드), 새 라운드는 그 아래 보조 카드. 없으면 새 라운드가 맨 위 */}
      {activeRound
        ? (<>
          <ActiveRoundCard round={activeRound} onResume={onResume} prominent />
          <NewRoundCard onNewRound={onNewRound} compact />
        </>)
        : <NewRoundCard onNewRound={onNewRound} />}

      {!loading && !isNudgeSnoozed(nudgeUntil, nowMs()) && (
        <BackupNudge status={bStatus} onBackup={onBackup} onSettings={onOpenSettings} onSnooze={() => setNudgeUntil(snoozeNudge(currentUser.userId, nowMs()))} />
      )}

      <StatsPanel loading={loading} totalRounds={totalRounds} avgScore={avgScore} handicap={summary?.handicap} />

      {/* 처음 쓰는 사람에게: 빈 화면 대신 다음에 할 일 3가지 */}
      {!loading && totalRounds === 0 && !activeRound && <FirstRunGuide onGoBag={onGoBag} onNewRound={onNewRound} onSettings={onOpenSettings} />}

      {!loading && <FormCard summary={summary} onGoStats={onGoStats} />}

      {!loading && onOpenGoal && <GoalsCard goals={goals} rounds={goalRounds} hasRounds={rounds.length > 0} onOpen={onOpenGoal} />}

      {recentRound && (
        <div style={{ ...styles.section, marginBottom: 0 }}>
          <div style={styles.homeSectionHeader}>
            <div style={styles.homeSectionTitle}>최근 라운드</div>
            <button style={styles.textLink} onClick={onViewHistory}>전체보기</button>
          </div>
          {/* 눌러서 그 라운드의 리포트를 바로 연다 (예전에는 히스토리 목록으로 갔다) */}
          <RoundRow round={recentRound} userName={currentUser.userName} onClick={() => (onSelectRound ? onSelectRound(recentRound.id) : onViewHistory())} />
        </div>
      )}

      {hardRefreshing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,14,24,0.92)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, zIndex:10000 }}>
          <div style={{ fontSize:32 }}>⛳</div>
          <div style={{ fontSize:15, color:'#c9a228', fontWeight:700 }}>강력 새로고침 중...</div>
        </div>
      )}

      {showLogoutConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'24px' }}
          onClick={() => setShowLogoutConfirm(false)}>
          <div style={{ background:'#0f1825', borderRadius:16, padding:'28px 22px', width:'100%', maxWidth:320, border:'1px solid #1b2744', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:26, textAlign:'center', marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:17, fontWeight:800, color:'#e8edf8', textAlign:'center', marginBottom:8 }}>사용자 전환하시겠어요?</div>
            <div style={{ fontSize:14, color:'#8896b0', textAlign:'center', lineHeight:1.6, marginBottom: activeRound ? 6 : 20 }}>
              기록은 이 기기에 그대로 남아요.<br/>같은 이름으로 다시 들어오면 이어집니다.
            </div>
            {activeRound && (
              <div style={{ fontSize:14, color:'#ef5350', textAlign:'center', background:'rgba(239,83,80,0.08)', border:'1px solid rgba(239,83,80,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:20, lineHeight:1.6 }}>
                진행 중인 라운드도 보관돼요.<br/>
                다시 로그인하면 이어서 기록할 수 있어요.
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button
                style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid #252f4a', background:'transparent', color:'#e8edf8', fontSize:15, fontWeight:600, cursor:'pointer' }}
                onClick={() => setShowLogoutConfirm(false)}>
                취소
              </button>
              <button
                style={{ flex:1, padding:'13px 8px', borderRadius:10, wordBreak:'keep-all', textWrap:'balance', border:'1.5px solid transparent', background:'#ef5350', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer' }}
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
