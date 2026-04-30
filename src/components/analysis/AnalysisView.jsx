import React, { useState } from 'react';
import { ChevronLeft, Home, BookOpen } from 'lucide-react';
import styles from '../../styles/styles';
import StatTile from './StatTile';
import BreakdownBar from './BreakdownBar';
import ScorecardTable from './ScorecardTable';
import Insights from './Insights';

export default function AnalysisView({ round, onBack, onGoHome, onGoHistory, onNewRound }) {
  if (!round) return null;

  const calculateStats = (player) => {
    const holes = round.holes;
    const total = holes.reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const totalPar = round.pars.reduce((a, b) => a + b, 0);
    const totalPutts = holes.reduce((s, h) => s + (h.scores[player]?.putts || 0), 0);
    const girHoles = holes.filter(h => h.scores[player]?.gir === true).length;
    const par4or5 = holes.filter(h => h.par > 3);
    const fairwaysHit = par4or5.filter(h => h.scores[player]?.fairway === true).length;
    const fairwayTotal = par4or5.length;

    const birdies = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par === -1).length;
    const eagles = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par <= -2).length;
    const pars = holes.filter(h => h.scores[player]?.strokes === h.par).length;
    const bogeys = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par === 1).length;
    const doubles = holes.filter(h => h.scores[player]?.strokes && h.scores[player].strokes - h.par >= 2).length;

    const front9 = holes.slice(0, 9).reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);
    const back9 = holes.slice(9).reduce((s, h) => s + (h.scores[player]?.strokes || 0), 0);

    return {
      total, totalPar, diff: total - totalPar, totalPutts,
      girHoles, girPct: ((girHoles / 18) * 100).toFixed(0),
      fairwaysHit, fairwayTotal, fairwayPct: fairwayTotal > 0 ? ((fairwaysHit / fairwayTotal) * 100).toFixed(0) : 0,
      birdies, eagles, pars, bogeys, doubles,
      avgPutts: (totalPutts / 18).toFixed(1),
      front9, back9
    };
  };

  const [activePlayer, setActivePlayer] = useState(round.players[0]);
  const stats = calculateStats(activePlayer);

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Round Report</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.reportHero}>
        <div style={styles.reportDate}>
          {new Date(round.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <h2 style={styles.reportCourse}>{round.courseName}</h2>

        {round.players.length > 1 && (
          <div style={styles.playerTabs}>
            {round.players.map(p => (
              <button
                key={p}
                style={{
                  ...styles.playerTab,
                  background: activePlayer === p ? '#f5f0e6' : 'transparent',
                  color: activePlayer === p ? '#1f3d2e' : '#6b6558',
                  borderColor: activePlayer === p ? '#1f3d2e' : 'transparent'
                }}
                onClick={() => setActivePlayer(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div style={styles.bigScoreDisplay}>
          <div style={styles.bigScoreNum}>{stats.total}</div>
          <div style={{ ...styles.bigScoreDiff, color: stats.diff > 0 ? '#c04a3e' : stats.diff < 0 ? '#1f5e3a' : '#4a4a4a' }}>
            {stats.diff > 0 ? `+${stats.diff}` : stats.diff === 0 ? 'Even' : stats.diff}
          </div>
          <div style={styles.bigScoreLabel}>vs par {stats.totalPar}</div>
        </div>

        <div style={styles.nineGrid}>
          <div style={styles.nineItem}>
            <div style={styles.nineLabel}>FRONT 9</div>
            <div style={styles.nineValue}>{stats.front9}</div>
          </div>
          <div style={styles.nineDivider} />
          <div style={styles.nineItem}>
            <div style={styles.nineLabel}>BACK 9</div>
            <div style={styles.nineValue}>{stats.back9}</div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>KEY STATS</div>
        <div style={styles.keyStatsGrid}>
          <StatTile label="GIR" value={`${stats.girPct}%`} sub={`${stats.girHoles}/18 holes`} />
          <StatTile label="Fairways" value={`${stats.fairwayPct}%`} sub={`${stats.fairwaysHit}/${stats.fairwayTotal}`} />
          <StatTile label="Avg Putts" value={stats.avgPutts} sub={`${stats.totalPutts} total`} />
          <StatTile label="Birdies+" value={stats.birdies + stats.eagles} sub={`${stats.eagles} eagle`} />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE BREAKDOWN</div>
        <div style={styles.breakdownList}>
          <BreakdownBar label="Eagle+" count={stats.eagles} total={18} color="#d97706" />
          <BreakdownBar label="Birdie" count={stats.birdies} total={18} color="#1f5e3a" />
          <BreakdownBar label="Par" count={stats.pars} total={18} color="#4a4a4a" />
          <BreakdownBar label="Bogey" count={stats.bogeys} total={18} color="#8b6f47" />
          <BreakdownBar label="Double+" count={stats.doubles} total={18} color="#c04a3e" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>HOLE BY HOLE</div>
        <ScorecardTable round={round} player={activePlayer} />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>INSIGHTS</div>
        <Insights stats={stats} round={round} player={activePlayer} />
      </div>

      {(() => {
        const memoedHoles = round.holes.filter(h => h.scores[activePlayer]?.memo);
        if (memoedHoles.length === 0) return null;
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>NOTES · 홀별 메모 ({memoedHoles.length})</div>
            <div style={styles.notesList}>
              {memoedHoles.map(h => {
                const ps = h.scores[activePlayer];
                const diff = ps.strokes - h.par;
                const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
                const diffColor = diff <= -1 ? '#1f5e3a' : diff === 0 ? '#3a3a3a' : diff === 1 ? '#8b6f47' : '#c04a3e';
                return (
                  <div key={h.holeNumber} style={styles.noteCard}>
                    <div style={styles.noteCardHeader}>
                      <div style={styles.noteCardHole}>
                        HOLE {h.holeNumber}
                        <span style={styles.noteCardPar}>PAR {h.par}</span>
                      </div>
                      <div style={{ ...styles.noteCardScore, color: diffColor }}>
                        {ps.strokes}타 ({diffLabel})
                      </div>
                    </div>
                    <div style={styles.noteCardBody}>{ps.memo}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={styles.reportActions}>
        <button style={styles.primaryButton} onClick={onNewRound}>
          새 라운드 시작
        </button>
        <div style={styles.reportActionRow}>
          <button style={styles.secondaryButton} onClick={onGoHome}>
            <Home size={16} /> 홈으로
          </button>
          <button style={styles.secondaryButton} onClick={onGoHistory}>
            <BookOpen size={16} /> 히스토리
          </button>
        </div>
      </div>
    </div>
  );
}
