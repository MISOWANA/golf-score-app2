import { Plus, PlayCircle, ShieldAlert } from 'lucide-react';
import styles from '../../styles/styles';
import { tintWash } from '../ui/tint.js';
import { holeNoOf, isNineHoleRound, roundKindLabel } from '../../engine/nines.js';
import InfoNote from '../ui/InfoNote';
import { TrendChip } from '../stats/widgets.jsx';
import { formatHandicap } from '../../engine/handicap.js';
import { backupMessage } from '../../engine/backupStatus.js';

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
  const holeNo = holeNoOf(round, Math.min(total - 1, round.currentHole ?? 0));
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
            {isNineHoleRound(round) ? `${roundKindLabel(round)} · ` : ''}{holeNo}번 홀 진행 중 · {round.players.join(', ')}
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

// 누적 라운드 · 평균 스코어 · 핸디캡. 핸디캡은 3라운드부터 — 그전에는 얼마나 더 필요한지 알려 준다.
export function StatsPanel({ loading, totalRounds, avgScore, handicap }) {
  const avgShown = !loading && avgScore !== '—';
  const cell = { ...styles.statCard, padding: '11px 12px 12px', minWidth: 0 };
  const hc = handicap ?? { index: null, delta: null, count: 0 };
  const hcSub = hc.index == null
    ? `${Math.max(1, 3 - hc.count)}라운드 더 쌓이면`
    : hc.delta == null ? '최근 20R 중 낮은 8R' : hc.delta === 0 ? '직전과 같아요' : `직전 대비 ${hc.delta > 0 ? '▲' : '▼'}${Math.abs(hc.delta).toFixed(1)}`;
  const hcColor = hc.index == null || hc.delta == null || hc.delta === 0 ? '#6e84a8' : hc.delta < 0 ? '#3db87a' : '#ef5350';
  return (
    <div style={{ ...styles.statsGrid, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} data-role="home-stats">
      <div style={cell}>
        <div style={styles.statLabel}>누적 라운드</div>
        <div style={styles.statValue}>
          {loading ? '—' : totalRounds}
          {!loading && <span style={styles.statUnit}>회</span>}
        </div>
      </div>
      <div style={{ ...cell, ...styles.statCardDivider }}>
        <div style={styles.statLabel}>평균 스코어</div>
        <div style={styles.statValue}>
          {loading ? '—' : avgScore}
          {avgShown && <span style={styles.statUnit}>타</span>}
        </div>
      </div>
      <div style={{ ...cell, ...styles.statCardDivider }} data-role="home-handicap">
        <div style={styles.statLabel}>
          핸디캡
          <InfoNote title="핸디캡 계산 방법">
            <p>일반적인 핸디캡(월드 핸디캡 시스템) 방식이에요. 최근 20라운드(18홀)의 차이값 중 낮은 8개를 평균 내요.</p>
            <p>코스 레이팅과 슬로프를 모르므로, 파를 스크래치 골퍼의 평균 스코어로 보고 계산한 간이 값이에요. 그래서 공식 핸디캡과는 조금 다를 수 있어요.</p>
            <p>한 홀은 파+5(핸디캡이 생긴 뒤에는 더블보기 수준)까지만 세고, 9홀 라운드는 넣지 않아요. 3라운드부터 계산해요.</p>
          </InfoNote>
        </div>
        <div style={styles.statValue} data-role="handicap-value">{loading ? '—' : formatHandicap(hc.index)}</div>
        <div style={{ fontSize: 12, color: hcColor, marginTop: 4, lineHeight: 1.35, wordBreak: 'keep-all' }} data-role="handicap-sub">{loading ? '' : hcSub}</div>
      </div>
    </div>
  );
}

// 마지막 백업이 없거나 오래됐을 때만 보이는 안내 (engine/backupStatus.js 의 기준)
export function BackupNudge({ status, onBackup, onSettings }) {
  if (status.level !== 'none' && status.level !== 'stale') return null;
  const tone = status.level === 'none' ? '#ef5350' : '#c9a228';
  return (
    <div data-role="home-backup-nudge" data-level={status.level} style={{ ...styles.liveCard, ...tintWash(tone, { strength: 0.1, border: 0.4 }) }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <ShieldAlert size={22} color={tone} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e8edf8' }}>{status.level === 'none' ? '백업해 두세요' : '백업할 때가 됐어요'}</div>
          <div style={{ fontSize: 14, color: '#a9b8d6', lineHeight: 1.55, marginTop: 2, wordBreak: 'keep-all' }}>{backupMessage(status)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="bb-press" type="button" data-role="nudge-backup" onClick={onBackup}
          style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: '1.5px solid transparent', background: tone, color: '#0b0e18', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>지금 백업</button>
        <button className="bb-press" type="button" data-role="nudge-settings" onClick={onSettings}
          style={{ flex: 1, padding: '11px 8px', borderRadius: 10, border: '1.5px solid #2c3a5c', background: 'transparent', color: '#e8edf8', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>자세히</button>
      </div>
    </div>
  );
}

// 내 폼 — 최근 5라운드 평균과 이전 5라운드 대비, 약점 · 강점 1순위. 누르면 스탯으로.
export function FormCard({ summary, onGoStats }) {
  if (!summary?.hasForm) return null;
  const { recent, weakest, strongest } = summary;
  return (
    <button type="button" className="bb-press" data-role="home-form" onClick={onGoStats}
      style={{ ...styles.liveCard, width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block', font: 'inherit', color: 'inherit' }}>
      <div style={{ ...styles.statLabel, marginBottom: 8 }}>내 폼</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13, color: '#8896b0', marginBottom: 2 }}>최근 {recent.n}라운드 평균</div>
          <div style={{ ...styles.statValue, fontSize: 24 }} data-role="form-avg">{recent.avg.toFixed(1)}<span style={styles.statUnit}>타</span></div>
        </div>
        <TrendChip delta={recent.delta} unit="타" goodWhen="down" digits={1} flat={1} label="이전 5R" id="home-form-trend" />
      </div>
      {(weakest || strongest) && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, paddingTop: 9, borderTop: '1px solid #1b2238', fontSize: 14 }}>
          {weakest && <span data-role="form-weakest" style={{ color: '#a9b8d6' }}>약점 <b style={{ color: '#ef5350' }}>{weakest.label}</b></span>}
          {strongest && <span data-role="form-strongest" style={{ color: '#a9b8d6' }}>강점 <b style={{ color: '#3db87a' }}>{strongest.label}</b></span>}
          <span style={{ color: '#6e84a8', marginLeft: 'auto' }}>스탯 보기 ›</span>
        </div>
      )}
    </button>
  );
}
