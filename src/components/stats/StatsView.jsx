import React from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import StatTile from '../analysis/StatTile';

export default function StatsView({ rounds, onBack }) {
  if (rounds.length === 0) {
    return (
      <div style={styles.container}>
        <header style={styles.pageHeader}>
          <button style={styles.iconBack} onClick={onBack}>
            <ChevronLeft size={22} />
          </button>
          <div style={styles.pageTitle}>Stats</div>
          <div style={{ width: 40 }} />
        </header>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyTitle}>통계 데이터 부족</div>
          <div style={styles.emptySub}>라운드를 기록하면 통계가 쌓입니다</div>
        </div>
      </div>
    );
  }

  const allScores = rounds.map(r => {
    const p = r.players[0];
    const total = r.holes.reduce((s, h) => s + (h.scores[p]?.strokes || 0), 0);
    const par = r.pars.reduce((a, b) => a + b, 0);
    const girHoles = r.holes.filter(h => h.scores[p]?.gir === true).length;
    const putts = r.holes.reduce((s, h) => s + (h.scores[p]?.putts || 0), 0);
    const par4or5 = r.holes.filter(h => h.par > 3);
    const fairwaysHit = par4or5.filter(h => h.scores[p]?.fairway === true).length;
    return {
      date: r.date,
      course: r.courseName,
      total,
      diff: total - par,
      girPct: (girHoles / 18) * 100,
      avgPutts: putts / 18,
      fairwayPct: par4or5.length > 0 ? (fairwaysHit / par4or5.length) * 100 : 0
    };
  });

  const avgScore = (allScores.reduce((s, x) => s + x.total, 0) / allScores.length).toFixed(1);
  const bestScore = Math.min(...allScores.map(s => s.total));
  const avgGir = (allScores.reduce((s, x) => s + x.girPct, 0) / allScores.length).toFixed(0);
  const avgPutts = (allScores.reduce((s, x) => s + x.avgPutts, 0) / allScores.length).toFixed(1);
  const avgFairway = (allScores.reduce((s, x) => s + x.fairwayPct, 0) / allScores.length).toFixed(0);

  const maxTotal = Math.max(...allScores.map(s => s.total));
  const minTotal = Math.min(...allScores.map(s => s.total));

  return (
    <div style={styles.container}>
      <header style={styles.pageHeader}>
        <button style={styles.iconBack} onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div style={styles.pageTitle}>Career</div>
        <div style={{ width: 40 }} />
      </header>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>OVERVIEW</div>
        <div style={styles.keyStatsGrid}>
          <StatTile label="Rounds" value={rounds.length} sub="played" />
          <StatTile label="Best" value={bestScore} sub="lowest score" />
          <StatTile label="Average" value={avgScore} sub="per round" />
          <StatTile label="GIR" value={`${avgGir}%`} sub="average" />
          <StatTile label="Putts" value={avgPutts} sub="per hole" />
          <StatTile label="FW" value={`${avgFairway}%`} sub="hit rate" />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE TREND</div>
        <div style={styles.trendChart}>
          {allScores.slice().reverse().map((s, i) => {
            const range = maxTotal - minTotal || 1;
            const height = ((s.total - minTotal) / range) * 60 + 20;
            return (
              <div key={i} style={styles.trendCol}>
                <div style={styles.trendValue}>{s.total}</div>
                <div style={{ ...styles.trendBar, height: `${height}%` }} />
                <div style={styles.trendDate}>
                  {new Date(s.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
