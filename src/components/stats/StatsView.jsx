import React from 'react';
import { ChevronLeft } from 'lucide-react';
import styles from '../../styles/styles';
import StatTile from '../analysis/StatTile';
import ConfidenceBadge from '../insights/ConfidenceBadge';
import { buildApproachProximity, buildPuttingStats, buildScrambling, buildGirConversion } from '../../engine/shotStats.js';
import { estimateRoundsToSampleTarget } from '../../engine/stats.js';

function fmtSigned(n, digits = 2) {
  const v = Number(n);
  return (v > 0 ? '+' : '') + v.toFixed(digits);
}

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
      // 라운드 홀 수로 나눔 (18홀 고정 가정 대신 실제 홀 수 사용)
      girPct: r.holes.length > 0 ? (girHoles / r.holes.length) * 100 : 0,
      avgPutts: r.holes.length > 0 ? putts / r.holes.length : 0,
      fairwayPct: par4or5.length > 0 ? (fairwaysHit / par4or5.length) * 100 : 0
    };
  });

  const avgScore = (allScores.reduce((s, x) => s + x.total, 0) / allScores.length).toFixed(1);
  const bestScore = Math.min(...allScores.map(s => s.total));
  const avgGir = (allScores.reduce((s, x) => s + x.girPct, 0) / allScores.length).toFixed(0);
  const avgPuttsPerHole = allScores.reduce((s, x) => s + x.avgPutts, 0) / allScores.length;
  const avgFairway = (allScores.reduce((s, x) => s + x.fairwayPct, 0) / allScores.length).toFixed(0);

  const maxTotal = Math.max(...allScores.map(s => s.total));
  const minTotal = Math.min(...allScores.map(s => s.total));

  // ── 스코어 구성: 전체 라운드 홀 단위 집계 (OVERVIEW의 AVERAGE를 한 단계 분해) ──
  let totalHoles = 0, girHoleCount = 0, girPuttsSum = 0, threePuttCount = 0;
  let birdieOrBetterCount = 0, parCount = 0, bogeyCount = 0, doublePlusCount = 0;
  let totalPenalties = 0;
  // 파 3/4/5로 고정하면 파6·파7 홀(예: 코스 DB의 김제/정읍)이 조용히 집계에서
  // 빠지므로, 실제 등장하는 파 종류를 그대로 키로 쓴다.
  const parTypeHoles = {};
  rounds.forEach(r => {
    const p = r.players[0];
    r.holes.forEach(h => {
      const s = h.scores?.[p];
      if (!s) return;
      const diff = (s.strokes ?? h.par) - h.par;
      totalHoles++;
      if (diff <= -1) birdieOrBetterCount++;
      else if (diff === 0) parCount++;
      else if (diff === 1) bogeyCount++;
      else doublePlusCount++;
      totalPenalties += (s.ob ?? 0) + (s.hazard ?? 0);
      if ((s.putts ?? 2) >= 3) threePuttCount++;
      if (s.gir === true) { girHoleCount++; girPuttsSum += s.putts ?? 2; }
      (parTypeHoles[h.par] ??= []).push(diff);
    });
  });
  const puttsPerGir = girHoleCount > 0 ? girPuttsSum / girHoleCount : null;
  const doublePlusRatePct = totalHoles > 0 ? (doublePlusCount / totalHoles) * 100 : 0;
  const threePuttRatePct = totalHoles > 0 ? (threePuttCount / totalHoles) * 100 : 0;
  const penaltyPerRound = totalPenalties / rounds.length;

  const parTypeBreakdown = Object.keys(parTypeHoles).map(Number).sort((a, b) => a - b).map(parNum => {
    const diffs = parTypeHoles[parNum];
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    return { par: parNum, count: diffs.length, avgDiff };
  });
  const worstParNum = parTypeBreakdown.length > 0
    ? parTypeBreakdown.reduce((w, c) => (c.avgDiff > w.avgDiff ? c : w)).par
    : null;

  // ── 그린 적중 이후: GIR 성공/실패 양쪽 결과 ──────────────────────────────────
  const girConversion = buildGirConversion(rounds);
  const scrambling = buildScrambling(rounds);

  // ── 퍼팅: 거리 구간별 성공률 ─────────────────────────────────────────────────
  const puttingStats = buildPuttingStats(rounds);

  // ── 어프로치 근접도: 거리 구간별 PUTT1 중앙값 ────────────────────────────────
  const approachProximity = buildApproachProximity(rounds);
  const approachSampleTotal = approachProximity.reduce((s, b) => s + b.n, 0);
  const approachRoundsToTarget = estimateRoundsToSampleTarget(approachSampleTotal, rounds.length, 15 * approachProximity.length);

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
          <StatTile label="Putts" value={puttsPerGir != null ? puttsPerGir.toFixed(2) : '–'} sub="per GIR" />
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

      {/* ── 스코어 구성 ──────────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>SCORE COMPOSITION · 스코어 구성</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {parTypeBreakdown.map(pt => (
            <div
              key={pt.par}
              style={{
                flex: 1, textAlign: 'center', padding: '12px 6px',
                background: '#111827', borderRadius: 6,
                border: `1px solid ${pt.par === worstParNum ? '#ef5350' : '#1b2238'}`,
              }}
            >
              <div style={{ fontSize: 10, color: '#8896b0', fontWeight: 700, letterSpacing: '0.05em' }}>PAR {pt.par}</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: pt.par === worstParNum ? '#ef5350' : '#e8edf8' }}>
                {fmtSigned(pt.avgDiff)}
              </div>
              <div style={{ fontSize: 10, color: '#6b7590', marginTop: 2 }}>{pt.count}홀</div>
            </div>
          ))}
        </div>

        {totalHoles > 0 && (
          <>
            <div style={styles.riStatBarTrack}>
              {[
                ['birdie', birdieOrBetterCount, '#6b7590'],
                ['par', parCount, '#3a4560'],
                ['bogey', bogeyCount, '#8896b0'],
                ['doublePlus', doublePlusCount, '#ef5350'],
              ].filter(([, count]) => count > 0).map(([key, count, color]) => (
                <div key={key} style={{ ...styles.riStatBarSeg, width: `${(count / totalHoles) * 100}%`, background: color }} />
              ))}
            </div>
            <div style={styles.riLegendGrid}>
              {[
                ['버디 이하', birdieOrBetterCount, '#6b7590'],
                ['파', parCount, '#3a4560'],
                ['보기', bogeyCount, '#8896b0'],
                ['더블보기+', doublePlusCount, '#ef5350'],
              ].map(([label, count, color]) => (
                <div key={label} style={styles.riLegendItem}>
                  <span style={{ ...styles.riLegendDot, background: color }} />
                  {label} <span style={styles.riLegendValue}>{count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ ...styles.keyStatsGrid, marginTop: 14 }}>
          <StatTile label="더블보기+" value={`${doublePlusRatePct.toFixed(0)}%`} sub={`${doublePlusCount}/${totalHoles}`} />
          <StatTile label="페널티" value={`${penaltyPerRound.toFixed(1)}건`} sub={`${totalPenalties}/${rounds.length}R`} />
        </div>
      </div>

      {/* ── 그린 적중 이후 ───────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>AFTER GIR · 그린 적중 이후</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: '#111827', border: '1px solid #1b2238', borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#8896b0', marginBottom: 6 }}>버디 이상률</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#3db87a' }}>
              {girConversion.ratePct != null ? `${girConversion.ratePct.toFixed(0)}%` : '–'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7590', marginTop: 4 }}>
              GIR 성공 {girConversion.attempts}회 중 {girConversion.made}
            </div>
            <div style={{ marginTop: 8 }}><ConfidenceBadge tier={girConversion.tier} n={girConversion.attempts} /></div>
          </div>
          <div style={{ flex: 1, background: '#111827', border: '1px solid #1b2238', borderRadius: 6, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#8896b0', marginBottom: 6 }}>스크램블링</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e8edf8' }}>
              {scrambling.ratePct != null ? `${scrambling.ratePct.toFixed(0)}%` : '–'}
            </div>
            <div style={{ fontSize: 11, color: '#6b7590', marginTop: 4 }}>
              GIR 실패 {scrambling.attempts}회 중 {scrambling.saves}
            </div>
            <div style={{ marginTop: 8 }}><ConfidenceBadge tier={scrambling.tier} n={scrambling.attempts} /></div>
          </div>
        </div>
      </div>

      {/* ── 퍼팅 ─────────────────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>PUTTING · 퍼팅</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px 6px', background: '#111827', border: '1px solid #1b2238', borderRadius: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e8edf8' }}>{threePuttRatePct.toFixed(0)}%</div>
            <div style={{ fontSize: 11, color: '#8896b0', marginTop: 4 }}>3퍼트율 ({threePuttCount}/{totalHoles})</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '12px 6px', background: '#111827', border: '1px solid #1b2238', borderRadius: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e8edf8' }}>{avgPuttsPerHole.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: '#8896b0', marginTop: 4 }}>라운드당 퍼팅</div>
          </div>
        </div>
        {puttingStats.byDistance.filter(b => b.total > 0).map(b => (
          <div key={b.id} style={styles.riStatRow}>
            <div style={styles.riStatRowLabel}>{b.label}</div>
            <div style={styles.riStatRowBarTrack}>
              <div style={{ ...styles.riStatRowBarFill, width: `${b.ratePct ?? 0}%`, background: '#3db87a' }} />
            </div>
            <div style={styles.riStatRowValue}>{b.ratePct?.toFixed(0)}%</div>
            <ConfidenceBadge tier={b.tier} n={b.total} />
          </div>
        ))}
        {puttingStats.byDistance.every(b => b.total === 0) && (
          <div style={{ fontSize: 12, color: '#8896b0' }}>퍼팅 상세 기록이 아직 없습니다.</div>
        )}
      </div>

      {/* ── 어프로치 근접도 ──────────────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>PROXIMITY · 어프로치 근접도</div>
        {approachProximity.filter(b => b.n > 0).map(b => (
          <div key={b.id} style={styles.riStatRow}>
            <div style={styles.riStatRowLabel}>{b.label}</div>
            <div style={styles.riStatRowBarTrack}>
              <div style={{ ...styles.riStatRowBarFill, width: `${Math.min(100, ((b.median ?? 0) / 15) * 100)}%` }} />
            </div>
            <div style={styles.riStatRowValue}>{b.median?.toFixed(1)}m</div>
            <ConfidenceBadge tier={b.tier} n={b.n} />
          </div>
        ))}
        {approachProximity.every(b => b.n === 0) && (
          <div style={{ fontSize: 12, color: '#8896b0' }}>거리구간별 데이터가 아직 없습니다.</div>
        )}
        {approachRoundsToTarget != null && approachRoundsToTarget > 0 && (
          <div style={{ fontSize: 11, color: '#6b7590', marginTop: 10 }}>
            거리 구간별 신뢰도 확보까지 약 {approachRoundsToTarget}라운드
          </div>
        )}
      </div>
    </div>
  );
}
