import { Plus, PlayCircle } from 'lucide-react';
import styles from '../../styles/styles';
import { tintWash } from '../ui/tint.js';

// 홈 화면의 카드들 — 새 라운드(항상 맨 위) · 진행 중인 라운드(바로 아래) · 요약.

// 그린과 깃발을 그린 배경 장식 (우측 상단). 글자 뒤에 깔리므로 흐리게.
function GreenMark() {
  return (
    <svg aria-hidden="true" width="120" height="120" viewBox="0 0 150 150"
      style={{ position: 'absolute', right: -24, top: -26, pointerEvents: 'none' }}>
      {[22, 38, 54, 70].map((r, i) => (
        <circle key={r} cx="75" cy="75" r={r} fill="none" stroke="#3db87a" strokeOpacity={0.2 - i * 0.04} strokeWidth="1" />
      ))}
      <line x1="75" y1="75" x2="75" y2="46" stroke="#c9a228" strokeOpacity="0.75" strokeWidth="1.5" />
      <path d="M75 46 L91 53 L75 60 Z" fill="#c9a228" fillOpacity="0.75" />
      <circle cx="75" cy="75" r="3.5" fill="#0b0e18" stroke="#c9a228" strokeOpacity="0.75" strokeWidth="1.5" />
    </svg>
  );
}

export function NewRoundCard({ onNewRound }) {
  return (
    <div style={styles.heroCard} data-role="home-new-round">
      <GreenMark />
      <h1 style={styles.heroTitle}>새 라운드</h1>
      <p style={styles.heroSub}>코스와 동반자를 고르고 바로 기록을 시작해요</p>
      <button className="bb-press" style={styles.heroButton} onClick={onNewRound}>
        <Plus size={18} strokeWidth={2.5} />
        <span>시작하기</span>
      </button>
    </div>
  );
}

export function ActiveRoundCard({ round, onResume }) {
  const total = round.holes?.length || 18;
  const current = Math.min(total, (round.currentHole ?? 0) + 1);
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ ...styles.liveCard, ...tintWash('#3db87a', { strength: 0.17, border: 0.38 }) }} data-role="home-active-round">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={styles.liveLabel}>
            <span className="bb-live-dot" style={styles.liveDot} />
            진행 중인 라운드
          </div>
          <div style={styles.liveCourse}>{round.courseName}</div>
          <div style={styles.liveMeta}>
            {current}홀 진행 중 · {round.players.join(', ')}
          </div>
        </div>
        <button className="bb-press" onClick={onResume} style={styles.liveResume}>
          <PlayCircle size={16} />
          이어서
        </button>
      </div>
      <div style={styles.liveTrack} role="progressbar" aria-label="라운드 진행률"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
        <div style={{ ...styles.liveFill, width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatsPanel({ loading, totalRounds, avgScore }) {
  const avgShown = !loading && avgScore !== '—';
  return (
    <div style={styles.statsGrid} data-role="home-stats">
      <div style={styles.statCard}>
        <div style={styles.statLabel}>누적 라운드</div>
        <div style={styles.statValue}>
          {loading ? '—' : totalRounds}
          {!loading && <span style={styles.statUnit}>회</span>}
        </div>
      </div>
      <div style={{ ...styles.statCard, ...styles.statCardDivider }}>
        <div style={styles.statLabel}>평균 스코어</div>
        <div style={styles.statValue}>
          {loading ? '—' : avgScore}
          {avgShown && <span style={styles.statUnit}>타</span>}
        </div>
      </div>
    </div>
  );
}
